"""Asenkron SMTP mail gönderme servisi."""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_emails: list[str],
    subject: str,
    body: str,
    html_body: str | None = None,
) -> dict:
    """Verilen alıcılara SMTP üzerinden e-posta gönderir.

    Args:
        to_emails: Alıcı e-posta listesi
        subject: Mail konusu
        body: Düz metin içerik
        html_body: Opsiyonel HTML içerik

    Returns:
        {"sent": int, "failed": int, "enabled": bool}
    """
    if not settings.MAIL_ENABLED:
        logger.info("Mail devre dışı (MAIL_ENABLED=false). Gönderilmedi: %s alıcı", len(to_emails))
        return {"sent": 0, "failed": 0, "enabled": False}

    if not to_emails:
        return {"sent": 0, "failed": 0, "enabled": True}

    sent = 0
    failed = 0

    for recipient in to_emails:
        try:
            message = MIMEMultipart("alternative")
            message["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
            message["To"] = recipient
            message["Subject"] = subject

            message.attach(MIMEText(body, "plain", "utf-8"))
            if html_body:
                message.attach(MIMEText(html_body, "html", "utf-8"))

            await aiosmtplib.send(
                message,
                hostname=settings.MAIL_HOST,
                port=settings.MAIL_PORT,
                username=settings.MAIL_USER,
                password=settings.MAIL_PASSWORD,
                start_tls=True,
            )
            sent += 1
        except Exception as exc:
            logger.error("Mail gönderilemedi -> %s: %s", recipient, exc)
            failed += 1

    return {"sent": sent, "failed": failed, "enabled": True}
