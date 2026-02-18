from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.models.base import Base


async def _migrate_sqlite(conn):
    """Add missing columns to existing tables (dev migration for SQLite)."""

    async def _add_columns(table_name, columns_map):
        result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
        existing = {row[1] for row in result.fetchall()}
        for col, sql in columns_map.items():
            if col not in existing:
                await conn.execute(text(sql))

    # event_registrations: exam columns
    await _add_columns("event_registrations", {
        "will_take_exam": "ALTER TABLE event_registrations ADD COLUMN will_take_exam BOOLEAN DEFAULT 0",
        "exam_branch_wt": "ALTER TABLE event_registrations ADD COLUMN exam_branch_wt BOOLEAN DEFAULT 0",
        "exam_branch_escrima": "ALTER TABLE event_registrations ADD COLUMN exam_branch_escrima BOOLEAN DEFAULT 0",
        "needs_manager_approval": "ALTER TABLE event_registrations ADD COLUMN needs_manager_approval BOOLEAN DEFAULT 0",
        "manager_approved": "ALTER TABLE event_registrations ADD COLUMN manager_approved BOOLEAN DEFAULT 0",
    })

    # users: avatar
    await _add_columns("users", {
        "avatar_url": "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1000)",
    })

    # media: youtube, title, school_id
    await _add_columns("media", {
        "youtube_url": "ALTER TABLE media ADD COLUMN youtube_url VARCHAR(1000)",
        "title": "ALTER TABLE media ADD COLUMN title VARCHAR(500)",
        "school_id": "ALTER TABLE media ADD COLUMN school_id VARCHAR(36) REFERENCES schools(id)",
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    # Create tables (dev only - use alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate existing tables with missing columns
        if settings.DATABASE_URL.startswith("sqlite"):
            await _migrate_sqlite(conn)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
from app.routers import (
    auth,
    users,
    schools,
    students,
    grades,
    lessons,
    attendance,
    events,
    products,
    requests,
    mail,
    media,
    dashboard,
)
from app.routers import enrollments

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(schools.router, prefix="/api/schools", tags=["Schools"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(grades.router, prefix="/api/grades", tags=["Grades"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["Lessons"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(mail.router, prefix="/api/mail", tags=["Mail"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(enrollments.router, prefix="/api/enrollments", tags=["Enrollments"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
