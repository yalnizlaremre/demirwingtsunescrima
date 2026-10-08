import pytest

from app.models.user import UserRole, UserStatus
from tests.conftest import auth_headers, make_user, make_school

pytestmark = pytest.mark.asyncio


class TestSchoolCoverImageValidation:
    """Regression: prod'da Tekirdag Okulu'nun kapak gorseline yerel bir Windows
    dosya yolu kaydedilmisti (alan serbest metindi) ve sitede kirik gorsel
    gorunuyordu."""

    async def test_windows_path_rejected_with_readable_message(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        resp = await client.put(
            f"/api/schools/{school.id}",
            json={"cover_image_url": "C:\\Users\\emrey\\picture\\Tekirdag-2.jpeg"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 422
        # detail frontend'de toast ile gosterildigi icin liste degil metin olmali
        assert isinstance(resp.json()["detail"], str)
        assert "Geçersiz görsel adresi" in resp.json()["detail"]

    @pytest.mark.parametrize("url", ["/uploads/abc.jpeg", "https://example.com/a.jpg", ""])
    async def test_valid_values_accepted(self, client, db_session, url):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        resp = await client.put(
            f"/api/schools/{school.id}",
            json={"cover_image_url": url},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["cover_image_url"] == url

    async def test_site_content_image_path_rejected(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/site-content/",
            json={"slug": "anasayfa", "title": "x", "image_url": "D:/foto.jpg"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 422
        assert isinstance(resp.json()["detail"], str)


class TestFeaturedInstructorStatus:
    async def test_inactive_featured_instructor_hidden(self, client, db_session):
        active = await make_user(db_session, role=UserRole.MANAGER.value)
        active.is_featured_instructor = True
        suspended = await make_user(
            db_session, role=UserRole.MANAGER.value, status=UserStatus.INACTIVE.value
        )
        suspended.is_featured_instructor = True
        await db_session.commit()

        resp = await client.get("/api/public/instructors")
        ids = [i["id"] for i in resp.json()["items"]]
        assert str(active.id) in ids
        assert str(suspended.id) not in ids


class TestPublicTitle:
    async def test_public_title_set_and_exposed(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        sifu = await make_user(db_session, role=UserRole.MANAGER.value)
        sifu.is_featured_instructor = True
        await db_session.commit()

        resp = await client.put(
            f"/api/users/{sifu.id}",
            json={"public_title": "  Baş Eğitmen "},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["public_title"] == "Baş Eğitmen"

        pub = await client.get("/api/public/instructors")
        item = next(i for i in pub.json()["items"] if i["id"] == str(sifu.id))
        assert item["public_title"] == "Baş Eğitmen"

        # bos metin unvani kaldirir
        resp = await client.put(
            f"/api/users/{sifu.id}", json={"public_title": ""}, headers=auth_headers(admin)
        )
        assert resp.json()["public_title"] is None
