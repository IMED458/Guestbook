import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { db, GuestBook } from './db.ts';

const AUTH_SECRET = process.env.AUTH_SECRET || 'digital-guest-book-secure-auth-secret-key-2026';

// Lightweight secure JWT helper using native crypto
export function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createApiApp(): express.Express {
  const app = express();

  // Increase payload limit for photos / media base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Visitor ID middleware for abuse prevention and reaction deduplication
  app.use((req, res, next) => {
    let visitorId = req.headers['x-visitor-id'] as string;
    if (!visitorId) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
      visitorId = `vis_${crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16)}`;
    }
    (req as any).visitorId = visitorId;
    next();
  });

  // Auth helper middleware
  const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const user = db.findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    (req as any).user = user;
    next();
  };

  // Optional auth middleware (attaches user if token present)
  const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      if (payload && payload.userId) {
        (req as any).user = db.findUserById(payload.userId);
      }
    }
    next();
  };

  // ----------------------------------------------------
  // AUTH ROUTES
  // ----------------------------------------------------
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const existing = db.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = db.createUser(email, passwordHash, name);
      const token = signToken({ userId: user.id, email: user.email });

      return res.status(201).json({
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const user = db.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken({ userId: user.id, email: user.email });
      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  app.post('/api/auth/demo', (req, res) => {
    try {
      const demoUser = db.findUserByEmail('admin@guestbook.com');
      if (!demoUser) {
        return res.status(404).json({ error: 'Demo user not available' });
      }
      const token = signToken({ userId: demoUser.id, email: demoUser.email });
      return res.json({
        token,
        user: { id: demoUser.id, email: demoUser.email, name: demoUser.name }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Demo login failed' });
    }
  });

  app.get('/api/auth/me', authenticate, (req, res) => {
    const user = (req as any).user;
    return res.json({
      user: { id: user.id, email: user.email, name: user.name }
    });
  });

  // ----------------------------------------------------
  // GUEST BOOK MANAGEMENT (ADMIN)
  // ----------------------------------------------------
  const isBookOwner = (book: any, userId: string) => Boolean(book && (book.ownerId === userId || book.userId === userId));

  app.get('/api/guestbooks', authenticate, (req, res) => {
    const user = (req as any).user;
    const books = db.getUserGuestBooks(user.id);
    return res.json(books);
  });

  app.post('/api/guestbooks', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const {
        title,
        eventType,
        eventDate,
        hostNames,
        welcomeMessage,
        coverImage,
        theme,
        isModerated,
        isPrivate,
        password
      } = req.body;

      if (!title || !eventType || !eventDate || !hostNames) {
        return res.status(400).json({ error: 'Missing required event details' });
      }

      const newBook = db.createGuestBook({
        ownerId: user.id,
        title,
        eventType,
        eventDate,
        hostNames,
        welcomeMessage: welcomeMessage || 'Welcome to our guest book! Leave us a warm message and memory.',
        coverImage: coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
        theme,
        isModerated: Boolean(isModerated),
        isPrivate: Boolean(isPrivate),
        password: isPrivate && password ? password : null
      });

      return res.status(201).json(newBook);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create guest book' });
    }
  });

  app.put('/api/guestbooks/:id', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const existing = db.getGuestBookById(id);
      if (!isBookOwner(existing, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      const updated = db.updateGuestBook(id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update guest book' });
    }
  });

  app.delete('/api/guestbooks/:id', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const existing = db.getGuestBookById(id);
      if (!isBookOwner(existing, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      db.deleteGuestBook(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete guest book' });
    }
  });

  // ----------------------------------------------------
  // PUBLIC GUEST BOOK ACCESS
  // ----------------------------------------------------
  app.get('/api/public/guestbooks/:slug', optionalAuth, (req, res) => {
    const { slug } = req.params;
    const providedPassword = req.headers['x-guestbook-password'] as string;
    const book = db.getGuestBookBySlug(slug);

    if (!book) {
      return res.status(404).json({ error: 'Guest book not found' });
    }

    const currentUser = (req as any).user;
    const isOwner = currentUser && isBookOwner(book, currentUser.id);

    // Check private password protection if not owner
    if (book.isPrivate && !isOwner) {
      if (!providedPassword || providedPassword !== book.password) {
        return res.status(403).json({
          error: 'This guest book is password protected.',
          requiresPassword: true,
          title: book.title,
          coverImage: book.coverImage
        });
      }
    }

    // Record page view analytics
    const visitorId = (req as any).visitorId;
    db.recordView(book.id, visitorId);

    // Fetch approved messages
    const messages = db.getMessages(book.id, visitorId, false);

    // Strip password from public output
    const { password, ...safeBook } = book;

    return res.json({
      guestBook: safeBook,
      messages,
      isOwner: Boolean(isOwner)
    });
  });

  // Verify private password endpoint
  app.post('/api/public/guestbooks/:slug/verify-password', (req, res) => {
    const { slug } = req.params;
    const { password } = req.body;
    const book = db.getGuestBookBySlug(slug);
    if (!book) {
      return res.status(404).json({ error: 'Guest book not found' });
    }

    if (!book.isPrivate) {
      return res.json({ valid: true });
    }

    if (book.password === password) {
      return res.json({ valid: true });
    }

    return res.status(401).json({ valid: false, error: 'Incorrect password' });
  });

  // ----------------------------------------------------
  // GUEST MESSAGE SUBMISSION
  // ----------------------------------------------------
  app.post('/api/public/guestbooks/:slug/messages', (req, res) => {
    try {
      const { slug } = req.params;
      const { name, email, message, relationship, mediaUrls, reactionType } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const book = db.getGuestBookBySlug(slug);
      if (!book) {
        return res.status(404).json({ error: 'Guest book not found' });
      }

      // If book is private, verify password header
      const providedPassword = req.headers['x-guestbook-password'] as string;
      if (book.isPrivate && providedPassword !== book.password) {
        return res.status(403).json({ error: 'Access denied: private guest book' });
      }

      const visitorId = (req as any).visitorId;

      const newMsg = db.createMessage(
        book.id,
        {
          name: name.trim(),
          email: email ? email.trim() : undefined,
          message: message.trim(),
          relationship: relationship || 'Friend',
          mediaUrls: mediaUrls || [],
          reactionType: reactionType || '❤️'
        },
        visitorId,
        book.isModerated
      );

      return res.status(201).json({
        success: true,
        message: newMsg,
        status: newMsg.status,
        notice: book.isModerated
          ? 'Thank you! Your message has been submitted and is awaiting host approval ❤️'
          : 'Thank you! Your message has been added to the guest book ❤️'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to submit message' });
    }
  });

  // ----------------------------------------------------
  // REACTIONS (❤️, 🥰, 😂, 👏, 🎉)
  // ----------------------------------------------------
  app.post('/api/messages/:id/reactions', (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const visitorId = (req as any).visitorId;

      if (!type) {
        return res.status(400).json({ error: 'Reaction type is required' });
      }

      const result = db.toggleReaction(id, type, visitorId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to toggle reaction' });
    }
  });

  // ----------------------------------------------------
  // ADMIN MESSAGE MODERATION & MANAGEMENT
  // ----------------------------------------------------
  app.get('/api/admin/guestbooks/:id/messages', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { status, search, sort, hasPhoto, hasVideo } = req.query;

      const book = db.getGuestBookById(id);
      if (!isBookOwner(book, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      const messages = db.getAdminMessages(id, {
        status: status as string,
        search: search as string,
        sort: sort as string,
        hasPhoto: hasPhoto === 'true',
        hasVideo: hasVideo === 'true'
      });

      return res.json(messages);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch messages' });
    }
  });

  app.patch('/api/admin/messages/:id/status', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { status } = req.body;

      if (!['APPROVED', 'PENDING', 'HIDDEN'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const message = db.getMessageById(id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const book = db.getGuestBookById(message.guestBookId);
      if (!isBookOwner(book, user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updated = db.updateMessageStatus(id, status);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update message status' });
    }
  });

  app.delete('/api/admin/messages/:id', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const message = db.getMessageById(id);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const book = db.getGuestBookById(message.guestBookId);
      if (!isBookOwner(book, user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      db.deleteMessage(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete message' });
    }
  });

  // ----------------------------------------------------
  // ADMIN DASHBOARD STATS & ANALYTICS
  // ----------------------------------------------------
  app.get('/api/admin/guestbooks/:id/stats', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const book = db.getGuestBookById(id);
      if (!isBookOwner(book, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      const stats = db.getDashboardStats(id);
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch statistics' });
    }
  });

  // Media gallery for guest book
  app.get('/api/admin/guestbooks/:id/media', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const book = db.getGuestBookById(id);
      if (!isBookOwner(book, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      const media = db.getMediaForGuestBook(id);
      return res.json(media);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch media' });
    }
  });

  // ----------------------------------------------------
  // EXPORT (CSV)
  // ----------------------------------------------------
  app.get('/api/admin/guestbooks/:id/export.csv', authenticate, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const book = db.getGuestBookById(id);
      if (!isBookOwner(book, user.id)) {
        return res.status(404).json({ error: 'Guest book not found or unauthorized' });
      }

      const messages = db.getAllMessagesForExport(id);

      // Construct CSV
      const headers = ['Message ID', 'Guest Name', 'Private Email', 'Relationship', 'Status', 'Date', 'Message', 'Media URLs', 'Reactions Count'];
      const rows = messages.map((m) => {
        const mediaUrls = m.media?.map((med) => med.url).join('; ') || '';
        const reactionsTotal = m.reactions ? Object.values(m.reactions).reduce((a, b) => a + b, 0) : 0;
        const cleanMsg = (m.message || '').replace(/"/g, '""');
        const cleanName = (m.name || '').replace(/"/g, '""');
        const cleanEmail = (m.email || '').replace(/"/g, '""');
        const cleanRel = (m.relationship || '').replace(/"/g, '""');

        return [
          `"${m.id}"`,
          `"${cleanName}"`,
          `"${cleanEmail}"`,
          `"${cleanRel}"`,
          `"${m.status}"`,
          `"${m.createdAt}"`,
          `"${cleanMsg}"`,
          `"${mediaUrls}"`,
          `"${reactionsTotal}"`
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const filename = `guestbook-${book.slug}-${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Export failed' });
    }
  });

  // ----------------------------------------------------
  // QR CODE GENERATION (PNG / SVG)
  // ----------------------------------------------------
  app.get('/api/qrcode', async (req, res) => {
    try {
      const { text, format } = req.query;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Query parameter "text" is required' });
      }

      if (format === 'svg') {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff'
          }
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      // Default to DataURL / PNG
      const dataUrl = await QRCode.toDataURL(text, {
        margin: 2,
        width: 512,
        color: {
          dark: '#1c1917',
          light: '#ffffff'
        }
      });
      return res.json({ dataUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'QR code generation failed' });
    }
  });

  // ----------------------------------------------------
  // HEALTH & UPLOAD
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'digital-guest-book-api',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/upload', (req, res) => {
    try {
      const { dataUrl, type } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      const sizeInBytes = Buffer.byteLength(dataUrl, 'utf8');
      if (sizeInBytes > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size must be less than 10 MB.' });
      }

      return res.json({
        url: dataUrl,
        type: type || 'IMAGE'
      });
    } catch {
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  return app;
}
