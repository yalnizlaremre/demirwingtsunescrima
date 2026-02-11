"""
Seed script - Creates initial SUPER_ADMIN user.
Run: python seed.py
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.user import User, UserRole, UserStatus
from app.auth import get_password_hash


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN.value)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Super Admin zaten mevcut: {existing.email}")
            return

        admin = User(
            email="admin@wteo.com",
            password_hash=get_password_hash("admin123"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.SUPER_ADMIN.value,
            status=UserStatus.ACTIVE.value,
        )
        db.add(admin)
        await db.commit()
        print("Super Admin olusturuldu!")
        print("  Email: admin@wteo.com")
        print("  Sifre: admin123")


if __name__ == "__main__":
    asyncio.run(seed())
