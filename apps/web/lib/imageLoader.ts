/**
 * Passthrough loader — Cloudflare OpenNext often 404s `/_next/image`.
 * Serve remote/local URLs directly instead of the optimizer.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Absolute URL — append width/quality hints when the host supports them (e.g. Unsplash).
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const url = new URL(src);
      if (url.hostname === 'images.unsplash.com') {
        if (!url.searchParams.has('w')) url.searchParams.set('w', String(width));
        if (!url.searchParams.has('q')) url.searchParams.set('q', String(quality ?? 75));
        return url.toString();
      }
      return src;
    } catch {
      return src;
    }
  }

  return src;
}
