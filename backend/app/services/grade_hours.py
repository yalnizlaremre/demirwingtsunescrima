"""Derece bazli saat gereksinimleri ve sinav uygunluk kontrolu."""

# (min_grade, max_grade): {"required": tam saat, "minimum": alt sinir}
GRADE_HOURS_MAP = {
    (1, 3): {"required": 54, "minimum": 44},
    (4, 8): {"required": 60, "minimum": 52},
    (9, 10): {"required": 96, "minimum": 80},
    (11, 12): {"required": 128, "minimum": 110},
}


def get_hours_for_grade(grade: int) -> dict:
    """Derecenin gereken saat ve alt sinir bilgisini dondurur.

    Returns:
        {"required": int, "minimum": int} veya grade tanimli degilse {"required": 0, "minimum": 0}
    """
    for (min_g, max_g), hours in GRADE_HOURS_MAP.items():
        if min_g <= grade <= max_g:
            return hours
    return {"required": 0, "minimum": 0}


def check_exam_eligibility(grade: int, completed_hours: float) -> str:
    """Ogrencinin sinava girme uygunlugunu kontrol eder.

    Returns:
        "ELIGIBLE" - Gereken saati tamamlamis, direkt sinava girebilir
        "NEEDS_APPROVAL" - Alt siniri gecmis ama gereken saati tamamlamamis, egitmen onayi gerekir
        "NOT_ELIGIBLE" - Alt sinirin altinda, sinava giremez
    """
    hours = get_hours_for_grade(grade)
    if hours["required"] == 0:
        return "ELIGIBLE"

    if completed_hours >= hours["required"]:
        return "ELIGIBLE"
    elif completed_hours >= hours["minimum"]:
        return "NEEDS_APPROVAL"
    else:
        return "NOT_ELIGIBLE"
