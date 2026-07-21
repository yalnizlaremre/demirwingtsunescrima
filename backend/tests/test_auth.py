import pytest
from jose import jwt

from app.config import settings
from app.models.user import UserRole, UserStatus
from tests.conftest import auth_headers, make_user


class TestLogin:
    async def test_login_success(self, client, db_session):
        user = await make_user(db_session, email="ok@test.com", password="secret123")
        resp = await client.post("/api/auth/login", json={"email": "ok@test.com", "password": "secret123"})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    async def test_login_wrong_password(self, client, db_session):
        await make_user(db_session, email="ok2@test.com", password="secret123")
        resp = await client.post("/api/auth/login", json={"email": "ok2@test.com", "password": "wrong"})
        assert resp.status_code == 401

    async def test_login_unknown_email(self, client, db_session):
        resp = await client.post("/api/auth/login", json={"email": "nobody@test.com", "password": "x"})
        assert resp.status_code == 401

    async def test_login_inactive_user_forbidden(self, client, db_session):
        await make_user(db_session, email="pending@test.com", password="secret123", status=UserStatus.PENDING.value)
        resp = await client.post("/api/auth/login", json={"email": "pending@test.com", "password": "secret123"})
        assert resp.status_code == 403


class TestRegister:
    async def test_register_creates_pending_member(self, client, db_session):
        resp = await client.post(
            "/api/auth/register",
            json={"email": "new@test.com", "password": "secret123", "first_name": "A", "last_name": "B"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["role"] == UserRole.MEMBER.value
        assert body["status"] == UserStatus.PENDING.value

    async def test_register_duplicate_email_rejected(self, client, db_session):
        await make_user(db_session, email="dup@test.com")
        resp = await client.post(
            "/api/auth/register",
            json={"email": "dup@test.com", "password": "secret123", "first_name": "A", "last_name": "B"},
        )
        assert resp.status_code == 400

    async def test_registered_user_cannot_login_before_approval(self, client, db_session):
        await client.post(
            "/api/auth/register",
            json={"email": "waiting@test.com", "password": "secret123", "first_name": "A", "last_name": "B"},
        )
        resp = await client.post(
            "/api/auth/login", json={"email": "waiting@test.com", "password": "secret123"}
        )
        assert resp.status_code == 403


class TestPendingUsersApproval:
    async def test_manager_lists_pending_users(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        pending = await make_user(db_session, status=UserStatus.PENDING.value)
        resp = await client.get("/api/users/pending", headers=auth_headers(manager))
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()["items"]]
        assert str(pending.id) in ids

    async def test_manager_approves_pending_user(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        pending = await make_user(db_session, status=UserStatus.PENDING.value)
        resp = await client.post(
            f"/api/users/{pending.id}/approve", headers=auth_headers(manager)
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == UserStatus.ACTIVE.value

        login = await client.post(
            "/api/auth/login", json={"email": pending.email, "password": "password123"}
        )
        assert login.status_code == 200

    async def test_non_manager_cannot_approve(self, client, db_session):
        member = await make_user(db_session, role=UserRole.MEMBER.value)
        pending = await make_user(db_session, status=UserStatus.PENDING.value)
        resp = await client.post(
            f"/api/users/{pending.id}/approve", headers=auth_headers(member)
        )
        assert resp.status_code == 403

    async def test_approving_already_active_user_rejected(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        active = await make_user(db_session, status=UserStatus.ACTIVE.value)
        resp = await client.post(
            f"/api/users/{active.id}/approve", headers=auth_headers(manager)
        )
        assert resp.status_code == 400


class TestRefresh:
    async def test_refresh_with_valid_refresh_token(self, client, db_session):
        user = await make_user(db_session, email="ref@test.com", password="secret123")
        login = await client.post("/api/auth/login", json={"email": "ref@test.com", "password": "secret123"})
        refresh_token = login.json()["refresh_token"]

        resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body

    async def test_refresh_rejects_access_token(self, client, db_session):
        user = await make_user(db_session, email="ref2@test.com", password="secret123")
        login = await client.post("/api/auth/login", json={"email": "ref2@test.com", "password": "secret123"})
        access_token = login.json()["access_token"]

        resp = await client.post("/api/auth/refresh", json={"refresh_token": access_token})
        assert resp.status_code == 401

    async def test_refresh_rejects_garbage_token(self, client, db_session):
        resp = await client.post("/api/auth/refresh", json={"refresh_token": "not-a-jwt"})
        assert resp.status_code == 401

    async def test_refresh_rejects_expired_token(self, client, db_session):
        from datetime import datetime, timedelta, timezone

        user = await make_user(db_session, email="ref3@test.com", password="secret123")
        expired_payload = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": datetime.now(timezone.utc) - timedelta(days=1),
        }
        expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        resp = await client.post("/api/auth/refresh", json={"refresh_token": expired_token})
        assert resp.status_code == 401


class TestRoleGuard:
    async def test_non_admin_forbidden_from_admin_endpoint(self, client, db_session):
        user = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.post(
            "/api/events/",
            json={
                "name": "X",
                "event_type": "SEMINAR",
                "start_datetime": "2030-01-01T00:00:00Z",
                "end_datetime": "2030-01-02T00:00:00Z",
                "location": "Test Location",
            },
            headers=auth_headers(user),
        )
        assert resp.status_code == 403

    async def test_admin_allowed_on_admin_endpoint(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/events/",
            json={
                "name": "X",
                "event_type": "SEMINAR",
                "start_datetime": "2030-01-01T00:00:00Z",
                "end_datetime": "2030-01-02T00:00:00Z",
                "location": "Test Location",
            },
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200

    async def test_unauthenticated_request_rejected(self, client, db_session):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401


class TestMeExtraPermissions:
    async def test_me_returns_extra_permissions(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        manager.extra_permissions = ["manage_schools", "manage_events"]
        await db_session.commit()

        resp = await client.get("/api/auth/me", headers=auth_headers(manager))
        assert resp.status_code == 200
        assert resp.json()["extra_permissions"] == ["manage_schools", "manage_events"]

    async def test_me_extra_permissions_defaults_empty(self, client, db_session):
        user = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.get("/api/auth/me", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json()["extra_permissions"] == []
