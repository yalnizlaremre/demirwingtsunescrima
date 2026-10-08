// Telefon/adres alanlari panelde serbest metin olarak giriliyor
// (ornegin "05359671992" veya "0546 205 77 00"). Bu yardimcilar sitede
// tiklanabilir linkler uretmek icin kullanilir.

export function telHref(phone) {
  if (!phone) return null;
  let digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return `tel:${digits}`;
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) return `tel:+90${digits}`;
  return `tel:${digits}`;
}

export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const m = digits.match(/^0?(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export function mapsHref(address, name) {
  if (!address) return null;
  const q = [name, address].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
