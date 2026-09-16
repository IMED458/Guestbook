import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * A regression guard for the focus bug.
 *
 * Symptom: typing one character into any dialog field threw focus back to the
 * top of the dialog. Cause: the effect listed `onClose` as a dependency, and
 * every caller passes an inline arrow, so every keystroke re-ran the effect
 * and re-focused. The fix is to hold the callback in a ref.
 */
describe('useModalA11y', () => {
  const source = readFileSync(new URL('../useModalA11y.ts', import.meta.url), 'utf8');

  it('depends on isOpen alone, so a re-render cannot steal focus mid-typing', () => {
    const deps = /\}, \[([^\]]*)\]\);/g;
    const lists = [...source.matchAll(deps)].map((m) => m[1].trim());

    // The focus-and-trap effect must not list the callback.
    expect(lists).toContain('isOpen');
    lists.forEach((list) => {
      expect(list).not.toMatch(/onClose/);
    });
  });

  it('keeps the callback current through a ref rather than a dependency', () => {
    expect(source).toMatch(/onCloseRef\s*=\s*useRef\(onClose\)/);
    expect(source).toMatch(/onCloseRef\.current\(\)/);
  });
});
