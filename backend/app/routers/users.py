from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin_or_above, get_password_hash
from app.models.user import User, UserRole, UserStatus, InstructorTitle
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

router = APIRouter()


@router.get("/", response_model=UserListResponse)
async def list_users(
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_query = select(func.count(User.id))

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
        count_query = count_query.where(User.status == status)
    if search:
        search_filter = User.first_name.ilike(f"%{search}%") | User.last_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    return UserListResponse(
        items=[
            UserResponse(
                id=str(u.id),
                email=u.email,
                first_name=u.first_name,
                last_name=u.last_name,
                phone=u.phone,
                role=u.role,
                status=u.status,
                instructor_title=u.instructor_title,
                can_upload_media=u.can_upload_media,
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
    )


@router.post("/", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=data.role,
        status=UserStatus.ACTIVE.value,
        instructor_title=data.instructor_title,
        can_upload_media=data.can_upload_media,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role,
        status=user.status,
        instructor_title=user.instructor_title,
        can_upload_media=user.can_upload_media,
        created_at=user.created_at,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role,
        status=user.status,
        instructor_title=user.instructor_title,
        can_upload_media=user.can_upload_media,
        created_at=user.created_at,
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.phone is not None:
        user.phone = data.phone
    if data.role is not None:
        user.role = data.role
    if data.status is not None:
        user.status = data.status
    if data.instructor_title is not None:
        user.instructor_title = data.instructor_title
    if data.can_upload_media is not None:
        user.can_upload_media = data.can_upload_media

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        role=user.role,
        status=user.status,
        instructor_title=user.instructor_title,
        can_upload_media=user.can_upload_media,
        created_at=user.created_at,
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    await db.delete(user)
    await db.commit()
    return {"message": "Kullanıcı silindi"}
