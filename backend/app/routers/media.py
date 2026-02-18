import uuid
import os
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

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/mpeg", "video/quicktime", "video/webm"}


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    title: str | None = None,
    school_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check permission
    if current_user.role == UserRole.USER.value:
        raise HTTPException(status_code=403, detail="Dosya yükleme yetkiniz yok")
    if current_user.role == UserRole.MANAGER.value and not current_user.can_upload_media:
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
        raise HTTPException(status_code=400, detail="Dosya boyutu çok büyük (max 10MB)")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create record
    media = Media(
        media_type=media_type,
        title=title,
        filename=unique_name,
        original_filename=file.filename or "unknown",
        file_url=f"/uploads/{unique_name}",
        file_size=len(content),
        mime_type=content_type,
        uploaded_by=current_user.id,
        school_id=school_id,
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
    }


class YouTubeImportRequest(BaseModel):
    youtube_url: str
    title: str | None = None
    school_id: str | None = None


@router.post("/youtube")
async def import_youtube(
    data: YouTubeImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """YouTube video linki ekle (dosya yuklemeden)."""
    if current_user.role == UserRole.USER.value:
        raise HTTPException(status_code=403, detail="YouTube import yetkiniz yok")
    if current_user.role == UserRole.MANAGER.value and not current_user.can_upload_media:
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
    }


@router.get("/")
async def list_media(
    school_id: str | None = Query(None),
    media_type: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Media).order_by(Media.created_at.desc())
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
            "created_at": m.created_at.isoformat(),
        }
        for m in media_list
    ]


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Silme yetkiniz yok")

    result = await db.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Medya bulunamadı")

    # Delete file
    file_path = os.path.join(settings.UPLOAD_DIR, media.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(media)
    await db.commit()
    return {"message": "Medya silindi"}
