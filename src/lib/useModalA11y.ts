import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Makes a dialog usable without a mouse: Escape closes it, Tab cycles inside
 * it instead of escaping to the page behind, focus lands somewhere sensible
 * when it opens, and returns to whatever opened it when it closes. Background
 * scrolling is locked while it is open.
 *
 * The callback is held in a ref rather than listed as a dependency. Callers
 * pass an inline arrow — `onClose={() => setOpen(false)}` — which is a new
 * function on every render, so depending on it would tear down and re-run this
 * effect on every keystroke, yanking focus back to the top of the dialog after
 * each character typed.
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep the latest callback without making it a dependency.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    // Prefer the dialog itself when it is focusable: a screen reader announces
    // it without a control lighting up, and on a phone no keyboard opens
    // uninvited.
    const target = node?.hasAttribute('tabindex')
      ? node
      : node?.querySelector<HTMLElement>(FOCUSABLE);

    // Defer so the element exists and any entrance animation has started.
    const focusTimer = window.setTimeout(() => target?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !ref.current) return;

      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
    // Deliberately only `isOpen`: see the note above about the callback.
  }, [isOpen]);

  return { ref };
}
