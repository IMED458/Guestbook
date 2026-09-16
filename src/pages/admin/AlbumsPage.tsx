import React, { useCallback, useEffect, useState } from 'react';
import { Download, Images, Lock, LockOpen, Search, Trash2, Video } from 'lucide-react';
import type { Album, Client, MediaRecord } from '../../domain/models.ts';
import { albumService } from '../../services/eventService.ts';
import { clientService } from '../../services/clientService.ts';
import { formatBytes, mediaService } from '../../services/mediaService.ts';
import { matchesSearch } from '../../services/firestoreHelpers.ts';
import { formatDateShort } from '../../domain/dates.ts';
import { useSession } from '../../lib/session.tsx';
import { publicAlbumUrl } from '../../lib/urls.ts';
import { inputClass } from '../../components/ui/Field.tsx';
import { primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

type Filter = 'ALL' | 'IMAGE' | 'VIDEO';

export const AlbumsPage: React.FC = () => {
  const { can } = useSession();
  const toast = useToast();

  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState<Album | null>(null);
  const [media, setMedia] = useState<MediaRecord[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<MediaRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [albumList, clientList] = await Promise.all([albumService.list(), clientService.list()]);
      setAlbums(albumList);
      setClients(clientList);
    } catch (err) {
      console.error('albums load failed', err);
      setError('ალბომების ჩატვირთვა ვერ მოხერხდა');
      setAlbums([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAlbum = async (album: Album) => {
    setOpen(album);
    setMedia(null);
    setSelected(new Set());
    setFilter('ALL');
    try {
      setMedia(await mediaService.listForAlbum(album.id));
    } catch (err) {
      console.error('media load failed', err);
      setMedia([]);
      toast.error('ფაილების ჩატვირთვა ვერ მოხერხდა');
    }
  };

  const toggleUploads = async (album: Album) => {
    try {
      await albumService.setUploadEnabled(album, !album.limits.uploadEnabled);
      toast.success(album.limits.uploadEnabled ? 'ატვირთვა დაიხურა' : 'ატვირთვა გაიხსნა');
      await load();
      if (open?.id === album.id) {
        setOpen({ ...album, limits: { ...album.limits, uploadEnabled: !album.limits.uploadEnabled } });
      }
    } catch (err) {
      console.error('album toggle failed', err);
      toast.error('ოპერაცია ვერ შესრულდა');
    }
  };

  const download = async (item: MediaRecord) => {
    try {
      const url = await mediaService.downloadUrl(item.id);
      // Navigating rather than fetching lets the signed Content-Disposition
      // hand back the guest's original filename.
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('download failed', err);
      toast.error('ჩამოტვირთვა ვერ მოხერხდა');
    }
  };

  /**
   * Opening each file in turn rather than zipping in the browser: a wedding
   * album can be many gigabytes, and building that archive in memory would
   * simply crash the tab.
   */
  const downloadSelected = async () => {
    if (selected.size === 0) return;
    try {
      const results = await mediaService.downloadBatch([...selected]);
      const usable = results.filter((r) => r.url);
      usable.forEach((r, index) => {
        window.setTimeout(() => window.open(r.url, '_blank', 'noopener'), index * 400);
      });
      toast.success(`${usable.length} ფაილის ჩამოტვირთვა დაიწყო`);
    } catch (err) {
      console.error('batch download failed', err);
      toast.error('ჩამოტვირთვა ვერ მოხერხდა');
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await mediaService.remove(removing.id);
      toast.success('ფაილი წაიშალა');
      setMedia((prev) => (prev || []).filter((m) => m.id !== removing.id));
      setRemoving(null);
    } catch (err) {
      console.error('media delete failed', err);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const clientName = (id: string) => clients.find((c) => c.id === id)?.displayName || '—';
  const visible = (albums || []).filter((a) => matchesSearch(a, ['title', 'slug'], search));
  const shown = (media || []).filter((m) => filter === 'ALL' || m.kind === filter);

  if (open) {
    const images = (media || []).filter((m) => m.kind === 'IMAGE').length;
    const videos = (media || []).filter((m) => m.kind === 'VIDEO').length;
    const bytes = (media || []).reduce((sum, m) => sum + (m.fileSize || 0), 0);

    return (
      <div className="p-6 lg:p-8">
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="text-[13px] font-medium text-stone-700 hover:text-stone-900 cursor-pointer mb-4"
        >
          ← ალბომები
        </button>

        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">{open.title}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {media === null
                ? 'იტვირთება...'
                : `${images} ფოტო · ${videos} ვიდეო · ${formatBytes(bytes)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={publicAlbumUrl(open.slug)} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
              საჯარო გვერდი
            </a>
            {can('albums.manage') && (
              <button type="button" onClick={() => toggleUploads(open)} className={`${secondaryButton} inline-flex items-center gap-1.5`}>
                {open.limits.uploadEnabled ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />}
                {open.limits.uploadEnabled ? 'ატვირთვის დახურვა' : 'ატვირთვის გახსნა'}
              </button>
            )}
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['ALL', 'IMAGE', 'VIDEO'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors ${
                filter === f ? 'bg-stone-900 text-white' : 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-100'
              }`}
            >
              {f === 'ALL' ? 'ყველა' : f === 'IMAGE' ? 'ფოტო' : 'ვიდეო'}
            </button>
          ))}

          {selected.size > 0 && (
            <button type="button" onClick={downloadSelected} className={`${primaryButton} ml-auto inline-flex items-center gap-1.5`}>
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {selected.size} ფაილის ჩამოტვირთვა
            </button>
          )}
        </div>

        {media === null ? (
          <LoadingState />
        ) : shown.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl">
            <EmptyState
              title="ფაილები ჯერ არ არის"
              hint="სტუმრებმა QR კოდით რომ ატვირთონ, ბმული გაუზიარეთ."
            />
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((item) => (
              <li key={item.id} className="group relative rounded-lg border border-stone-200 bg-white overflow-hidden">
                <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                  {item.kind === 'VIDEO' ? (
                    <Video className="w-8 h-8 text-stone-400" aria-hidden="true" />
                  ) : (
                    // Only legacy rows carry a directly viewable URL; R2
                    // originals are private and reached through a signed link.
                    item.url ? (
                      <img src={item.url} alt={item.originalName} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <Images className="w-8 h-8 text-stone-400" aria-hidden="true" />
                    )
                  )}
                </div>

                <div className="p-2">
                  <p className="text-[11px] font-medium text-stone-900 truncate" title={item.originalName}>
                    {item.originalName}
                  </p>
                  <p className="text-[10px] text-stone-600">
                    {formatBytes(item.fileSize)}
                    {item.uploaderName && ` · ${item.uploaderName}`}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-1 px-2 pb-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                      aria-label={`${item.originalName} — მონიშვნა`}
                      className="w-3.5 h-3.5 rounded border-stone-400 cursor-pointer"
                    />
                    მონიშვნა
                  </label>

                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => download(item)}
                      aria-label={`${item.originalName} — ორიგინალის ჩამოტვირთვა`}
                      className="p-1 rounded text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    {can('media.delete') && (
                      <button
                        type="button"
                        onClick={() => setRemoving(item)}
                        aria-label={`${item.originalName} — წაშლა`}
                        className="p-1 rounded text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ConfirmDialog
          isOpen={removing !== null}
          title="ფაილის წაშლა"
          message={`„${removing?.originalName}“ სამუდამოდ წაიშლება საცავიდან. ეს ქმედება შეუქცევადია.`}
          confirmLabel="წაშლა"
          busy={busy}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">ციფრული ალბომები</h1>
        <p className="mt-1 text-sm text-stone-600">
          {albums === null ? 'იტვირთება...' : `${albums.length} ალბომი`}
        </p>
      </header>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ძებნა დასახელებით"
          aria-label="ალბომების ძებნა"
          className={`${inputClass} pl-9`}
        />
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : albums === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <EmptyState
            title="ალბომი ჯერ არ არის"
            hint="ალბომი იქმნება ღონისძიების შექმნისას — მონიშნეთ „ციფრული ალბომი“."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ალბომი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">კლიენტი</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ფაილები</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">ატვირთვა</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-stone-700">შექმნილი</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((album) => (
                  <tr
                    key={album.id}
                    onClick={() => openAlbum(album)}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">{album.title}</td>
                    <td className="px-4 py-3 text-stone-700">{clientName(album.clientId)}</td>
                    <td className="px-4 py-3 text-stone-700">
                      {album.stats.fileCount || 0} · {formatBytes(album.stats.totalBytes || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                          album.archivedAt
                            ? 'bg-stone-100 text-stone-700 border-stone-300'
                            : album.limits.uploadEnabled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {album.archivedAt ? 'დაარქივებული' : album.limits.uploadEnabled ? 'ღიაა' : 'დახურულია'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDateShort(album.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
