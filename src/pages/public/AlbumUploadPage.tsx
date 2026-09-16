import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, Image as ImageIcon, Loader2, RotateCcw, Video, X } from 'lucide-react';
import type { Album } from '../../domain/models.ts';
import { albumService } from '../../services/eventService.ts';
import { formatBytes, uploadFile, type UploadPhase } from '../../services/mediaService.ts';
import { apiConfigured } from '../../services/apiClient.ts';
import { formatDateLong } from '../../domain/dates.ts';
import { inputClass } from '../../components/ui/Field.tsx';
import { primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';

interface QueueItem {
  id: string;
  file: File;
  phase: UploadPhase;
  progress: number;
  error?: string;
  controller?: AbortController;
}

/** Four at a time: enough to use the connection, few enough not to swamp a phone. */
const CONCURRENCY = 3;

/**
 * What a guest sees after scanning the album QR. No account, no app, no
 * instructions beyond one button — they are standing at a wedding holding a
 * phone, and every extra step loses photographs.
 */
export const AlbumUploadPage: React.FC<{ slug: string }> = ({ slug }) => {
  const [album, setAlbum] = useState<Album | null | 'missing'>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploaderName, setUploaderName] = useState('');
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    albumService
      .getBySlug(slug)
      .then((found) => setAlbum(found || 'missing'))
      .catch(() => setAlbum('missing'));
  }, [slug]);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setQueue((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        phase: 'queued' as UploadPhase,
        progress: 0,
      })),
    ]);
  };

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const runOne = useCallback(
    async (item: QueueItem, albumId: string) => {
      const controller = new AbortController();
      patch(item.id, { phase: 'uploading', progress: 0, error: undefined, controller });

      try {
        const result = await uploadFile(
          item.file,
          { albumId, uploaderName: uploaderName.trim() || undefined },
          (progress, phase) => patch(item.id, { progress, phase }),
          controller.signal
        );
        patch(item.id, { phase: 'done', progress: 100, error: undefined });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ატვირთვა ვერ მოხერხდა';
        patch(item.id, {
          phase: controller.signal.aborted ? 'cancelled' : 'failed',
          error: controller.signal.aborted ? undefined : message,
        });
        return null;
      }
    },
    [patch, uploaderName]
  );

  const start = async () => {
    if (album === null || album === 'missing') return;

    setRunning(true);
    const pending = queue.filter((item) => item.phase === 'queued' || item.phase === 'failed');

    // A small worker pool, rather than firing every file at once.
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const item = pending[cursor++];
        await runOne(item, album.id);
      }
    });

    await Promise.all(workers);
    setRunning(false);
  };

  const totalBytes = queue.reduce((sum, item) => sum + item.file.size, 0);
  const doneCount = queue.filter((item) => item.phase === 'done').length;
  const failedCount = queue.filter((item) => item.phase === 'failed').length;
  const allDone = queue.length > 0 && doneCount === queue.length;

  if (album === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <p className="flex items-center gap-2 text-sm text-stone-600">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          იტვირთება...
        </p>
      </main>
    );
  }

  if (album === 'missing') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-serif font-bold text-stone-900">ალბომი ვერ მოიძებნა</h1>
          <p className="mt-2 text-sm text-stone-600">
            შეამოწმეთ ბმული, ან დაუკავშირდით ღონისძიების მასპინძელს.
          </p>
        </div>
      </main>
    );
  }

  const expired =
    album.archivedAt ||
    !album.limits.uploadEnabled ||
    (album.limits.expiresAt && new Date(album.limits.expiresAt).getTime() < Date.now());

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-stone-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">{album.title}</h1>
          <p className="mt-3 text-[15px] text-stone-700 leading-relaxed">{album.welcomeMessage}</p>
        </header>

        {expired ? (
          <div className="rounded-2xl border border-stone-300 bg-white p-6 text-center">
            <p className="text-sm font-medium text-stone-800">
              ამ ალბომში ფაილების ატვირთვა დასრულებულია.
            </p>
            {album.limits.expiresAt && (
              <p className="mt-1.5 text-[13px] text-stone-600">
                ატვირთვა ღია იყო {formatDateLong(album.limits.expiresAt)}-მდე.
              </p>
            )}
          </div>
        ) : !apiConfigured ? (
          <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
            <p className="text-sm text-amber-900">
              ატვირთვის სერვისი ჯერ არ არის კონფიგურირებული. დაუკავშირდით მასპინძელს.
            </p>
          </div>
        ) : (
          <>
            {!allDone && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <label htmlFor="uploader-name" className="block text-[13px] font-semibold text-stone-800 mb-1.5">
                  თქვენი სახელი <span className="font-normal text-stone-500">(არასავალდებულო)</span>
                </label>
                <input
                  id="uploader-name"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="მაგ. ნინო"
                  className={inputClass}
                />

                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="album-file-input"
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={running}
                  className="mt-4 w-full py-4 px-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col items-center gap-2 disabled:opacity-60"
                >
                  <CloudUpload className="w-7 h-7 text-stone-500" aria-hidden="true" />
                  <span className="text-sm font-semibold text-stone-900">
                    ფოტოებისა და ვიდეოების ატვირთვა
                  </span>
                  <span className="text-[11px] text-stone-600">
                    აირჩიეთ რამდენიც გსურთ — ორიგინალი ხარისხი შენარჩუნდება
                  </span>
                </button>
              </div>
            )}

            {queue.length > 0 && (
              <section className="mt-5 rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 bg-stone-50">
                  <p className="text-[13px] font-semibold text-stone-900">
                    {queue.length} ფაილი · {formatBytes(totalBytes)}
                  </p>
                  {doneCount > 0 && (
                    <p className="text-[11px] text-stone-600">
                      ატვირთულია {doneCount} / {queue.length}
                    </p>
                  )}
                </div>

                <ul className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                  {queue.map((item) => (
                    <li key={item.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {item.file.type.startsWith('video') ? (
                          <Video className="w-4 h-4 text-stone-500 shrink-0" aria-hidden="true" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-stone-500 shrink-0" aria-hidden="true" />
                        )}

                        <span className="flex-1 min-w-0 text-[13px] text-stone-800 truncate">
                          {item.file.name}
                        </span>

                        <span className="text-[11px] text-stone-600 shrink-0 tabular-nums">
                          {item.phase === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                          ) : item.phase === 'failed' ? (
                            <span className="text-rose-700 font-semibold">ვერ აიტვირთა</span>
                          ) : item.phase === 'uploading' || item.phase === 'finalizing' ? (
                            `${item.progress}%`
                          ) : (
                            formatBytes(item.file.size)
                          )}
                        </span>

                        {(item.phase === 'queued' || item.phase === 'failed') && (
                          <button
                            type="button"
                            onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                            aria-label={`${item.file.name} — სიიდან ამოღება`}
                            className="p-1 text-stone-500 hover:text-rose-700 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {(item.phase === 'uploading' || item.phase === 'finalizing') && (
                        <div className="mt-1.5 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-stone-900 rounded-full transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {item.error && (
                        <p className="mt-1 text-[11px] text-rose-700 leading-relaxed">{item.error}</p>
                      )}
                    </li>
                  ))}
                </ul>

                {!allDone && (
                  <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={running}
                      className={`${secondaryButton} flex-1`}
                    >
                      დამატება
                    </button>
                    <button
                      type="button"
                      onClick={start}
                      disabled={running || queue.every((q) => q.phase === 'done')}
                      className={`${primaryButton} flex-1 inline-flex items-center justify-center gap-2`}
                    >
                      {running ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          იტვირთება...
                        </>
                      ) : failedCount > 0 ? (
                        <>
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                          ხელახლა ცდა
                        </>
                      ) : (
                        'ატვირთვა'
                      )}
                    </button>
                  </div>
                )}
              </section>
            )}

            {allDone && (
              <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-base font-semibold text-stone-900">ატვირთვა დასრულდა</p>
                <p className="mt-1.5 text-sm text-stone-700">
                  მადლობა, რომ გაგვიზიარეთ მოგონებები ❤️
                </p>
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className={`${secondaryButton} mt-5`}
                >
                  კიდევ ატვირთვა
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
