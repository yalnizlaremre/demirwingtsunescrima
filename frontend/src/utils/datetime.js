// Backend NaiveDatetime alanlari UTC'yi tzinfo'suz doner (ornek: "2026-09-15T15:00:00").
// "Z" eklenmezse tarayici bunu YEREL saat sanip yanlis yorumlar (JS'in bilinen bir
// ISO 8601 tuzagi) - once dogru UTC olarak parse edip sonra yerel saat bilesenlerini
// okumak gerekiyor.
export function parseServerDatetime(iso) {
  if (!iso) return null;
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

// <input type="datetime-local"> alanlarini doldurmak icin: server'dan gelen
// tarihi dogru yerel saatle "YYYY-MM-DDTHH:mm" formatina cevirir.
export function toDatetimeLocalInput(iso) {
  const d = parseServerDatetime(iso);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
