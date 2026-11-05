import { describe, expect, it } from 'vitest';
import { toQueueItems } from '../AlbumUploadPage.tsx';

/** Stands in for a real FileList: a live view that the input can empty. */
function liveFileList(files: File[]) {
  const list = {
    get length() { return files.length; },
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () { yield* files; },
  };
  return { list: list as unknown as FileList, clear: () => { files.length = 0; } };
}

const jpeg = (name: string) =>
  new File([new Uint8Array(10)], name, { type: 'image/jpeg', lastModified: 1 });

describe('toQueueItems', () => {
  it('copies the files before the input can be cleared', () => {
    // This is the bug that silently dropped every photo a guest picked: the
    // handler clears the input the moment it returns, and a FileList read any
    // later is empty.
    const { list, clear } = liveFileList([jpeg('a.jpg'), jpeg('b.jpg')]);
    const items = toQueueItems(list);
    clear();

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.file.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(list.length).toBe(0);
  });

  it('queues every file it was given, each with its own id', () => {
    const items = toQueueItems([jpeg('a.jpg'), jpeg('a.jpg')]);
    expect(items).toHaveLength(2);
    expect(items[0].id).not.toBe(items[1].id);
    expect(items.every((i) => i.phase === 'queued' && i.progress === 0)).toBe(true);
  });

  it('treats nothing picked as nothing to do', () => {
    expect(toQueueItems(null)).toEqual([]);
    expect(toQueueItems([])).toEqual([]);
  });
});
