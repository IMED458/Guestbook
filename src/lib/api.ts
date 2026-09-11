import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import QRCode from 'qrcode';

import { auth, COL, db } from './firebase.ts';
import { uploadToCloudinary, type UploadedMedia } from './cloudinary.ts';
import { allows } from './consent.ts';
import { slugify } from './slug.ts';
import { DashboardStats, GuestBook, GuestMessage, Media, User } from '../types.ts';

const VISITOR_ID_KEY = 'gb_visitor_id';
const VIEW_MARK_PREFIX = 'gb_viewed_';
const UNLOCK_PREFIX = 'gb_unlocked_';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `vis_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

/** Kept for backwards compatibility — Firebase Auth owns the session now. */
export function getToken(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}
export function setToken(_token: string | null): void {
  /* no-op: session lifetime is managed by Firebase Auth persistence */
}

function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Host',
  };
}

/** Resolve the restored session exactly once, so `me()` never races the SDK. */
let authReady: Promise<FirebaseUser | null> | null = null;
function waitForAuth(): Promise<FirebaseUser | null> {
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(u);
      });
    });
  }
  return authReady;
}

/**
 * On a cold page load `auth.currentUser` is still null while the SDK restores
 * the persisted session, so every caller must wait for that to settle before
 * deciding nobody is signed in.
 */
async function requireUid(): Promise<string> {
  const uid = auth.currentUser?.uid || (await waitForAuth())?.uid;
  if (!uid) throw new Error('Authentication required');
  return uid;
}

function friendlyAuthError(err: any): Error {
  const code = String(err?.code || '');
  if (code.includes('email-already-in-use')) return new Error('An account with this email already exists');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return new Error('Invalid email or password');
  if (code.includes('weak-password')) return new Error('Password must be at least 6 characters');
  if (code.includes('invalid-email')) return new Error('Please enter a valid email address');
  if (code.includes('operation-not-allowed'))
    return new Error('Email/Password sign-in is disabled in the Firebase console.');
  if (code.includes('network-request-failed')) return new Error('Network error. Check your connection.');
  return new Error(err?.message || 'Authentication failed');
}

function normaliseGuestBook(id: string, data: any): GuestBook {
  const { passwordHash, viewsByDay, viewsTotal, ...rest } = data || {};
  return { ...(rest as GuestBook), id };
}

function normaliseMessage(id: string, data: any): GuestMessage {
  return {
    id,
    guestBookId: data.guestBookId,
    name: data.name,
    email: data.email,
    message: data.message,
    relationship: data.relationship,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    media: (data.media || []) as Media[],
    reactions: (data.reactions || {}) as Record<string, number>,
    userReactions: [],
  };
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/* ------------------------------------------------------------------ */
/* Firestore reads                                                     */
/* ------------------------------------------------------------------ */

async function fetchGuestBookBySlug(slug: string): Promise<{ id: string; data: any } | null> {
  const snap = await getDocs(
    query(collection(db, COL.guestBooks), where('slug', '==', slug.toLowerCase()))
  );
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, data: first.data() };
}

/**
 * Security rules are not filters: Firestore rejects a list query outright
 * unless the query itself proves every matching document is readable. The
 * messages rule allows `status == 'APPROVED' || ownerId == uid`, so a public
 * read must constrain status and an owner read must constrain ownerId —
 * filtering client-side instead would fail with permission-denied.
 *
 * Both are equality-only queries, so Firestore's automatic single-field
 * indexes serve them and no composite index is needed. Ordering is done
 * client-side.
 */
async function fetchMessages(
  guestBookId: string,
  opts: { approvedOnly: boolean }
): Promise<GuestMessage[]> {
  const clauses = [where('guestBookId', '==', guestBookId)];

  if (opts.approvedOnly) {
    clauses.push(where('status', '==', 'APPROVED'));
  } else {
    clauses.push(where('ownerId', '==', await requireUid()));
  }

  const snap = await getDocs(query(collection(db, COL.messages), ...clauses));
  return snap.docs.map((d) => normaliseMessage(d.id, d.data())).sort(byNewest);
}

/** The visitor's own reactions for a whole guest book, in a single read. */
async function fetchVisitorReactions(guestBookId: string): Promise<Record<string, string[]>> {
  try {
    const ref = doc(db, COL.guestBooks, guestBookId, 'reactors', getVisitorId());
    const snap = await getDoc(ref);
    return snap.exists() ? ((snap.data().byMessage || {}) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function attachVisitorReactions(
  messages: GuestMessage[],
  byMessage: Record<string, string[]>
): GuestMessage[] {
  return messages.map((m) => ({ ...m, userReactions: byMessage[m.id] || [] }));
}

/** One view per visitor per 30 minutes, counted into a per-day map. */
async function recordView(guestBookId: string): Promise<void> {
  // Page-view counting is the one analytics purpose on this site, so it does
  // not run at all until the visitor has opted in.
  if (!allows('analytics')) return;

  const key = `${VIEW_MARK_PREFIX}${guestBookId}`;
  const last = Number(localStorage.getItem(key) || 0);
  if (Date.now() - last < 30 * 60 * 1000) return;
  localStorage.setItem(key, String(Date.now()));

  const today = new Date().toISOString().slice(0, 10);
  try {
    await updateDoc(doc(db, COL.guestBooks, guestBookId), {
      [`viewsByDay.${today}`]: increment(1),
      viewsTotal: increment(1),
    });
  } catch {
    // Analytics must never block reading the guest book.
  }
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);

  let slug = base;
  let counter = 2;
  // Collisions are rare; a handful of point lookups is plenty.
  for (let i = 0; i < 20; i++) {
    const existing = await fetchGuestBookBySlug(slug);
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter++}`;
  }
  return `${base}-${Date.now().toString().slice(-5)}`;
}

/* ------------------------------------------------------------------ */
/* Demo content                                                        */
/* ------------------------------------------------------------------ */

const DEMO_EMAIL = 'admin@guestbook.com';
const DEMO_PASSWORD = 'password123';
const DEMO_SLUG = 'wedding-nika-ana';

async function seedDemoGuestBook(ownerId: string): Promise<void> {
  const existing = await fetchGuestBookBySlug(DEMO_SLUG);
  if (existing) return;

  const now = Date.now();
  const bookId = newId('gb');

  // A week of plausible traffic so the analytics tab is not empty.
  const viewsByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
    viewsByDay[day] = 12 + Math.floor(Math.random() * 15);
  }

  await setDoc(doc(db, COL.guestBooks, bookId), {
    ownerId,
    title: 'Nika & Ana Wedding',
    slug: DEMO_SLUG,
    eventType: 'wedding',
    eventDate: '2026-09-15',
    hostNames: 'Nika & Ana',
    welcomeMessage:
      'Welcome to our wedding guest book ❤️ Leave us a message, memory or photo that we can cherish forever.',
    coverImage:
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
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
    viewsByDay,
    viewsTotal: Object.values(viewsByDay).reduce((a, b) => a + b, 0),
    createdAt: new Date(now - 14 * 86400000).toISOString(),
    updatedAt: new Date(now).toISOString(),
  });

  const batch = writeBatch(db);

  const demoMessages = [
    {
      name: 'Elene & Giorgi',
      message:
        'თქვენს ცხოვრებაში დაიწყო ყველაზე ლამაზი თავი! გისურვებთ ულევ სიყვარულს, ბედნიერებას და ურთიერთგაგებას ყოველ ნაბიჯზე! ❤️🥂✨',
      relationship: 'Family',
      hoursAgo: 4,
      reactions: { '❤️': 3, '🥰': 2, '🎉': 1 },
      media: [
        {
          id: newId('med'),
          type: 'IMAGE' as const,
          url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
        },
      ],
    },
    {
      name: 'David Miller',
      message:
        'To an incredible couple! So grateful to be part of your story and to celebrate this magical milestone with you both. Wishing you endless adventures, joy and mutual laughter! 🎉❤️',
      relationship: 'Friend',
      hoursAgo: 8,
      reactions: { '👏': 2, '❤️': 1 },
      media: [],
    },
    {
      name: 'Mariam Kalandadze',
      message:
        'ანა და ნიკა, ულამაზესი წყვილი ხართ! ძალიან გვიხარია თქვენი ბედნიერება. მუდამ ასე იბრწყინეთ და ერთმანეთს სითბო არ მოაკლოთ! 🥰🍾',
      relationship: 'Colleague',
      hoursAgo: 18,
      reactions: { '🥰': 4 },
      media: [
        {
          id: newId('med'),
          type: 'IMAGE' as const,
          url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
        },
      ],
    },
    {
      name: 'Luka & Sophie',
      message:
        'გილოცავთ მეგობრებო! საუკეთესო ცერემონია და დაუვიწყარი ენერგია იყო! მიყვარხართ ორივე მთელი გულით! 👏🕺💃',
      relationship: 'Friend',
      hoursAgo: 28,
      reactions: { '🎉': 2 },
      media: [],
    },
    {
      name: 'Nino Begadze',
      message:
        'საუკეთესო სურვილებით! ყოველი დღე იყოს სიყვარულით, ღიმილითა და ჰარმონიით სავსე. 🌸❤️',
      relationship: 'Family',
      hoursAgo: 48,
      reactions: {},
      media: [],
    },
  ];

  demoMessages.forEach((m) => {
    const stamp = new Date(now - m.hoursAgo * 3600000).toISOString();
    batch.set(doc(db, COL.messages, newId('msg')), {
      guestBookId: bookId,
      ownerId,
      name: m.name,
      message: m.message,
      relationship: m.relationship,
      status: 'APPROVED',
      media: m.media.map((med) => ({ ...med, createdAt: stamp })),
      reactions: m.reactions,
      createdAt: stamp,
      updatedAt: stamp,
    });
  });

  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Public API — same surface the components already consume            */
/* ------------------------------------------------------------------ */

export const api = {
  auth: {
    async login(email: string, password: string): Promise<{ token: string; user: User }> {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        return { token: cred.user.uid, user: toUser(cred.user) };
      } catch (err) {
        throw friendlyAuthError(err);
      }
    },

    async register(email: string, password: string, name: string): Promise<{ token: string; user: User }> {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        return { token: cred.user.uid, user: { ...toUser(cred.user), name: name.trim() } };
      } catch (err) {
        throw friendlyAuthError(err);
      }
    },

    async demoLogin(): Promise<{ token: string; user: User }> {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      } catch (err: any) {
        if (String(err?.code).includes('user-not-found') || String(err?.code).includes('invalid-credential')) {
          try {
            cred = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
            await updateProfile(cred.user, { displayName: 'Nika & Ana (Admin)' });
          } catch (createErr) {
            throw friendlyAuthError(createErr);
          }
        } else {
          throw friendlyAuthError(err);
        }
      }

      try {
        await seedDemoGuestBook(cred.user.uid);
      } catch (seedErr) {
        // Sign-in still succeeds, but the reason must not vanish silently.
        console.error('Could not seed the demo guest book:', seedErr);
      }

      return {
        token: cred.user.uid,
        user: { ...toUser(cred.user), name: cred.user.displayName || 'Nika & Ana (Admin)' },
      };
    },

    async me(): Promise<{ user: User }> {
      const fbUser = auth.currentUser || (await waitForAuth());
      if (!fbUser) throw new Error('Not signed in');
      return { user: toUser(fbUser) };
    },

    logout() {
      void signOut(auth);
    },
  },

  guestBooks: {
    async list(): Promise<GuestBook[]> {
      const uid = await requireUid();
      const snap = await getDocs(
        query(collection(db, COL.guestBooks), where('ownerId', '==', uid))
      );
      return snap.docs.map((d) => normaliseGuestBook(d.id, d.data())).sort(byNewest);
    },

    async get(id: string): Promise<GuestBook> {
      const snap = await getDoc(doc(db, COL.guestBooks, id));
      if (!snap.exists()) throw new Error('Guest book not found');
      return normaliseGuestBook(snap.id, snap.data());
    },

    async getBySlug(
      slug: string,
      password?: string
    ): Promise<{ guestBook: GuestBook; messages: GuestMessage[]; isOwner: boolean }> {
      const found = await fetchGuestBookBySlug(slug);
      if (!found) throw new Error('Guest book not found');

      // Wait for the restored session, or opening your own book from a fresh
      // tab would report you as a stranger.
      const viewer = auth.currentUser || (await waitForAuth());
      const isOwner = Boolean(viewer && viewer.uid === found.data.ownerId);
      const unlockKey = `${UNLOCK_PREFIX}${found.id}`;

      if (found.data.isPrivate && !isOwner) {
        const alreadyUnlocked = localStorage.getItem(unlockKey) === found.data.passwordHash;
        if (!alreadyUnlocked) {
          const attemptHash = password ? await sha256(password) : null;
          if (!attemptHash || attemptHash !== found.data.passwordHash) {
            throw new Error('This guest book is password protected.');
          }
          localStorage.setItem(unlockKey, attemptHash);
        }
      }

      void recordView(found.id);

      // The public wall always shows approved messages only — moderation
      // queues live in the dashboard.
      const [messages, visitorReactions] = await Promise.all([
        fetchMessages(found.id, { approvedOnly: true }),
        fetchVisitorReactions(found.id),
      ]);

      return {
        guestBook: normaliseGuestBook(found.id, found.data),
        messages: attachVisitorReactions(messages, visitorReactions),
        isOwner,
      };
    },

    async verifyPassword(slug: string, password: string): Promise<{ valid: boolean }> {
      const found = await fetchGuestBookBySlug(slug);
      if (!found) throw new Error('Guest book not found');
      if (!found.data.isPrivate) return { valid: true };

      const attemptHash = await sha256(password);
      if (attemptHash !== found.data.passwordHash) throw new Error('Incorrect password');

      localStorage.setItem(`${UNLOCK_PREFIX}${found.id}`, attemptHash);
      return { valid: true };
    },

    async create(data: Partial<GuestBook>): Promise<GuestBook> {
      const uid = await requireUid();
      const now = new Date().toISOString();
      const id = newId('gb');
      const slug = await uniqueSlug(data.title || 'guest book');

      const payload = {
        ownerId: uid,
        title: data.title || 'Guest Book',
        slug,
        eventType: data.eventType || 'other',
        eventDate: data.eventDate || now.slice(0, 10),
        hostNames: data.hostNames || '',
        welcomeMessage:
          data.welcomeMessage || 'Welcome to our guest book! Leave us a warm message and memory.',
        coverImage:
          data.coverImage ||
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
        theme: data.theme,
        isModerated: Boolean(data.isModerated),
        isPrivate: Boolean(data.isPrivate),
        passwordHash:
          data.isPrivate && data.password ? await sha256(data.password) : null,
        viewsByDay: {},
        viewsTotal: 0,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, COL.guestBooks, id), payload);
      return normaliseGuestBook(id, payload);
    },

    async update(id: string, updates: Partial<GuestBook>): Promise<GuestBook> {
      await requireUid();
      const { id: _ignored, password, slug, ...rest } = updates as any;

      const payload: Record<string, any> = { ...rest, updatedAt: new Date().toISOString() };

      if (slug) {
        payload.slug = await uniqueSlug(slug, id);
      }
      if (password !== undefined) {
        payload.passwordHash = password ? await sha256(password) : null;
      }
      if (updates.isPrivate === false) {
        payload.passwordHash = null;
      }

      await updateDoc(doc(db, COL.guestBooks, id), payload);
      return api.guestBooks.get(id);
    },

    async delete(id: string): Promise<{ success: boolean }> {
      const uid = await requireUid();
      const messages = await getDocs(
        query(
          collection(db, COL.messages),
          where('guestBookId', '==', id),
          where('ownerId', '==', uid)
        )
      );
      const emails = await getDocs(
        query(
          collection(db, COL.messageEmails),
          where('guestBookId', '==', id),
          where('ownerId', '==', uid)
        )
      );

      const batch = writeBatch(db);
      messages.docs.forEach((d) => batch.delete(d.ref));
      emails.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, COL.guestBooks, id));
      await batch.commit();

      return { success: true };
    },

    async getStats(id: string): Promise<DashboardStats> {
      const [bookSnap, messages] = await Promise.all([
        getDoc(doc(db, COL.guestBooks, id)),
        fetchMessages(id, { approvedOnly: false }),
      ]);

      const viewsByDay: Record<string, number> = bookSnap.exists()
        ? bookSnap.data().viewsByDay || {}
        : {};

      const allMedia = messages.flatMap((m) => m.media || []);
      const todayStr = new Date().toISOString().slice(0, 10);

      const visitorsByDay: DashboardStats['visitorsByDay'] = [];
      const messagesByDay: DashboardStats['messagesByDay'] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        visitorsByDay.push({ date: dateStr, label, count: viewsByDay[dateStr] || 0 });
        messagesByDay.push({
          date: dateStr,
          label,
          count: messages.filter((m) => m.createdAt.startsWith(dateStr)).length,
        });
      }

      return {
        totalMessages: messages.length,
        totalPhotos: allMedia.filter((m) => m.type === 'IMAGE').length,
        totalVideos: allMedia.filter((m) => m.type === 'VIDEO').length,
        totalReactions: messages.reduce(
          (sum, m) => sum + Object.values(m.reactions || {}).reduce((a, b) => a + b, 0),
          0
        ),
        guestBookViews: Object.values(viewsByDay).reduce((a, b) => a + b, 0),
        messagesToday: messages.filter((m) => m.createdAt.startsWith(todayStr)).length,
        pendingMessages: messages.filter((m) => m.status === 'PENDING').length,
        visitorsByDay,
        messagesByDay,
      };
    },

    async getMedia(id: string): Promise<(Media & { guestName: string; messageDate: string })[]> {
      const messages = await fetchMessages(id, { approvedOnly: false });
      return messages
        .flatMap((m) =>
          (m.media || []).map((med) => ({
            ...med,
            messageId: m.id,
            guestName: m.name,
            messageDate: m.createdAt,
          }))
        )
        .sort((a, b) => new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime());
    },
  },

  messages: {
    async listAdmin(
      guestBookId: string,
      params: {
        status?: string;
        search?: string;
        sort?: string;
        hasPhoto?: boolean;
        hasVideo?: boolean;
      } = {}
    ): Promise<GuestMessage[]> {
      let list = await fetchMessages(guestBookId, { approvedOnly: false });

      // Private emails live in their own collection so guests can never read them.
      try {
        const ownerId = await requireUid();
        const emailSnap = await getDocs(
          query(
            collection(db, COL.messageEmails),
            where('guestBookId', '==', guestBookId),
            where('ownerId', '==', ownerId)
          )
        );
        const emails = new Map(emailSnap.docs.map((d) => [d.id, d.data().email as string]));
        list = list.map((m) => (emails.has(m.id) ? { ...m, email: emails.get(m.id) } : m));
      } catch {
        // Emails are a nice-to-have in the moderation table.
      }

      if (params.status && params.status !== 'ALL') {
        list = list.filter((m) => m.status === params.status);
      }

      if (params.search?.trim()) {
        const q = params.search.toLowerCase().trim();
        list = list.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.message.toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q)
        );
      }

      if (params.hasPhoto) list = list.filter((m) => m.media?.some((med) => med.type === 'IMAGE'));
      if (params.hasVideo) list = list.filter((m) => m.media?.some((med) => med.type === 'VIDEO'));

      if (params.sort === 'oldest') {
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (params.sort === 'reactions') {
        const total = (m: GuestMessage) =>
          Object.values(m.reactions || {}).reduce((a, b) => a + b, 0);
        list.sort((a, b) => total(b) - total(a));
      } else {
        list.sort(byNewest);
      }

      return list;
    },

    async submit(
      slug: string,
      data: {
        name: string;
        email?: string;
        message: string;
        relationship?: string;
        mediaUrls?: { type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string }[];
        reactionType?: string;
      }
    ): Promise<{ message: GuestMessage; isModerated: boolean; successNotice: string }> {
      if (!data.name?.trim()) throw new Error('Name is required');
      if (!data.message?.trim()) throw new Error('Message is required');

      const found = await fetchGuestBookBySlug(slug);
      if (!found) throw new Error('Guest book not found');

      const now = new Date().toISOString();
      const messageId = newId('msg');
      const isModerated = Boolean(found.data.isModerated);
      const reaction = data.reactionType || '❤️';

      const media: Media[] = (data.mediaUrls || [])
        .filter((m) => m.url)
        .map((m) => ({
          id: newId('med'),
          messageId,
          type: m.type || 'IMAGE',
          url: m.url,
          ...(m.thumbnailUrl ? { thumbnailUrl: m.thumbnailUrl } : {}),
          createdAt: now,
        }));

      const payload = {
        guestBookId: found.id,
        ownerId: found.data.ownerId,
        name: data.name.trim(),
        message: data.message.trim(),
        relationship: data.relationship?.trim() || 'Friend',
        status: isModerated ? 'PENDING' : 'APPROVED',
        media,
        reactions: { [reaction]: 1 },
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, COL.messages, messageId), payload);

      if (data.email?.trim()) {
        try {
          await setDoc(doc(db, COL.messageEmails, messageId), {
            guestBookId: found.id,
            ownerId: found.data.ownerId,
            email: data.email.trim(),
            createdAt: now,
          });
        } catch {
          // An unstored optional email must not fail the whole submission.
        }
      }

      try {
        await setDoc(
          doc(db, COL.guestBooks, found.id, 'reactors', getVisitorId()),
          { byMessage: { [messageId]: [reaction] } },
          { merge: true }
        );
      } catch {
        // Reaction bookkeeping is best-effort.
      }

      return {
        message: {
          ...(payload as unknown as GuestMessage),
          id: messageId,
          email: data.email?.trim(),
          userReactions: [reaction],
        },
        isModerated,
        successNotice: isModerated
          ? 'Thank you! Your message has been submitted and is awaiting host approval ❤️'
          : 'Thank you! Your message has been added to the guest book ❤️',
      };
    },

    async updateStatus(
      messageId: string,
      status: 'APPROVED' | 'PENDING' | 'HIDDEN'
    ): Promise<{ success: boolean; status: string }> {
      await requireUid();
      await updateDoc(doc(db, COL.messages, messageId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, status };
    },

    async delete(messageId: string): Promise<{ success: boolean }> {
      await requireUid();
      await deleteDoc(doc(db, COL.messages, messageId));
      try {
        await deleteDoc(doc(db, COL.messageEmails, messageId));
      } catch {
        // No stored email for this message.
      }
      return { success: true };
    },

    async toggleReaction(
      messageId: string,
      reactionType: string
    ): Promise<{ added: boolean; count: number }> {
      const msgRef = doc(db, COL.messages, messageId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) throw new Error('Message not found');

      const guestBookId = msgSnap.data().guestBookId as string;
      const reactorRef = doc(db, COL.guestBooks, guestBookId, 'reactors', getVisitorId());

      return runTransaction(db, async (tx) => {
        const [msg, reactor] = await Promise.all([tx.get(msgRef), tx.get(reactorRef)]);
        if (!msg.exists()) throw new Error('Message not found');

        const byMessage = (reactor.exists() ? reactor.data().byMessage : {}) as Record<string, string[]>;
        const mine = byMessage[messageId] || [];
        const counts = { ...((msg.data().reactions || {}) as Record<string, number>) };
        const added = !mine.includes(reactionType);

        if (added) {
          counts[reactionType] = (counts[reactionType] || 0) + 1;
          byMessage[messageId] = [...mine, reactionType];
        } else {
          counts[reactionType] = Math.max(0, (counts[reactionType] || 1) - 1);
          if (counts[reactionType] === 0) delete counts[reactionType];
          byMessage[messageId] = mine.filter((r) => r !== reactionType);
        }

        tx.update(msgRef, { reactions: counts });
        tx.set(reactorRef, { byMessage }, { merge: true });

        return { added, count: counts[reactionType] || 0 };
      });
    },
  },

  qrcode: {
    async getPng(url: string): Promise<string> {
      return QRCode.toDataURL(url, {
        margin: 2,
        width: 512,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
    },

    async getSvg(url: string): Promise<string> {
      return QRCode.toString(url, {
        type: 'svg',
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
    },
  },

  upload: {
    /** Upload a real File to Cloudinary (images and videos). */
    async uploadFile(
      file: File,
      onProgress?: (percent: number) => void
    ): Promise<UploadedMedia> {
      return uploadToCloudinary(file, onProgress);
    },
  },
};
