from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog, AuditAction


async def create_audit_log(
    db: AsyncSession,
    action: AuditAction,
    entity_type: str,
    entity_id: str,
    performed_by: str,
    details: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
):
    log = AuditLog(
        action=action.value,
        entity_type=entity_type,
        entity_id=entity_id,
        performed_by=performed_by,
        details=details,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(log)
    await db.flush()
    return log
