from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import require_admin_or_above
from app.models.user import User
from app.models.site_content import SiteContent
from app.schemas.site_content import (
    SiteContentCreate,
    SiteContentUpdate,
    SiteContentResponse,
    SiteContentListResponse,
)

router = APIRouter()


@router.get("/", response_model=SiteContentListResponse)
async def list_site_content(
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteContent).order_by(SiteContent.slug))
    items = result.scalars().all()
    return SiteContentListResponse(items=[SiteContentResponse.model_validate(c) for c in items])


@router.post("/", response_model=SiteContentResponse)
async def create_site_content(
    data: SiteContentCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    content = SiteContent(**data.model_dump())
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return SiteContentResponse.model_validate(content)


@router.put("/{content_id}", response_model=SiteContentResponse)
async def update_site_content(
    content_id: str,
    data: SiteContentUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteContent).where(SiteContent.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(content, field, value)

    await db.commit()
    await db.refresh(content)
    return SiteContentResponse.model_validate(content)


@router.delete("/{content_id}")
async def delete_site_content(
    content_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteContent).where(SiteContent.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="İçerik bulunamadı")

    await db.delete(content)
    await db.commit()
    return {"message": "İçerik silindi"}
