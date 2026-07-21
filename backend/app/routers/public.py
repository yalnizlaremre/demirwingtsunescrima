from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.database import get_db
from app.models.school import School
from app.models.user import User
from app.models.site_content import SiteContent
from app.schemas.school import SchoolResponse
from app.schemas.public import PublicInstructorResponse, PublicInstructorListResponse
from app.schemas.site_content import SiteContentResponse, SiteContentListResponse
from app.services.school_gallery import get_school_gallery_map

router = APIRouter()


def _to_public_school_response(school: School, media=None) -> SchoolResponse:
    return SchoolResponse(
        id=str(school.id),
        name=school.name,
        address=school.address,
        description=school.description,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        created_at=school.created_at,
        cover_image_url=school.cover_image_url,
        long_description=school.long_description,
        youtube_url=school.youtube_url,
        media=media or [],
    )


@router.get("/schools", response_model=list[SchoolResponse])
async def public_list_schools(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(School).where(School.is_active == True).order_by(School.created_at.desc())
    )
    schools = result.scalars().all()
    gallery_map = await get_school_gallery_map(db, [s.id for s in schools])
    return [_to_public_school_response(s, gallery_map.get(s.id)) for s in schools]


@router.get("/schools/{school_id}", response_model=SchoolResponse)
async def public_get_school(school_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(School).where(School.id == school_id, School.is_active == True)
    )
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="Okul bulunamadı")
    gallery_map = await get_school_gallery_map(db, [school.id])
    return _to_public_school_response(school, gallery_map.get(school.id))


@router.get("/instructors", response_model=PublicInstructorListResponse)
async def public_list_instructors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.is_featured_instructor == True)
        .order_by(User.display_order.asc(), User.created_at.asc())
    )
    instructors = result.scalars().all()
    return PublicInstructorListResponse(
        items=[PublicInstructorResponse.model_validate(u) for u in instructors]
    )


@router.get("/content", response_model=SiteContentListResponse)
async def public_list_content(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SiteContent))
    items = result.scalars().all()
    return SiteContentListResponse(items=[SiteContentResponse.model_validate(c) for c in items])


@router.get("/content/{slug}", response_model=SiteContentListResponse)
async def public_get_content(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SiteContent).where(SiteContent.slug == slug).order_by(SiteContent.created_at.asc())
    )
    items = result.scalars().all()
    return SiteContentListResponse(items=[SiteContentResponse.model_validate(c) for c in items])
