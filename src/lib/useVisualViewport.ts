import { useEffect, useState } from 'react';

export interface ViewportBox {
  height: number;
  offsetTop: number;
}

/**
 * The visible slice of the screen, as the browser reports it.
 *
 * On iOS the on-screen keyboard does not shrink the layout viewport, so a
 * dialog sized with `100dvh` keeps its full height and the keyboard covers the
 * bottom of it. Worse, Safari then scrolls the whole fixed layer up to reveal
 * the focused field, which pushes the dialog's header — and its close button —
 * off the top of the screen with no way to scroll back to it.
 *
 * `visualViewport` reports both the shrunken height and how far the browser
 * shifted the layer, which is enough to keep a dialog pinned inside whatever
 * the visitor can actually see. Returns null where the API is missing, so the
 * caller can fall back to a CSS height.
 */
export function useVisualViewport(enabled: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!enabled || !vv) {
      setBox(null);
      return;
    }

    const update = () => setBox({ height: vv.height, offsetTop: vv.offsetTop });
    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return box;
}
