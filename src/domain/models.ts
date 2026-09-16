import type { ClientAccess, Permission, UserRole } from './roles.ts';

/** ISO-8601 string. Firestore Timestamps are converted at the service edge. */
export type IsoDate = string;

/** Money is always integer tetri — 500.00 ₾ is 50000. Never a float. */
export type Tetri = number;

/* ------------------------------------------------------------------ */
/* Users — a login identity                                            */
/* ------------------------------------------------------------------ */

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface AppUser {
  /** Firebase Auth uid. */
  id: string;
  /** Lowercase, unique, what the person actually types to sign in. */
  username: string;
  /** Synthesised `<username>@<auth domain>` — an implementation detail. */
  authEmail: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  /** Where we actually write to them. Never the auth email. */
  contactEmail?: string;
  phone?: string;
  role: UserRole;
  /** Only meaningful for STAFF; SUPER_ADMIN ignores it. */
  permissions: Permission[];
  /** Only meaningful for CLIENT — which business entity they belong to. */
  clientId?: string;
  /** Only meaningful for CLIENT — which parts of the cabinet they get. */
  access: ClientAccess;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt?: IsoDate;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy?: string;
}

/** The public reservation that makes usernames unique across the project. */
export interface UsernameClaim {
  /** Document id is the normalised username. */
  uid: string;
  createdAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Clients — a business entity, which may own several login users      */
/* ------------------------------------------------------------------ */

export type ClientStatus = 'ACTIVE' | 'ARCHIVED';

export interface Client {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  /** Internal — never exposed to the client themselves. */
  notes?: string;
  status: ClientStatus;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy?: string;
  deletedAt?: IsoDate | null;
}

/* ------------------------------------------------------------------ */
/* Events — the parent of a guest book and/or an album                 */
/* ------------------------------------------------------------------ */

export type EventType =
  | 'wedding'
  | 'birthday'
  | 'christening'
  | 'party'
  | 'corporate'
  | 'hotel'
  | 'memorial'
  | 'other';

export type EventStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface EventRecord {
  id: string;
  clientId: string;
  title: string;
  /** Shared by the guest book, the album and the combined landing page. */
  slug: string;
  eventType: EventType;
  eventDate: IsoDate;
  hosts: string;
  venue?: string;
  status: EventStatus;
  hasGuestbook: boolean;
  hasAlbum: boolean;
  guestbookId?: string | null;
  albumId?: string | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/* Media — metadata only; the bytes live in R2                         */
/* ------------------------------------------------------------------ */

/** Legacy Cloudinary records keep working; everything new is 'r2'. */
export type StorageProvider = 'r2' | 'cloudinary' | 'external';

export type MediaKind = 'IMAGE' | 'VIDEO';

export type MediaStatus = 'PENDING' | 'READY' | 'HIDDEN' | 'FAILED';

export interface MediaRecord {
  id: string;
  albumId?: string;
  guestbookId?: string;
  messageId?: string;
  eventId?: string;
  clientId?: string;
  kind: MediaKind;
  storageProvider: StorageProvider;
  /** R2 object key. Absent for legacy Cloudinary rows. */
  objectKey?: string;
  /** Separate, smaller object used by the gallery. Never replaces the original. */
  thumbnailKey?: string;
  /** Legacy/absolute URL — Cloudinary rows and externally hosted covers. */
  url?: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  checksum?: string;
  uploaderName?: string;
  status: MediaStatus;
  uploadedAt: IsoDate;
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/* Albums                                                              */
/* ------------------------------------------------------------------ */

export interface AlbumLimits {
  uploadEnabled: boolean;
  allowImages: boolean;
  allowVideos: boolean;
  /** Bytes. Enforced in the Worker before a signature is handed out. */
  maxFileSize: number;
  /** Bytes. Zero means no quota. */
  storageQuota: number;
  expiresAt?: IsoDate | null;
}

export interface AlbumStats {
  fileCount: number;
  imageCount: number;
  videoCount: number;
  totalBytes: number;
  lastUploadAt?: IsoDate | null;
}

export interface Album {
  id: string;
  eventId: string;
  clientId: string;
  slug: string;
  title: string;
  welcomeMessage: string;
  coverImage?: string;
  limits: AlbumLimits;
  stats: AlbumStats;
  archivedAt?: IsoDate | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy?: string;
}

/* ------------------------------------------------------------------ */
/* Orders, payments and the catalogue they draw from                   */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'READY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'IN_PROGRESS',
  'REVIEW',
  'READY',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
];

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'];

export interface OrderItem {
  id: string;
  /** Null for a one-off line typed straight into the order. */
  catalogItemId?: string | null;
  name: string;
  quantity: number;
  unitPrice: Tetri;
  discount: Tetri;
  /** quantity * unitPrice - discount, recomputed by calculateOrderTotals. */
  lineTotal: Tetri;
}

export interface Order {
  id: string;
  /** Human-facing, e.g. ORD-2026-0001. */
  orderNumber: string;
  clientId: string;
  customerName: string;
  phone?: string;
  email?: string;
  items: OrderItem[];
  subtotal: Tetri;
  discount: Tetri;
  total: Tetri;
  paidAmount: Tetri;
  balance: Tetri;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deadline?: IsoDate | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  internalNotes?: string;
  clientNotes?: string;
  deliveryMethod?: string;
  courierInfo?: string;
  trackingInfo?: string;
  eventId?: string | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  createdBy?: string;
  deletedAt?: IsoDate | null;
}

export interface Payment {
  id: string;
  orderId: string;
  clientId: string;
  amount: Tetri;
  method: PaymentMethod;
  paidAt: IsoDate;
  note?: string;
  createdAt: IsoDate;
  createdBy?: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface CatalogItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: Tetri;
  unit?: string;
  /** Working days; drives the suggested deadline on a new order. */
  productionDays?: number;
  active: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Inbound requests from the public site                               */
/* ------------------------------------------------------------------ */

export type OrderRequestStatus =
  | 'NEW'
  | 'NEEDS_CONTACT'
  | 'PROCESSED'
  | 'CONVERTED'
  | 'REJECTED';

export interface OrderRequest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  comment?: string;
  status: OrderRequestStatus;
  convertedOrderId?: string | null;
  convertedClientId?: string | null;
  handledBy?: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/* ------------------------------------------------------------------ */
/* Communication and audit                                             */
/* ------------------------------------------------------------------ */

export type EmailStatus = 'SENT' | 'FAILED';

export interface EmailLog {
  id: string;
  clientId?: string;
  orderId?: string;
  eventId?: string;
  recipient: string;
  subject: string;
  templateKey: string;
  sentBy: string;
  sentByName?: string;
  sentAt: IsoDate;
  status: EmailStatus;
  error?: string;
}

export interface ActivityLog {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: IsoDate;
  metadata?: Record<string, string | number | boolean | null>;
}

/* ------------------------------------------------------------------ */
/* System settings                                                     */
/* ------------------------------------------------------------------ */

export interface SystemSettings {
  brandName: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency: 'GEL';
  orderNumberPrefix: string;
  /** Last sequence handed out, per year, so numbering restarts annually. */
  orderSequence: Record<string, number>;
  companyLegalName?: string;
  companyRegistrationNumber?: string;
  companyAddress?: string;
  defaultAlbumLimits: AlbumLimits;
  updatedAt: IsoDate;
  updatedBy?: string;
}
