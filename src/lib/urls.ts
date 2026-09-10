/**
 * Public links for a guest book.
 *
 * `import.meta.env.BASE_URL` is whatever Vite was built with ('/' locally,
 * '/Guestbook/' on GitHub Pages), and the '#/' keeps every route inside the
 * single index.html that a static host serves.
 */
export function publicGuestBookUrl(slug: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${window.location.origin}${base}#/g/${slug}`;
}
