/**
 * Public links for a guest book.
 *
 * `import.meta.env.BASE_URL` is whatever Vite was built with ('/' locally,
 * '/Guestbook/' on GitHub Pages), and the '#/' keeps every route inside the
 * single index.html that a static host serves.
 */
function publicBase(): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${window.location.origin}${base}`;
}

export function publicGuestBookUrl(slug: string): string {
  return `${publicBase()}#/g/${slug}`;
}

/** Where a guest lands to upload photographs and video. */
export function publicAlbumUrl(slug: string): string {
  return `${publicBase()}#/a/${slug}`;
}

/** The combined page, offered when an event has both products. */
export function publicEventUrl(slug: string): string {
  return `${publicBase()}#/e/${slug}`;
}
