// current_grade === 0: ogrenci henuz 1. dereceyi almamis (yeni baslayan).
export function isNoGrade(grade) {
  return grade === 0;
}

export function formatGrade(grade) {
  return isNoGrade(grade) ? 'Derece Yok (0)' : `${grade}. Derece`;
}
