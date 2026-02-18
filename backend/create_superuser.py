"""
Create a super admin user.
Run: python create_superuser.py
"""
import asyncio
from app.database import engine, AsyncSessionLocal
from app.models.base import Base
from app.models.user import User, UserRole, UserStatus
from app.auth import get_password_hash
from sqlalchemy import select


async def create_superuser():
    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        email = input("E-posta: ").strip()
        password = input("Sifre: ").strip()
        first_name = input("Ad: ").strip()
        last_name = input("Soyad: ").strip()

        # Check if already exists
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"HATA: {email} zaten kayitli!")
            return

        user = User(
            email=email,
            password_hash=get_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            role=UserRole.SUPER_ADMIN.value,
            status=UserStatus.ACTIVE.value,
        )
        db.add(user)
        await db.commit()
        print(f"Super Admin olusturuldu: {email}")


if __name__ == "__main__":
    asyncio.run(create_superuser())
