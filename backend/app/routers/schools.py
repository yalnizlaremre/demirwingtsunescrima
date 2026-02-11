from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin_or_above, require_manager_or_above
from app.models.user import User, UserRole
from app.models.school import School, SchoolManager
from app.schemas.school import (
    SchoolCreate,
    SchoolUpdate,
    SchoolResponse,
    SchoolListResponse,
    AssignManagerRequest,
)

router = APIRouter()


@router.get("/", response_model=SchoolListResponse)
async def list_schools(
    search: str | None = None,
    is_active: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(School)
    count_query = select(func.count(School.id))

    # MANAGER only sees their own school
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(School.id.in_(school_ids_q))
        count_query = count_query.where(School.id.in_(school_ids_q))

    if is_active is not None:
        query = query.where(School.is_active == is_active)
        count_query = count_query.where(School.is_active == is_active)
    if search:
        query = query.where(School.name.ilike(f"%{search}%"))
        count_query = count_query.where(School.name.ilike(f"%{search}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(School.created_at.desc()).offset(skip).limit(limit)
    )
    schools = result.scalars().all()

    return SchoolListResponse(
        items=[
            SchoolResponse(
                id=str(s.id),
                name=s.name,
                address=s.address,
                description=s.description,
                phone=s.phone,
                email=s.email,
                is_active=s.is_active,
                created_at=s.created_at,
            )
            for s in schools
        ],
        total=total,
    )


@router.post("/", response_model=SchoolResponse)
async def create_school(
    data: SchoolCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    school = School(
        name=data.name,
        address=data.address,
        description=data.description,
        phone=data.phone,
        email=data.email,
    )
    db.add(school)
    await db.commit()
    await db.refresh(school)

    return SchoolResponse(
        id=str(school.id),
        name=school.name,
        address=school.address,
        description=school.description,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        created_at=school.created_at,
    )


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="Okul bulunamadı")

    return SchoolResponse(
        id=str(school.id),
        name=school.name,
        address=school.address,
        description=school.description,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        created_at=school.created_at,
    )


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: str,
    data: SchoolUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="Okul bulunamadı")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(school, field, value)

    await db.commit()
    await db.refresh(school)

    return SchoolResponse(
        id=str(school.id),
        name=school.name,
        address=school.address,
        description=school.description,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        created_at=school.created_at,
    )


@router.delete("/{school_id}")
async def delete_school(
    school_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="Okul bulunamadı")

    await db.delete(school)
    await db.commit()
    return {"message": "Okul silindi"}


@router.post("/{school_id}/managers")
async def assign_manager(
    school_id: str,
    data: AssignManagerRequest,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    # Check school exists
    school_result = await db.execute(select(School).where(School.id == school_id))
    if not school_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Okul bulunamadı")

    # Check user exists and is MANAGER role
    user_result = await db.execute(select(User).where(User.id == data.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.role != UserRole.MANAGER.value:
        raise HTTPException(status_code=400, detail="Kullanıcı MANAGER rolünde değil")

    # Check if already assigned
    existing = await db.execute(
        select(SchoolManager).where(
            SchoolManager.school_id == school_id,
            SchoolManager.user_id == data.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu eğitmen zaten bu okula atanmış")

    sm = SchoolManager(school_id=school_id, user_id=data.user_id)
    db.add(sm)
    await db.commit()
    return {"message": "Eğitmen okula atandı"}


@router.delete("/{school_id}/managers/{user_id}")
async def remove_manager(
    school_id: str,
    user_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SchoolManager).where(
            SchoolManager.school_id == school_id,
            SchoolManager.user_id == user_id,
        )
    )
    sm = result.scalar_one_or_none()
    if not sm:
        raise HTTPException(status_code=404, detail="Atama bulunamadı")

    await db.delete(sm)
    await db.commit()
    return {"message": "Eğitmen okuldan çıkarıldı"}
