import uuid
import os
import shutil
import subprocess
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.config import settings
from app.models.user import User, UserRole
from app.models.media import Media, MediaType
from app.models.school import SchoolManager
from app.models.student import Student
from app.permissions import Permission, user_has_permission

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/mpeg", "video/quicktime", "video/webm"}


def _transcode_video_to_mp4(src_path: str) -> str | None:
    """Telefonlardan (özellikle iPhone .mov/HEVC) yüklenen videoları tarayıcıda
    her zaman oynayan bir formata (H.264/AAC mp4) çevirir. ffmpeg sunucuda
    kurulu değilse (örn. yerel geliştirme ortamı) sessizce None döner, dosya
    olduğu gibi (dönüştürülmeden) saklanmaya devam eder."""
    if shutil.which("ffmpeg") is None:
        return None

    dst_path = f"{os.path.splitext(src_path)[0]}_{uuid.uuid4().hex[:8]}.mp4"
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", src_path,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                dst_path,
            ],
            check=True,
            capture_output=True,
            timeout=600,
        )
        return dst_path
    except Exception:
        if os.path.exists(dst_path):
            os.remove(dst_path)
        return None


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    title: str | None = None,
    school_id: str | None = None,
    is_public: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check permission
    if current_user.role in (UserRole.USER.value, UserRole.MEMBER.value):
        raise HTTPException(status_code=403, detail="Dosya yükleme yetkiniz yok")
    if current_user.role == UserRole.MANAGER.value:
        allowed = current_user.can_upload_media or (
            bool(school_id) and user_has_permission(current_user, Permission.MANAGE_SCHOOLS)
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="Dosya yükleme yetkiniz yok")

    # Determine media type
    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = MediaType.IMAGE.value
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = MediaType.VIDEO.value
    else:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya türü")

    # Read file content
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Dosya boyutu çok büyük (max 100MB)")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    file_size = len(content)

    # Videoyu tarayicida her zaman oynayan bir formata (H.264/AAC mp4) cevir.
    # Telefondan gelen .mov/HEVC gibi dosyalar Chrome'da hic acilmiyordu.
    if media_type == MediaType.VIDEO.value:
        transcoded_path = _transcode_video_to_mp4(file_path)
        if transcoded_path:
            os.remove(file_path)
            unique_name = os.path.basename(transcoded_path)
            file_path = transcoded_path
            content_type = "video/mp4"
            file_size = os.path.getsize(file_path)

    # Create record
    media = Media(
        media_type=media_type,
        title=title,
        filename=unique_name,
        original_filename=file.filename or "unknown",
        file_url=f"/uploads/{unique_name}",
        file_size=file_size,
        mime_type=content_type,
        uploaded_by=current_user.id,
        school_id=school_id,
        is_public=is_public,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return {
        "id": str(media.id),
        "file_url": media.file_url,
        "filename": media.original_filename,
        "media_type": media.media_type,
        "file_size": media.file_size,
        "is_public": media.is_public,
    }


class YouTubeImportRequest(BaseModel):
    youtube_url: str
    title: str | None = None
    school_id: str | None = None
    is_public: bool = False


@router.post("/youtube")
async def import_youtube(
    data: YouTubeImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """YouTube video linki ekle (dosya yuklemeden)."""
    if current_user.role in (UserRole.USER.value, UserRole.MEMBER.value):
        raise HTTPException(status_code=403, detail="YouTube import yetkiniz yok")
    if current_user.role == UserRole.MANAGER.value:
        allowed = current_user.can_upload_media or (
            bool(data.school_id) and user_has_permission(current_user, Permission.MANAGE_SCHOOLS)
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="Medya yukleme yetkiniz yok")

    if not data.youtube_url or "youtu" not in data.youtube_url:
        raise HTTPException(status_code=400, detail="Gecerli bir YouTube linki girin")

    media = Media(
        media_type="YOUTUBE",
        title=data.title or "YouTube Video",
        filename="youtube",
        original_filename=data.title or "YouTube Video",
        file_url=data.youtube_url,
        youtube_url=data.youtube_url,
        file_size=0,
        mime_type="video/youtube",
        uploaded_by=current_user.id,
        school_id=data.school_id,
        is_public=data.is_public,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    return {
        "id": str(media.id),
        "file_url": media.file_url,
        "youtube_url": media.youtube_url,
        "title": media.title,
        "media_type": media.media_type,
        "file_size": 0,
        "is_public": media.is_public,
    }


@router.get("/")
async def list_media(
    school_id: str | None = Query(None),
    media_type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Media).order_by(Media.created_at.desc())

    # ADMIN/SUPER_ADMIN her seyi gorur. Digerleri yalnizca genel (okula
    # baglanmamis), herkese acik (is_public) veya kendi okuluna ait medyayi
    # gorur - onceden hicbir kisitlama yoktu, henuz onaylanmamis bir MEMBER
    # bile tum okullarin ozel medyasini listeleyebiliyordu.
    if current_user.role not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        own_school_ids: list[str] = []
        if current_user.role == UserRole.MANAGER.value:
            manager_schools = await db.execute(
                select(SchoolManager.school_id).where(SchoolManager.user_id == current_user.id)
            )
            own_school_ids = [row[0] for row in manager_schools.all()]
        elif current_user.role == UserRole.USER.value:
            student_result = await db.execute(
                select(Student).where(Student.user_id == current_user.id)
            )
            student = student_result.scalar_one_or_none()
            if student:
                own_school_ids = [student.school_id]

        visibility = (Media.is_public == True) | (Media.school_id.is_(None))
        if own_school_ids:
            visibility = visibility | (Media.school_id.in_(own_school_ids))
        query = query.where(visibility)

    if school_id:
        query = query.where(Media.school_id == school_id)
    if media_type:
        query = query.where(Media.media_type == media_type)
    result = await db.execute(query)
    media_list = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "media_type": m.media_type,
            "title": m.title,
            "filename": m.original_filename,
            "file_url": m.file_url,
            "youtube_url": m.youtube_url,
            "file_size": m.file_size,
            "school_id": m.school_id,
            "is_public": m.is_public,
            "created_at": m.created_at.isoformat(),
        }
        for m in media_list
    ]


def _can_manage_media(current_user: User, media: Media) -> bool:
    if current_user.role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
        return True
    if current_user.role == UserRole.MANAGER.value:
        if current_user.can_upload_media:
            return True
        if media.school_id and user_has_permission(current_user, Permission.MANAGE_SCHOOLS):
            return True
    return False


class MediaUpdateRequest(BaseModel):
    is_public: bool


@router.patch("/{media_id}")
async def update_media(
    media_id: str,
    data: MediaUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Medya bulunamadı")

    if not _can_manage_media(current_user, media):
        raise HTTPException(status_code=403, detail="Bu medyayı düzenleme yetkiniz yok")

    media.is_public = data.is_public
    await db.commit()
    return {"id": str(media.id), "is_public": media.is_public}


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Medya bulunamadı")

    if not _can_manage_media(current_user, media):
        raise HTTPException(status_code=403, detail="Silme yetkiniz yok")

    # Delete file
    file_path = os.path.join(settings.UPLOAD_DIR, media.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(media)
    await db.commit()
    return {"message": "Medya silindi"}
