import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user, make_school


class TestPublicSchools:
    async def test_public_lists_only_active_schools(self, client, db_session):
        active = await make_school(db_session, name="Active School")
        inactive = await make_school(db_session, name="Inactive School")
        inactive.is_active = False
        await db_session.commit()

        resp = await client.get("/api/public/schools")
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert "Active School" in names
        assert "Inactive School" not in names

    async def test_public_get_inactive_school_404(self, client, db_session):
        school = await make_school(db_session, name="Hidden School")
        school.is_active = False
        await db_session.commit()

        resp = await client.get(f"/api/public/schools/{school.id}")
        assert resp.status_code == 404


class TestPublicInstructors:
    async def test_only_featured_instructors_listed(self, client, db_session):
        featured = await make_user(db_session, role=UserRole.MANAGER.value)
        featured.is_featured_instructor = True
        not_featured = await make_user(db_session, role=UserRole.MANAGER.value)
        await db_session.commit()

        resp = await client.get("/api/public/instructors")
        assert resp.status_code == 200
        ids = [i["id"] for i in resp.json()["items"]]
        assert str(featured.id) in ids
        assert str(not_featured.id) not in ids


class TestSiteContentAdmin:
    async def test_admin_creates_and_public_reads_content(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/site-content/",
            json={"slug": "anasayfa", "title": "Hoş Geldiniz", "body": "Metin"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200

        public_resp = await client.get("/api/public/content/anasayfa")
        assert public_resp.status_code == 200
        assert public_resp.json()["title"] == "Hoş Geldiniz"

    async def test_duplicate_slug_rejected(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        await client.post(
            "/api/site-content/",
            json={"slug": "iletisim", "title": "T1"},
            headers=auth_headers(admin),
        )
        resp = await client.post(
            "/api/site-content/",
            json={"slug": "iletisim", "title": "T2"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 400

    async def test_non_admin_cannot_create_content(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post(
            "/api/site-content/",
            json={"slug": "okullar", "title": "T"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_unknown_slug_404(self, client, db_session):
        resp = await client.get("/api/public/content/does-not-exist")
        assert resp.status_code == 404
