import type { Album, EventRecord, EventStatus, EventType } from '../domain/models.ts';
import { slugify } from '../lib/slug.ts';
import {
  byNewest,
  createOne,
  getOne,
  listWhere,
  newId,
  nowIso,
  updateOne,
  where,
} from './firestoreHelpers.ts';

const EVENTS = 'events';
const ALBUMS = 'albums';
const GUESTBOOKS = 'guestbooks';

export interface EventInput {
  clientId: string;
  title: string;
  eventType: EventType;
  eventDate: string;
  hosts: string;
  venue?: string;
  hasGuestbook: boolean;
  hasAlbum: boolean;
  welcomeMessage?: string;
  coverImage?: string;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80';

/** One slug serves the event, its guest book and its album, so the three
 *  public links read as one family: #/e/nika-ana, #/g/nika-ana, #/a/nika-ana. */
async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;

  for (let counter = 2; counter < 25; counter++) {
    const taken = await listWhere<EventRecord>(EVENTS, [where('slug', '==', slug)]);
    if (taken.length === 0 || (taken.length === 1 && taken[0].id === excludeId)) return slug;
    slug = `${base}-${counter}`;
  }
  return `${base}-${Date.now().toString().slice(-5)}`;
}

export const eventService = {
  async list(): Promise<EventRecord[]> {
    const all = await listWhere<EventRecord>(EVENTS);
    return all.sort(byNewest());
  },

  async listForClient(clientId: string): Promise<EventRecord[]> {
    const all = await listWhere<EventRecord>(EVENTS, [where('clientId', '==', clientId)]);
    return all.sort(byNewest());
  },

  async get(id: string): Promise<EventRecord | null> {
    return getOne<EventRecord>(EVENTS, id);
  },

  async getBySlug(slug: string): Promise<EventRecord | null> {
    const found = await listWhere<EventRecord>(EVENTS, [where('slug', '==', slug.toLowerCase())]);
    return found[0] || null;
  },

  /**
   * Creating an event also creates whichever products were ticked. A guest
   * book and an album are separate things a client may want either of, both
   * of, or neither — so neither is implied by the other.
   */
  async create(input: EventInput, actorId: string): Promise<EventRecord> {
    const id = newId('ev');
    const slug = await uniqueSlug(input.title);
    const now = nowIso();

    let guestbookId: string | null = null;
    let albumId: string | null = null;

    if (input.hasGuestbook) {
      guestbookId = newId('gb');
      await createOne(GUESTBOOKS, guestbookId, {
        eventId: id,
        clientId: input.clientId,
        ownerId: actorId,
        title: input.title,
        slug,
        eventType: input.eventType,
        eventDate: input.eventDate,
        hostNames: input.hosts,
        welcomeMessage:
          input.welcomeMessage ||
          'მოგესალმებით! დაგვიტოვეთ თბილი სიტყვები და მოგონებები ❤️',
        coverImage: input.coverImage || DEFAULT_COVER,
        isModerated: false,
        isPrivate: false,
        passwordHash: null,
        theme: {
          themePreset: 'romantic',
          bgColor: '#FFFBFB',
          primaryColor: '#E11D48',
          fontStyle: 'serif',
          cardStyle: 'soft',
          buttonStyle: 'pill',
        },
        viewsByDay: {},
        viewsTotal: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (input.hasAlbum) {
      albumId = newId('al');
      await createOne(ALBUMS, albumId, {
        eventId: id,
        clientId: input.clientId,
        slug,
        title: input.title,
        welcomeMessage:
          input.welcomeMessage ||
          'გაგვიზიარეთ თქვენი ფოტოები და ვიდეოები ❤️',
        coverImage: input.coverImage || DEFAULT_COVER,
        limits: {
          uploadEnabled: true,
          allowImages: true,
          allowVideos: true,
          // 2 GB a file: comfortably above a long phone video, well under the
          // point where a single upload becomes unreasonable.
          maxFileSize: 2 * 1024 * 1024 * 1024,
          storageQuota: 0,
          expiresAt: null,
        },
        stats: { fileCount: 0, imageCount: 0, videoCount: 0, totalBytes: 0, lastUploadAt: null },
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
      });
    }

    const record: EventRecord = {
      id,
      clientId: input.clientId,
      title: input.title.trim(),
      slug,
      eventType: input.eventType,
      eventDate: input.eventDate,
      hosts: input.hosts.trim(),
      venue: input.venue?.trim() || undefined,
      status: 'PLANNED',
      hasGuestbook: input.hasGuestbook,
      hasAlbum: input.hasAlbum,
      guestbookId,
      albumId,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
    };

    const { id: _omit, ...data } = record;
    await createOne(EVENTS, id, data as unknown as Record<string, unknown>);
    return record;
  },

  async update(id: string, input: Partial<EventInput> & { status?: EventStatus }): Promise<void> {
    await updateOne(EVENTS, id, input as Record<string, unknown>);
  },

  /** Turning a product on after the fact creates it; turning it off only hides it. */
  async setProducts(
    event: EventRecord,
    products: { hasGuestbook: boolean; hasAlbum: boolean },
    actorId: string
  ): Promise<void> {
    const patch: Record<string, unknown> = { ...products };

    if (products.hasAlbum && !event.albumId) {
      const albumId = newId('al');
      const now = nowIso();
      await createOne(ALBUMS, albumId, {
        eventId: event.id,
        clientId: event.clientId,
        slug: event.slug,
        title: event.title,
        welcomeMessage: 'გაგვიზიარეთ თქვენი ფოტოები და ვიდეოები ❤️',
        coverImage: DEFAULT_COVER,
        limits: {
          uploadEnabled: true,
          allowImages: true,
          allowVideos: true,
          maxFileSize: 2 * 1024 * 1024 * 1024,
          storageQuota: 0,
          expiresAt: null,
        },
        stats: { fileCount: 0, imageCount: 0, videoCount: 0, totalBytes: 0, lastUploadAt: null },
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: actorId,
      });
      patch.albumId = albumId;
    }

    await updateOne(EVENTS, event.id, patch);
  },
};

export const albumService = {
  async get(id: string): Promise<Album | null> {
    return getOne<Album>(ALBUMS, id);
  },

  async getBySlug(slug: string): Promise<Album | null> {
    const found = await listWhere<Album>(ALBUMS, [where('slug', '==', slug.toLowerCase())]);
    return found[0] || null;
  },

  async list(): Promise<Album[]> {
    const all = await listWhere<Album>(ALBUMS);
    return all.sort(byNewest());
  },

  async listForClient(clientId: string): Promise<Album[]> {
    const all = await listWhere<Album>(ALBUMS, [where('clientId', '==', clientId)]);
    return all.sort(byNewest());
  },

  async update(id: string, patch: Partial<Album>): Promise<void> {
    await updateOne(ALBUMS, id, patch as Record<string, unknown>);
  },

  async setUploadEnabled(album: Album, enabled: boolean): Promise<void> {
    await updateOne(ALBUMS, album.id, { limits: { ...album.limits, uploadEnabled: enabled } });
  },

  async archive(id: string): Promise<void> {
    await updateOne(ALBUMS, id, { archivedAt: nowIso() });
  },

  async restore(id: string): Promise<void> {
    await updateOne(ALBUMS, id, { archivedAt: null });
  },
};
