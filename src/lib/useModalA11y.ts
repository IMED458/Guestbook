import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Makes a dialog usable without a mouse: Escape closes it, Tab cycles inside
 * it instead of escaping to the page behind, focus lands on the first control
 * when it opens, and returns to whatever opened it when it closes. Also locks
 * background scrolling while open.
 *
 * Spread the returned `dialogProps` onto the dialog element and attach `ref`
 * to it.
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Prefer the dialog itself when it is focusable (tabindex="-1"): the
    // screen reader announces the dialog without a control lighting up with a
    // focus ring, and on a phone no keyboard pops open uninvited.
    const node = ref.current;
    const target =
      node?.hasAttribute('tabindex') ? node : node?.querySelector<HTMLElement>(FOCUSABLE);
    // Defer so the element exists and any entrance animation has started.
    const focusTimer = window.setTimeout(() => target?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !ref.current) return;

      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // `overflow: hidden` alone does not stop the page behind the dialog from
    // scrolling on iOS Safari, so the body is pinned in place and the scroll
    // offset restored on close.
    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return { ref };
}
