import os
import pytest

from app.config import settings
from app.models.user import UserRole

from tests.conftest import make_user, auth_headers

pytestmark = pytest.mark.asyncio

# 1x1 transparent PNG
TINY_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
    "53de0000000c4944415408d763f8ffff3f0005fe02fea1399ff90000000049454e44ae426082"
)


class TestMediaUploadPermissions:
    async def test_member_cannot_upload_file(self, client, db_session):
        member = await make_user(db_session, role=UserRole.MEMBER.value)
        resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(member),
        )
        assert resp.status_code == 403

    async def test_member_cannot_import_youtube(self, client, db_session):
        member = await make_user(db_session, role=UserRole.MEMBER.value)
        resp = await client.post(
            "/api/media/youtube",
            json={"youtube_url": "https://youtu.be/dQw4w9WgXcQ"},
            headers=auth_headers(member),
        )
        assert resp.status_code == 403

    async def test_member_cannot_upload_avatar(self, client, db_session):
        member = await make_user(db_session, role=UserRole.MEMBER.value)
        resp = await client.post(
            "/api/students/my-profile/avatar",
            files={"file": ("avatar.png", TINY_PNG, "image/png")},
            headers=auth_headers(member),
        )
        assert resp.status_code == 403

    async def test_user_cannot_upload_file(self, client, db_session):
        user = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403

    async def test_user_can_upload_avatar(self, client, db_session):
        user = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.post(
            "/api/students/my-profile/avatar",
            files={"file": ("avatar.png", TINY_PNG, "image/png")},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        avatar_url = resp.json()["avatar_url"]
        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(avatar_url))
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_manager_without_flag_cannot_upload_file(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_admin_can_upload_file(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        file_url = resp.json()["file_url"]
        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(file_url))
        if os.path.exists(file_path):
            os.remove(file_path)
