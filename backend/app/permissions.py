import enum


class Permission(str, enum.Enum):
    MANAGE_SCHOOLS = "manage_schools"
    MANAGE_SITE_CONTENT = "manage_site_content"
    MANAGE_EVENTS = "manage_events"
    MANAGE_PRODUCTS = "manage_products"
    MANAGE_GRADES = "manage_grades"
    MANAGE_USERS = "manage_users"


ALL_PERMISSIONS: list[str] = [p.value for p in Permission]


def user_has_permission(user, permission: "Permission | str") -> bool:
    value = permission.value if isinstance(permission, Permission) else permission
    return value in (user.extra_permissions or [])
