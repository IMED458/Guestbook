/**
 * Slugs for guest book links.
 *
 * A Georgian title stripped to /[a-z0-9]/ leaves nothing behind, which is how
 * every Georgian-named book ended up as `guest-book`, `guest-book-2`,
 * `guest-book-3`. Transliterating first keeps links readable and shareable:
 * "ნიკა და ანას ქორწილი" becomes "nika-da-anas-qorwili".
 */

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't',
  ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh',
  რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'f', ქ: 'q', ღ: 'gh', ყ: 'y',
  შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'w', ჭ: 'ch', ხ: 'kh', ჯ: 'j',
  ჰ: 'h',
  // Archaic letters, still seen in stylised titles.
  ჱ: 'e', ჲ: 'i', ჳ: 'w', ჴ: 'kh', ჵ: 'o', ჶ: 'f', ჷ: 'e', ჸ: 'y', ჹ: 'gh', ჺ: 'q',
};

export function transliterate(input: string): string {
  let out = '';
  for (const char of input) {
    out += GEORGIAN_TO_LATIN[char] ?? char;
  }
  return out;
}

/** Lowercase, latin-only, hyphen-separated. Never returns an empty string. */
export function slugify(title: string, fallback = 'guest-book'): string {
  const slug = transliterate(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

  return slug || fallback;
}
