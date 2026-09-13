import os
import pytest
from unittest.mock import patch

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
        assert resp.json()["is_public"] is False
        file_url = resp.json()["file_url"]
        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(file_url))
        if os.path.exists(file_path):
            os.remove(file_path)


class TestMediaIsPublic:
    async def test_upload_with_is_public_flag(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/media/upload?is_public=true",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["is_public"] is True
        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(resp.json()["file_url"]))
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_public_media_list_only_returns_public_items(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        public_resp = await client.post(
            "/api/media/upload?is_public=true",
            files={"file": ("public.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )
        private_resp = await client.post(
            "/api/media/upload",
            files={"file": ("private.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )

        resp = await client.get("/api/public/media")
        assert resp.status_code == 200
        ids = [m["id"] for m in resp.json()]
        assert public_resp.json()["id"] in ids
        assert private_resp.json()["id"] not in ids

        for r in (public_resp, private_resp):
            file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(r.json()["file_url"]))
            if os.path.exists(file_path):
                os.remove(file_path)

    async def test_manager_without_upload_rights_cannot_toggle_public(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        upload_resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )
        media_id = upload_resp.json()["id"]

        resp = await client.patch(
            f"/api/media/{media_id}",
            json={"is_public": True},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(upload_resp.json()["file_url"]))
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_admin_can_toggle_public(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        upload_resp = await client.post(
            "/api/media/upload",
            files={"file": ("test.png", TINY_PNG, "image/png")},
            headers=auth_headers(admin),
        )
        media_id = upload_resp.json()["id"]

        resp = await client.patch(
            f"/api/media/{media_id}",
            json={"is_public": True},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["is_public"] is True

        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(upload_resp.json()["file_url"]))
        if os.path.exists(file_path):
            os.remove(file_path)


class TestVideoTranscode:
    async def test_video_without_ffmpeg_keeps_original_format(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        with patch("app.routers.media.shutil.which", return_value=None):
            resp = await client.post(
                "/api/media/upload",
                files={"file": ("clip.mov", b"fake-quicktime-bytes", "video/quicktime")},
                headers=auth_headers(admin),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["media_type"] == "VIDEO"
        assert data["file_url"].endswith(".mov")

        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(data["file_url"]))
        if os.path.exists(file_path):
            os.remove(file_path)

    async def test_video_is_transcoded_to_mp4_when_ffmpeg_available(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        def fake_ffmpeg_run(cmd, **kwargs):
            dst_path = cmd[-1]
            with open(dst_path, "wb") as f:
                f.write(b"fake-mp4-bytes")

        with patch("app.routers.media.shutil.which", return_value="/usr/bin/ffmpeg"), \
             patch("app.routers.media.subprocess.run", side_effect=fake_ffmpeg_run):
            resp = await client.post(
                "/api/media/upload",
                files={"file": ("clip.mov", b"fake-quicktime-bytes", "video/quicktime")},
                headers=auth_headers(admin),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["media_type"] == "VIDEO"
        assert data["file_url"].endswith(".mp4")

        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(data["file_url"]))
        assert os.path.exists(file_path)
        os.remove(file_path)

    async def test_video_upload_falls_back_to_original_when_ffmpeg_fails(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        with patch("app.routers.media.shutil.which", return_value="/usr/bin/ffmpeg"), \
             patch("app.routers.media.subprocess.run", side_effect=RuntimeError("boom")):
            resp = await client.post(
                "/api/media/upload",
                files={"file": ("clip.mov", b"fake-quicktime-bytes", "video/quicktime")},
                headers=auth_headers(admin),
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["file_url"].endswith(".mov")

        file_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(data["file_url"]))
        if os.path.exists(file_path):
            os.remove(file_path)
