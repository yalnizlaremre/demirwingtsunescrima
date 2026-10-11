"""emre_yalnizlar_bio

Revision ID: e5f6a7b8c9db
Revises: d4e5f6a7b8ca
Create Date: 2026-10-11 00:00:00.000000

Sifu Emre Yalnizlar'in biyografisi (kullanicinin kendisi verdi, 2026-10-11)
`users.bio` alanina yazilir; soyadindaki eksik Turkce karakter duzeltilir
("Yalnizlar" -> "Yalnızlar"). Sonradan panelden (Kullanicilar -> Kisa
Biyografi) duzenlenebilir. Satir sonlari korunur (sitede her satir ayri gosterilir).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9db'
down_revision: Union[str, None] = 'd4e5f6a7b8ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMAIL = "emreyalnizlar@gmail.com"

BIO = "\n".join([
    "Sifu Emre Yalnızlar, dövüş sanatları yolculuğuna 2008 yılında Taekwondo ile başlamış; bu alandaki antrenmanlarını sürdürürken paralel olarak 2009 yılında Tekirdağ’da Avcı Wing Tsun sistemiyle tanışmıştır. Dört yıl boyunca burada eğitimlerini sürdürmüş, 2013 yılında üniversite eğitimi için İstanbul’a yerleşmiştir.",
    "İstanbul’da, Sifu Saffet Demir’in önderliğindeki Avcı Wing Tsun Koşuyolu ekibine katılarak eğitimlerine devam eden Sifu Emre Yalnızlar, 2016 yılına kadar Avcı Wing Tsun & Escrima (WTEO) organizasyonu çatısı altında, Sifu Saffet Demir’in doğrudan kontrolünde yoğun bir eğitim süreci geçirmiştir.",
    "Sifu Saffet Demir’in Hollanda’ya taşınmasının ardından eğitimlerini Sifu Serhat Demir’in liderliğinde sürdürmüştür.",
    "2018 yılında 1. Teknik Usta (1. TG) derecesi çalışmalarına başlamış,",
    "2020 yılında 2. Teknik Usta (2. TG),",
    "2023 yılında ise 3. Teknik Usta (3. TG) çalışmalarına geçmiştir.",
    "Aralık 2019 tarihinde Avcı Wing Tsun & Escrima Organizasyonu’ndan ayrılarak, Demir Wing Tsun Organizasyonu’nun kurucusu ve şefi olan Sifu Serhat Demir önderliğinde kurucu kadroda yer almış ve Demir Wing Tsun sisteminin oluşum sürecine aktif katkı sağlamıştır.",
    "Eylül 2021 itibariyle İstanbul Koşuyolu ekibinin baş çalıştırıcısı olarak eğitmenlik görevini üstlenmiş; bu süreçte hem Avcı WTEO hem de Demir Wing Tsun Organizasyonu bünyesinde, organizasyona bağlı Tekirdağ’daki Wing Tsun okullarına düzenli olarak eğitmenlik yaparak bilgi ve tecrübelerini aktarmıştır.",
    "2025 yılı başında, Sifu Serhat Demir ve Sifu Saffet Demir tarafından “Sifu” ünvanına layık görülmüş.",
    "Günümüzde, Demir Wing Tsun çatısı altında; Sifu Serhat Demir ve Sifu Saffet Demir’e bağlı olarak,",
    "İstanbul ve Tekirdağ okullarında Wing Tsun ve Escrima eğitimleri vermeye devam etmektedir.",
    "Sifu Emre Yalnızlar, 2008 yılında başlamış olduğu Taekwondo' a 2012 yılında Siyah Kuşak 1. Dan,",
    "2013 yılı itibariylen Siyah Kuşak 2. Dan'a sahiptir.",
])


def upgrade() -> None:
    op.get_bind().execute(
        sa.text("UPDATE users SET bio = :bio, last_name = 'Yalnızlar' WHERE email = :email"),
        {"bio": BIO, "email": EMAIL},
    )


def downgrade() -> None:
    pass
