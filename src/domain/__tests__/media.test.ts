import { describe, expect, it } from 'vitest';
import { formatBytes } from '../../services/mediaService.ts';

describe('formatBytes', () => {
  it('scales to a unit a person can read', () => {
    expect(formatBytes(842 * 1024 * 1024)).toBe('842 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    expect(formatBytes(12.4 * 1024 * 1024 * 1024)).toBe('12.4 GB');
  });

  it('keeps bytes whole below a kilobyte', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('drops the decimal once the number is large enough not to need it', () => {
    expect(formatBytes(150 * 1024)).toBe('150 KB');
    expect(formatBytes(1.5 * 1024)).toBe('1.5 KB');
  });

  it('handles an empty album', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});
