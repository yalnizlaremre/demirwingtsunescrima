"""
Local-dev-only seed: wires up the real photos dropped into ../picture/ to
School/User/SiteContent records so `frontend-public` shows real content
when tested locally. Does NOT touch production - production content must
still be entered by the user through the admin panel (Site Icerigi / Okullar /
Kullanicilar), since prod has its own separate database and uploads volume.

Only wires up structural fields we can infer from filenames (names, photos,
titles). Does not fabricate bios/addresses/descriptions - those are left
blank for the user to fill in via the admin panel.

Run: python seed_public_content.py
"""
import asyncio
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.school import School
from app.models.user import User, UserRole, UserStatus, InstructorTitle
from app.models.site_content import SiteContent
from app.auth import get_password_hash

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "picture"
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"

# source filename -> clean destination filename
PHOTO_MAP = {
    "demirwteo-logo.jpeg": "demirwteo-logo.jpeg",
    "Kozyatagı-1.jpeg": "kozyatagi-1.jpeg",
    "Sifu Emre Yalnızlar.jpeg": "sifu-emre-yalnizlar.jpeg",
    "Sifu Saffet Demir.jpeg": "sifu-saffet-demir.jpeg",
    "Tekirdag-1.jpeg": "tekirdag-1.jpeg",
}


def copy_photos() -> dict[str, str]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    url_by_source = {}
    for source_name, dest_name in PHOTO_MAP.items():
        src = SOURCE_DIR / source_name
        if not src.exists():
            print(f"UYARI: bulunamadi, atlaniyor: {src}")
            continue
        dst = UPLOAD_DIR / dest_name
        shutil.copyfile(src, dst)
        url_by_source[source_name] = f"/uploads/{dest_name}"
    return url_by_source


async def seed():
    urls = copy_photos()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Schools
        for name, photo_key in [("Kozyatağı", "Kozyatagı-1.jpeg"), ("Tekirdağ", "Tekirdag-1.jpeg")]:
            result = await db.execute(select(School).where(School.name == name))
            school = result.scalar_one_or_none()
            if school:
                print(f"Okul zaten var, atlaniyor: {name}")
                continue
            school = School(name=name, cover_image_url=urls.get(photo_key))
            db.add(school)
            print(f"Okul olusturuldu: {name}")

        # Instructors
        instructors = [
            {
                "email": "emreyalnizlar@gmail.com",
                "first_name": "Emre",
                "last_name": "Yalnızlar",
                "role": UserRole.SUPER_ADMIN.value,
                "photo_key": "Sifu Emre Yalnızlar.jpeg",
            },
            {
                "email": "saffet.demir@wteo.local",
                "first_name": "Saffet",
                "last_name": "Demir",
                "role": UserRole.MANAGER.value,
                "photo_key": "Sifu Saffet Demir.jpeg",
            },
        ]
        for data in instructors:
            result = await db.execute(select(User).where(User.email == data["email"]))
            user = result.scalar_one_or_none()
            if user:
                user.avatar_url = urls.get(data["photo_key"], user.avatar_url)
                user.instructor_title = InstructorTitle.SIFU.value
                user.is_featured_instructor = True
                print(f"Kullanici guncellendi: {data['email']}")
            else:
                user = User(
                    email=data["email"],
                    password_hash=get_password_hash("changeme123"),
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    role=data["role"],
                    status=UserStatus.ACTIVE.value,
                    instructor_title=InstructorTitle.SIFU.value,
                    is_featured_instructor=True,
                    avatar_url=urls.get(data["photo_key"]),
                )
                db.add(user)
                print(f"Kullanici olusturuldu: {data['email']} (sifre: changeme123)")

        # DemirWteo site content
        result = await db.execute(select(SiteContent).where(SiteContent.slug == "demirwteo"))
        content = result.scalar_one_or_none()
        if content:
            print("SiteContent zaten var, atlaniyor: demirwteo")
        else:
            content = SiteContent(
                slug="demirwteo",
                title="DemirWteo",
                image_url=urls.get("demirwteo-logo.jpeg"),
            )
            db.add(content)
            print("SiteContent olusturuldu: demirwteo")

        await db.commit()

    print("\nTamamlandi. Metin/aciklama alanlari (bio, description, body) bos birakildi -")
    print("bunlari admin panelden (Site Icerigi / Okullar / Kullanicilar) doldurman gerekiyor.")


if __name__ == "__main__":
    asyncio.run(seed())
