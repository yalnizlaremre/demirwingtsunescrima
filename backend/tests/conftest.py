import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db
from app.rate_limit import limiter
from app.models.base import Base
from app.models.user import User, UserRole, UserStatus
from app.models.school import School, SchoolManager
from app.models.student import Student, StudentProgress, Branch
from app.models.lesson import Lesson, LessonType
from app.auth import get_password_hash, create_access_token


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()
    yield


@pytest.fixture
async def db_session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with session_factory() as session:
        yield session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def client(db_session):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def auth_headers(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


async def make_user(
    db_session,
    role=UserRole.MEMBER.value,
    status=UserStatus.ACTIVE.value,
    email=None,
    password="password123",
) -> User:
    if email is None:
        email = f"user-{uuid.uuid4()}@test.com"
    user = User(
        email=email,
        password_hash=get_password_hash(password),
        first_name="Test",
        last_name="User",
        role=role,
        status=status,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def make_school(db_session, name="Test School") -> School:
    school = School(name=name)
    db_session.add(school)
    await db_session.commit()
    await db_session.refresh(school)
    return school


async def make_school_manager(db_session, school: School, user: User) -> SchoolManager:
    sm = SchoolManager(school_id=school.id, user_id=user.id)
    db_session.add(sm)
    await db_session.commit()
    return sm


async def make_student(
    db_session,
    school: School,
    user: User | None = None,
    grades: dict | None = None,
) -> Student:
    """grades: {"WING_TSUN": (grade, completed_hours), "ESCRIMA": (grade, completed_hours)}"""
    if user is None:
        user = await make_user(db_session, role=UserRole.USER.value)
    student = Student(user_id=user.id, school_id=school.id)
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)

    if grades:
        for branch, (grade, hours) in grades.items():
            progress = StudentProgress(
                student_id=student.id,
                branch=branch,
                current_grade=grade,
                completed_hours=hours,
                remaining_hours=0,
            )
            db_session.add(progress)
        await db_session.commit()

    return student


async def make_lesson(
    db_session,
    school: School,
    creator: User,
    branch=Branch.WING_TSUN.value,
    duration_hours=2.0,
) -> Lesson:
    from datetime import datetime, timezone

    lesson = Lesson(
        school_id=school.id,
        branch=branch,
        lesson_type=LessonType.GROUP.value,
        lesson_date=datetime.now(timezone.utc),
        duration_hours=duration_hours,
        created_by=creator.id,
    )
    db_session.add(lesson)
    await db_session.commit()
    await db_session.refresh(lesson)
    return lesson
