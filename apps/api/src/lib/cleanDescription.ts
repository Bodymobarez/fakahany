/**
 * Turn scraped / ChatGPT HTML blobs into plain readable product copy.
 */
export function cleanProductDescription(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);

  // Drop script/style blocks entirely
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // Line breaks for common block tags
  s = s.replace(/<\s*br\s*\/?>/gi, '\n');
  s = s.replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article)\s*>/gi, '\n');
  s = s.replace(/<\s*li[^>]*>/gi, '• ');

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, ' ');

  // Decode a few common entities
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

  // Collapse whitespace
  s = s
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return s;
}
