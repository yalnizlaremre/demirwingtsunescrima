from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Media, MediaType
from app.schemas.school import SchoolMediaItem


async def get_school_gallery_map(db: AsyncSession, school_ids: list[str]) -> dict[str, list[SchoolMediaItem]]:
    if not school_ids:
        return {}
    result = await db.execute(
        select(Media)
        .where(Media.school_id.in_(school_ids), Media.media_type == MediaType.IMAGE.value)
        .order_by(Media.created_at.desc())
    )
    gallery_map: dict[str, list[SchoolMediaItem]] = {}
    for m in result.scalars().all():
        gallery_map.setdefault(m.school_id, []).append(
            SchoolMediaItem(id=str(m.id), file_url=m.file_url, title=m.title, file_size=m.file_size)
        )
    return gallery_map
