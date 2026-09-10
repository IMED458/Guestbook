import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface ThemeSettings {
  themePreset: 'classic' | 'elegant' | 'minimal' | 'romantic' | 'dark' | 'luxury' | 'pastel';
  bgColor: string;
  primaryColor: string;
  fontStyle:
    | 'handwriting'
    | 'calligraphy'
    | 'classic_script'
    | 'nostalgia'
    | 'serif'
    | 'sans'
    | 'playfair'
    | 'nateli'
    | 'glaho'
    | 'mono';
  cardStyle: 'soft' | 'border' | 'elevated';
  buttonStyle: 'pill' | 'rounded' | 'minimal';
}

export interface GuestBook {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  eventType: 'wedding' | 'birthday' | 'party' | 'corporate' | 'hotel' | 'memorial' | 'other';
  eventDate: string;
  hostNames: string;
  welcomeMessage: string;
  coverImage: string;
  isModerated: boolean;
  isPrivate: boolean;
  password?: string;
  theme: ThemeSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  messageId: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Reaction {
  id: string;
  messageId: string;
  type: string; // e.g. '❤️', '🥰', '😂', '👏', '🎉'
  visitorId: string;
  createdAt: string;
}

export interface GuestMessage {
  id: string;
  guestBookId: string;
  name: string;
  email?: string; // Private, never shown publicly
  message: string;
  relationship?: string; // 'Family' | 'Friend' | 'Colleague' | 'Other'
  status: 'APPROVED' | 'PENDING' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
  media?: Media[];
  reactions?: Record<string, number>;
  userReactions?: string[]; // for the calling visitor
}

export interface GuestBookView {
  id: string;
  guestBookId: string;
  visitorId: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  guestBooks: GuestBook[];
  messages: (Omit<GuestMessage, 'media' | 'reactions' | 'userReactions'>)[];
  media: Media[];
  reactions: Reaction[];
  views: GuestBookView[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'guestbook_db.json');

class DatabaseService {
  private data: DatabaseSchema;
  private isLoaded = false;

  constructor() {
    this.data = {
      users: [],
      guestBooks: [],
      messages: [],
      media: [],
      reactions: [],
      views: []
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      } else {
        this.seedInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize database, loading defaults:', err);
      this.seedInitialData();
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  private seedInitialData() {
    const demoPasswordHash = bcrypt.hashSync('password123', 10);
    const demoUser: User = {
      id: 'usr_demo_admin_01',
      email: 'admin@guestbook.com',
      passwordHash: demoPasswordHash,
      name: 'Nika & Ana (Admin)',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };

    const demoBook: GuestBook = {
      id: 'gb_nika_ana_wedding_01',
      ownerId: demoUser.id,
      title: 'Nika & Ana Wedding',
      slug: 'wedding-nika-ana',
      eventType: 'wedding',
      eventDate: '2026-09-15',
      hostNames: 'Nika & Ana',
      welcomeMessage: 'Welcome to our wedding guest book ❤️ Leave us a message, memory or photo that we can cherish forever.',
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
      isModerated: false,
      isPrivate: false,
      theme: {
        themePreset: 'romantic',
        bgColor: '#FFFBFB',
        primaryColor: '#E11D48',
        fontStyle: 'serif',
        cardStyle: 'soft',
        buttonStyle: 'pill'
      },
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    };

    const messages = [
      {
        id: 'msg_01',
        guestBookId: demoBook.id,
        name: 'Elene & Giorgi',
        email: 'elene@example.com',
        message: 'თქვენს ცხოვრებაში დაიწყო ყველაზე ლამაზი თავი! გისურვებთ ულევ სიყვარულს, ბედნიერებას და ურთიერთგაგებას ყოველ ნაბიჯზე! ❤️🥂✨',
        relationship: 'Family',
        status: 'APPROVED' as const,
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: 'msg_02',
        guestBookId: demoBook.id,
        name: 'David Miller',
        email: 'david.m@example.com',
        message: 'To an incredible couple! So grateful to be part of your story and to celebrate this magical milestone with you both. Wishing you endless adventures, joy and mutual laughter! 🎉❤️',
        relationship: 'Friend',
        status: 'APPROVED' as const,
        createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 3600000).toISOString()
      },
      {
        id: 'msg_03',
        guestBookId: demoBook.id,
        name: 'Mariam Kalandadze',
        email: 'mariam@example.com',
        message: 'ანა და ნიკა, ულამაზესი წყვილი ხართ! ძალიან გვიხარია თქვენი ბედნიერება. მუდამ ასე იბრწყინეთ და ერთმანეთს სითბო არ მოაკლოთ! 🥰🍾',
        relationship: 'Colleague',
        status: 'APPROVED' as const,
        createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 18 * 3600000).toISOString()
      },
      {
        id: 'msg_04',
        guestBookId: demoBook.id,
        name: 'Luka & Sophie',
        email: 'luka@example.com',
        message: 'გილოცავთ მეგობრებო! საუკეთესო ცერემონია და დაუვიწყარი ენერგია იყო! მიყვარხართ ორივე მთელი გულით! 👏🕺💃',
        relationship: 'Friend',
        status: 'APPROVED' as const,
        createdAt: new Date(Date.now() - 28 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 28 * 3600000).toISOString()
      },
      {
        id: 'msg_05',
        guestBookId: demoBook.id,
        name: 'Nino Begadze',
        email: 'nino@example.com',
        message: 'საუკეთესო სურვილებით! ყოველი დღე იყოს სიყვარულით, ღიმილითა და ჰარმონიით სავსე. 🌸❤️',
        relationship: 'Family',
        status: 'APPROVED' as const,
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 48 * 3600000).toISOString()
      }
    ];

    const media: Media[] = [
      {
        id: 'med_01',
        messageId: 'msg_01',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: 'med_02',
        messageId: 'msg_03',
        type: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
        createdAt: new Date(Date.now() - 18 * 3600000).toISOString()
      }
    ];

    const reactions: Reaction[] = [
      { id: 'rx_01', messageId: 'msg_01', type: '❤️', visitorId: 'vis_seed_01', createdAt: new Date().toISOString() },
      { id: 'rx_02', messageId: 'msg_01', type: '🥰', visitorId: 'vis_seed_02', createdAt: new Date().toISOString() },
      { id: 'rx_03', messageId: 'msg_01', type: '🎉', visitorId: 'vis_seed_03', createdAt: new Date().toISOString() },
      { id: 'rx_04', messageId: 'msg_02', type: '👏', visitorId: 'vis_seed_04', createdAt: new Date().toISOString() },
      { id: 'rx_05', messageId: 'msg_02', type: '❤️', visitorId: 'vis_seed_05', createdAt: new Date().toISOString() },
      { id: 'rx_06', messageId: 'msg_03', type: '🥰', visitorId: 'vis_seed_06', createdAt: new Date().toISOString() },
      { id: 'rx_07', messageId: 'msg_04', type: '🎉', visitorId: 'vis_seed_07', createdAt: new Date().toISOString() }
    ];

    // Seed realistic views across last 7 days
    const views: GuestBookView[] = [];
    for (let i = 0; i < 7; i++) {
      const count = Math.floor(Math.random() * 15) + 12;
      for (let j = 0; j < count; j++) {
        views.push({
          id: `view_${i}_${j}`,
          guestBookId: demoBook.id,
          visitorId: `vis_history_${i}_${j}`,
          createdAt: new Date(Date.now() - (6 - i) * 86400000 - Math.random() * 36000000).toISOString()
        });
      }
    }

    this.data = {
      users: [demoUser],
      guestBooks: [demoBook],
      messages,
      media,
      reactions,
      views
    };
  }

  // --- User / Auth operations ---
  findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(email: string, passwordHash: string, name: string): User {
    const user: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: email.toLowerCase(),
      passwordHash,
      name,
      createdAt: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- GuestBook operations ---
  generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'guest-book';

    let slug = baseSlug;
    let counter = 2;
    while (this.data.guestBooks.some(gb => gb.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  getUserGuestBooks(userId: string): GuestBook[] {
    return this.data.guestBooks
      .filter(gb => gb.ownerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getGuestBookById(id: string): GuestBook | undefined {
    return this.data.guestBooks.find(gb => gb.id === id);
  }

  getGuestBookBySlug(slug: string): GuestBook | undefined {
    return this.data.guestBooks.find(gb => gb.slug.toLowerCase() === slug.toLowerCase());
  }

  createGuestBook(book: Omit<GuestBook, 'id' | 'createdAt' | 'updatedAt' | 'slug'> & { slug?: string }): GuestBook {
    const slug = book.slug ? book.slug : this.generateSlug(book.title);
    const newBook: GuestBook = {
      ...book,
      id: `gb_${crypto.randomUUID().slice(0, 10)}`,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.guestBooks.push(newBook);
    this.save();
    return newBook;
  }

  updateGuestBook(id: string, updates: Partial<GuestBook>): GuestBook | null {
    const idx = this.data.guestBooks.findIndex(gb => gb.id === id);
    if (idx === -1) return null;
    
    // If slug is being updated, verify uniqueness
    if (updates.slug && updates.slug !== this.data.guestBooks[idx].slug) {
      const exists = this.data.guestBooks.some(gb => gb.id !== id && gb.slug === updates.slug);
      if (exists) {
        updates.slug = `${updates.slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    this.data.guestBooks[idx] = {
      ...this.data.guestBooks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.guestBooks[idx];
  }

  deleteGuestBook(id: string): boolean {
    const initialLen = this.data.guestBooks.length;
    this.data.guestBooks = this.data.guestBooks.filter(gb => gb.id !== id);
    if (this.data.guestBooks.length === initialLen) return false;

    // Cascade delete messages, media, reactions, views
    const msgIds = this.data.messages.filter(m => m.guestBookId === id).map(m => m.id);
    this.data.messages = this.data.messages.filter(m => m.guestBookId !== id);
    this.data.media = this.data.media.filter(med => !msgIds.includes(med.messageId));
    this.data.reactions = this.data.reactions.filter(rx => !msgIds.includes(rx.messageId));
    this.data.views = this.data.views.filter(v => v.guestBookId !== id);

    this.save();
    return true;
  }

  // --- Views ---
  recordView(guestBookId: string, visitorId: string): void {
    const recent = this.data.views.find(
      v => v.guestBookId === guestBookId &&
           v.visitorId === visitorId &&
           (Date.now() - new Date(v.createdAt).getTime()) < 30 * 60 * 1000 // 30 min deduplication
    );
    if (!recent) {
      this.data.views.push({
        id: `view_${crypto.randomUUID().slice(0, 8)}`,
        guestBookId,
        visitorId,
        createdAt: new Date().toISOString()
      });
      this.save();
    }
  }

  // --- Messages operations ---
  getMessages(guestBookId: string, visitorId?: string, includeHidden = false): GuestMessage[] {
    let list = this.data.messages.filter(m => m.guestBookId === guestBookId);
    if (!includeHidden) {
      list = list.filter(m => m.status === 'APPROVED');
    }

    return list.map(m => {
      const media = this.data.media.filter(med => med.messageId === m.id);
      const msgReactions = this.data.reactions.filter(rx => rx.messageId === m.id);

      const reactionCounts: Record<string, number> = {};
      const userReactions: string[] = [];

      msgReactions.forEach(rx => {
        reactionCounts[rx.type] = (reactionCounts[rx.type] || 0) + 1;
        if (visitorId && rx.visitorId === visitorId) {
          userReactions.push(rx.type);
        }
      });

      return {
        ...m,
        media,
        reactions: reactionCounts,
        userReactions
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllGuestBookMedia(guestBookId: string): (Media & { guestName: string; messageDate: string })[] {
    const bookMsgIds = new Map(
      this.data.messages
        .filter(m => m.guestBookId === guestBookId)
        .map(m => [m.id, { name: m.name, date: m.createdAt }])
    );

    return this.data.media
      .filter(med => bookMsgIds.has(med.messageId))
      .map(med => {
        const msgInfo = bookMsgIds.get(med.messageId)!;
        return {
          ...med,
          guestName: msgInfo.name,
          messageDate: msgInfo.date
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createMessage(
    guestBookId: string,
    data: {
      name: string;
      email?: string;
      message: string;
      relationship?: string;
      mediaUrls?: { type: 'IMAGE' | 'VIDEO'; url: string }[];
      reactionType?: string;
    },
    visitorId: string,
    isModerated: boolean
  ): GuestMessage {
    const id = `msg_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();
    const status = isModerated ? 'PENDING' : 'APPROVED';

    const newMsg = {
      id,
      guestBookId,
      name: data.name.trim(),
      email: data.email?.trim() || undefined,
      message: data.message.trim(),
      relationship: data.relationship?.trim() || undefined,
      status: status as 'APPROVED' | 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    this.data.messages.unshift(newMsg);

    const createdMedia: Media[] = [];
    if (data.mediaUrls && Array.isArray(data.mediaUrls)) {
      for (const item of data.mediaUrls) {
        if (item.url) {
          const med: Media = {
            id: `med_${crypto.randomUUID().slice(0, 8)}`,
            messageId: id,
            type: item.type || 'IMAGE',
            url: item.url,
            createdAt: now
          };
          this.data.media.push(med);
          createdMedia.push(med);
        }
      }
    }

    if (data.reactionType) {
      this.data.reactions.push({
        id: `rx_${crypto.randomUUID().slice(0, 8)}`,
        messageId: id,
        type: data.reactionType,
        visitorId,
        createdAt: now
      });
    }

    this.save();

    return {
      ...newMsg,
      media: createdMedia,
      reactions: data.reactionType ? { [data.reactionType]: 1 } : {},
      userReactions: data.reactionType ? [data.reactionType] : []
    };
  }

  getMessageById(messageId: string): GuestMessage | null {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return null;
    const media = this.data.media.filter(med => med.messageId === msg.id);
    const reactions = this.data.reactions.filter(rx => rx.messageId === msg.id);
    const reactionCounts: Record<string, number> = {};
    reactions.forEach(rx => {
      reactionCounts[rx.type] = (reactionCounts[rx.type] || 0) + 1;
    });
    return {
      ...msg,
      media,
      reactions: reactionCounts
    };
  }

  getAdminMessages(
    guestBookId: string,
    options: {
      status?: string;
      search?: string;
      sort?: string;
      hasPhoto?: boolean;
      hasVideo?: boolean;
    } = {}
  ): GuestMessage[] {
    let list = this.getMessages(guestBookId, undefined, true);

    if (options.status && options.status !== 'ALL') {
      list = list.filter(m => m.status === options.status);
    }

    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        m => m.name.toLowerCase().includes(q) ||
             m.message.toLowerCase().includes(q) ||
             (m.email && m.email.toLowerCase().includes(q))
      );
    }

    if (options.hasPhoto) {
      list = list.filter(m => m.media?.some(med => med.type === 'IMAGE'));
    }

    if (options.hasVideo) {
      list = list.filter(m => m.media?.some(med => med.type === 'VIDEO'));
    }

    if (options.sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (options.sort === 'reactions') {
      list.sort((a, b) => {
        const countA = a.reactions ? Object.values(a.reactions).reduce((sum, n) => sum + n, 0) : 0;
        const countB = b.reactions ? Object.values(b.reactions).reduce((sum, n) => sum + n, 0) : 0;
        return countB - countA;
      });
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }

  getAllMessagesForExport(guestBookId: string): GuestMessage[] {
    return this.getMessages(guestBookId, undefined, true);
  }

  getMediaForGuestBook(guestBookId: string) {
    return this.getAllGuestBookMedia(guestBookId);
  }

  updateMessageStatus(messageId: string, status: 'APPROVED' | 'PENDING' | 'HIDDEN'): boolean {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) return false;
    msg.status = status;
    msg.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  deleteMessage(messageId: string): boolean {
    const initialLen = this.data.messages.length;
    this.data.messages = this.data.messages.filter(m => m.id !== messageId);
    if (this.data.messages.length === initialLen) return false;

    this.data.media = this.data.media.filter(med => med.messageId !== messageId);
    this.data.reactions = this.data.reactions.filter(rx => rx.messageId !== messageId);
    this.save();
    return true;
  }

  toggleReaction(messageId: string, reactionType: string, visitorId: string): { added: boolean; count: number } {
    const existingIndex = this.data.reactions.findIndex(
      rx => rx.messageId === messageId && rx.type === reactionType && rx.visitorId === visitorId
    );

    let added = false;
    if (existingIndex !== -1) {
      // Remove reaction (toggle off)
      this.data.reactions.splice(existingIndex, 1);
      added = false;
    } else {
      // Add reaction
      this.data.reactions.push({
        id: `rx_${crypto.randomUUID().slice(0, 8)}`,
        messageId,
        type: reactionType,
        visitorId,
        createdAt: new Date().toISOString()
      });
      added = true;
    }

    this.save();

    const count = this.data.reactions.filter(rx => rx.messageId === messageId && rx.type === reactionType).length;
    return { added, count };
  }

  // --- Statistics & Analytics ---
  getDashboardStats(guestBookId: string) {
    const messages = this.data.messages.filter(m => m.guestBookId === guestBookId);
    const msgIds = new Set(messages.map(m => m.id));

    const photos = this.data.media.filter(m => msgIds.has(m.messageId) && m.type === 'IMAGE').length;
    const videos = this.data.media.filter(m => msgIds.has(m.messageId) && m.type === 'VIDEO').length;
    const reactionsCount = this.data.reactions.filter(r => msgIds.has(r.messageId)).length;
    const viewsCount = this.data.views.filter(v => v.guestBookId === guestBookId).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const messagesToday = messages.filter(m => m.createdAt.startsWith(todayStr)).length;
    const pendingMessages = messages.filter(m => m.status === 'PENDING').length;

    // Last 7 days breakdown
    const dayLabels: string[] = [];
    const visitorsByDay: { date: string; label: string; count: number }[] = [];
    const messagesByDay: { date: string; label: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      const dayViews = this.data.views.filter(
        v => v.guestBookId === guestBookId && v.createdAt.startsWith(dateStr)
      ).length;

      const dayMsgs = messages.filter(
        m => m.createdAt.startsWith(dateStr)
      ).length;

      visitorsByDay.push({ date: dateStr, label, count: dayViews });
      messagesByDay.push({ date: dateStr, label, count: dayMsgs });
    }

    return {
      totalMessages: messages.length,
      totalPhotos: photos,
      totalVideos: videos,
      totalReactions: reactionsCount,
      guestBookViews: viewsCount,
      messagesToday,
      pendingMessages,
      visitorsByDay,
      messagesByDay
    };
  }
}

export const db = new DatabaseService();
