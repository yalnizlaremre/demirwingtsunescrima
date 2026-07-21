from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manage_users, require_manager_or_above, get_password_hash
from app.models.user import User, UserRole, UserStatus, InstructorTitle
from app.models.student import Student
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

router = APIRouter()


def _user_to_response(user: User, student: Student | None = None) -> UserResponse:
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
        avatar_url=user.avatar_url,
        bio=user.bio,
        display_order=user.display_order,
        is_featured_instructor=user.is_featured_instructor,
        instagram_url=user.instagram_url,
        extra_permissions=user.extra_permissions or [],
        student_id=str(student.id) if student else None,
        school_id=str(student.school_id) if student else None,
        school_name=student.school.name if student and student.school else None,
        created_at=user.created_at,
    )


async def _load_students_by_user_id(db: AsyncSession, user_ids: list[str]) -> dict[str, Student]:
    if not user_ids:
        return {}
    result = await db.execute(
        select(Student).options(selectinload(Student.school)).where(Student.user_id.in_(user_ids))
    )
    return {str(s.user_id): s for s in result.scalars().all()}


@router.get("/", response_model=UserListResponse)
async def list_users(
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manage_users),
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
    students_by_user = await _load_students_by_user_id(db, [u.id for u in users])

    return UserListResponse(
        items=[_user_to_response(u, students_by_user.get(str(u.id))) for u in users],
        total=total,
    )


@router.get("/pending", response_model=UserListResponse)
async def list_pending_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    """Tanitim sitesinden 'Kayit Ol' ile gelen, henuz onaylanmamis kullanicilar."""
    query = select(User).where(User.status == UserStatus.PENDING.value)
    count_query = select(func.count(User.id)).where(User.status == UserStatus.PENDING.value)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    return UserListResponse(
        items=[_user_to_response(u) for u in users],
        total=total,
    )


@router.post("/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: str,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.status != UserStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Kullanıcı onay bekleyen durumda değil")

    user.status = UserStatus.ACTIVE.value
    await db.commit()
    await db.refresh(user)

    return _user_to_response(user)


@router.post("/", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_manage_users),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    if current_user.role == UserRole.MANAGER.value and data.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(status_code=403, detail="Bu rolde kullanici olusturamazsiniz")

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

    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_manage_users),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    students_by_user = await _load_students_by_user_id(db, [user.id])
    return _user_to_response(user, students_by_user.get(str(user.id)))


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: User = Depends(require_manage_users),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    caller_is_real_admin = current_user.role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value)
    if not caller_is_real_admin:
        if user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
            raise HTTPException(status_code=403, detail="Bu kullaniciyi duzenleyemezsiniz")
        if data.role is not None and data.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
            raise HTTPException(status_code=403, detail="Bu role yukseltme yapamazsiniz")
        if data.extra_permissions is not None:
            raise HTTPException(status_code=403, detail="Izinleri degistirme yetkiniz yok")

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
    if data.bio is not None:
        user.bio = data.bio
    if data.display_order is not None:
        user.display_order = data.display_order
    if data.is_featured_instructor is not None:
        user.is_featured_instructor = data.is_featured_instructor
    if data.instagram_url is not None:
        user.instagram_url = data.instagram_url
    if data.extra_permissions is not None:
        user.extra_permissions = data.extra_permissions

    await db.commit()
    await db.refresh(user)

    return _user_to_response(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_manage_users),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if current_user.role == UserRole.MANAGER.value and user.role in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(status_code=403, detail="Bu kullaniciyi silemezsiniz")

    await db.delete(user)
    await db.commit()
    return {"message": "Kullanıcı silindi"}
