export type EventType =
  | 'wedding'
  | 'birthday'
  | 'party'
  | 'corporate'
  | 'hotel'
  | 'memorial'
  | 'other';

export type ThemePreset =
  | 'classic'
  | 'elegant'
  | 'minimal'
  | 'romantic'
  | 'dark'
  | 'luxury'
  | 'pastel';

export type FontStyle = 'serif' | 'sans' | 'playfair' | 'mono';
export type CardStyle = 'soft' | 'border' | 'elevated';
export type ButtonStyle = 'pill' | 'rounded' | 'minimal';

export interface ThemeSettings {
  themePreset: ThemePreset;
  bgColor: string;
  primaryColor: string;
  fontStyle: FontStyle;
  cardStyle: CardStyle;
  buttonStyle: ButtonStyle;
}

export interface GuestBook {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  eventType: EventType;
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

export interface GuestMessage {
  id: string;
  guestBookId: string;
  name: string;
  email?: string;
  message: string;
  relationship?: string;
  status: 'APPROVED' | 'PENDING' | 'HIDDEN';
  createdAt: string;
  updatedAt: string;
  media?: Media[];
  reactions?: Record<string, number>;
  userReactions?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DashboardStats {
  totalMessages: number;
  totalPhotos: number;
  totalVideos: number;
  totalReactions: number;
  guestBookViews: number;
  messagesToday: number;
  pendingMessages: number;
  visitorsByDay: { date: string; label: string; count: number }[];
  messagesByDay: { date: string; label: string; count: number }[];
}

export type AdminTab =
  | 'overview'
  | 'guestbooks'
  | 'messages'
  | 'media'
  | 'design'
  | 'qrcode'
  | 'settings'
  | 'export';
