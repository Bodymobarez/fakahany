/** Strip HTML / scraped markup from product description fields. */
export function cleanProductDescription(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<\s*br\s*\/?>/gi, '\n');
  s = s.replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article)\s*>/gi, '\n');
  s = s.replace(/<\s*li[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : ' ';
    });
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
