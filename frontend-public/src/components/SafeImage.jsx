import { useState } from 'react';

/**
 * Yuklenemeyen gorsellerde tarayicinin "kirik resim" ikonunu gostermek yerine
 * `fallback` icerigini (verilmediyse hicbir sey) gosterir. Bos/null `src` icin
 * de ayni davranis gecerlidir.
 */
export default function SafeImage({ src, fallback = null, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) return fallback;
  return <img src={src} onError={() => setFailedSrc(src)} {...props} />;
}
