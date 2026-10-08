"""Paylasilan alan dogrulayicilari.

Gorsel/video alanlari (kapak gorseli, site icerigi gorseli vb.) serbest metin
olarak girilebildigi icin daha once bir okulun kapak gorseline yerel bir
Windows dosya yolu (C:\\Users\\...) kaydedilmis ve canli sitede kirik gorsel
olarak gorunmustu. Bu dogrulayici sadece sunucudaki yuklemelere (/uploads/...)
veya tam bir http(s) adresine izin verir; bos deger "temizle" anlamina gelir.
"""

MEDIA_URL_ERROR = (
    "Geçersiz görsel adresi: bilgisayarınızdaki bir dosya yolu yerine \"Dosya Seç\" "
    "ile yükleyin ya da 'https://...' ile başlayan bir adres girin."
)
WEB_URL_ERROR = "Geçersiz adres: 'https://...' ile başlayan bir adres olmalı."


def validate_media_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return ""
    if value.startswith("/uploads/") or value.startswith("https://") or value.startswith("http://"):
        return value
    raise ValueError(MEDIA_URL_ERROR)


def validate_web_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return ""
    if value.startswith("https://") or value.startswith("http://"):
        return value
    raise ValueError(WEB_URL_ERROR)
