import type {
  ClientStatus,
  EventStatus,
  EventType,
  OrderRequestStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserStatus,
} from './models.ts';
import type { UserRole } from './roles.ts';

/**
 * Enum values stay English in the data so they are stable and greppable; every
 * word a person reads is Georgian. This is the single place the two meet.
 */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'ახალი',
  CONFIRMED: 'დადასტურებული',
  IN_PROGRESS: 'პროცესშია',
  REVIEW: 'შემოწმებაზეა',
  READY: 'მზადაა',
  SHIPPED: 'კურიერს გადაეცა',
  COMPLETED: 'დასრულებულია',
  CANCELLED: 'გაუქმებულია',
};

/** Colour carries the same meaning as the word, never instead of it. */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  NEW: 'bg-sky-50 text-sky-800 border-sky-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-900 border-amber-300',
  REVIEW: 'bg-violet-50 text-violet-800 border-violet-200',
  READY: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  SHIPPED: 'bg-teal-50 text-teal-800 border-teal-200',
  COMPLETED: 'bg-stone-100 text-stone-700 border-stone-300',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'გადაუხდელი',
  PARTIAL: 'ნაწილობრივ გადახდილი',
  PAID: 'სრულად გადახდილი',
  OVERPAID: 'ზედმეტად გადახდილი',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  UNPAID: 'bg-rose-50 text-rose-800 border-rose-200',
  PARTIAL: 'bg-amber-50 text-amber-900 border-amber-300',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  OVERPAID: 'bg-sky-50 text-sky-800 border-sky-200',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'ნაღდი',
  CARD: 'ბარათი',
  BANK_TRANSFER: 'საბანკო გადარიცხვა',
  OTHER: 'სხვა',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'ქორწილი',
  birthday: 'დაბადების დღე',
  christening: 'ნათლობა',
  party: 'წვეულება',
  corporate: 'კორპორატიული',
  hotel: 'სასტუმრო',
  memorial: 'სამახსოვრო',
  other: 'სხვა',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  PLANNED: 'დაგეგმილი',
  ACTIVE: 'მიმდინარე',
  COMPLETED: 'დასრულებული',
  ARCHIVED: 'დაარქივებული',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'სუპერ ადმინისტრატორი',
  STAFF: 'თანამშრომელი',
  CLIENT: 'კლიენტი',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'აქტიური',
  DISABLED: 'გათიშული',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: 'აქტიური',
  ARCHIVED: 'დაარქივებული',
};

export const REQUEST_STATUS_LABELS: Record<OrderRequestStatus, string> = {
  NEW: 'ახალი',
  NEEDS_CONTACT: 'დაკავშირება საჭიროა',
  PROCESSED: 'დამუშავებულია',
  CONVERTED: 'შეკვეთად გარდაიქმნა',
  REJECTED: 'უარყოფილია',
};

export const PERMISSION_LABELS: Record<string, string> = {
  'orders.view': 'შეკვეთების ნახვა',
  'orders.create': 'შეკვეთის შექმნა',
  'orders.edit': 'შეკვეთის რედაქტირება',
  'orders.delete': 'შეკვეთის წაშლა',
  'clients.view': 'კლიენტების ნახვა',
  'clients.create': 'კლიენტის შექმნა',
  'clients.edit': 'კლიენტის რედაქტირება',
  'clients.delete': 'კლიენტის დაარქივება',
  'events.view': 'ღონისძიებების ნახვა',
  'events.manage': 'ღონისძიებების მართვა',
  'guestbooks.view': 'სტუმრების წიგნების ნახვა',
  'guestbooks.manage': 'სტუმრების წიგნების მართვა',
  'albums.view': 'ალბომების ნახვა',
  'albums.manage': 'ალბომების მართვა',
  'media.delete': 'ფაილების წაშლა',
  'payments.view': 'გადახდების ნახვა',
  'payments.edit': 'გადახდების რედაქტირება',
  'catalog.view': 'კატალოგის ნახვა',
  'catalog.manage': 'კატალოგის მართვა',
  'users.view': 'მომხმარებლების ნახვა',
  'users.manage': 'მომხმარებლების მართვა',
  'emails.send': 'ელფოსტის გაგზავნა',
  'requests.view': 'მოთხოვნების ნახვა',
  'requests.manage': 'მოთხოვნების მართვა',
  'activity.view': 'აქტივობის ისტორია',
  'settings.manage': 'პარამეტრების მართვა',
};

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  orders: 'შეკვეთები',
  clients: 'კლიენტები',
  events: 'ღონისძიებები',
  guestbooks: 'სტუმრების წიგნები',
  albums: 'ალბომები',
  payments: 'გადახდები',
  catalog: 'კატალოგი',
  users: 'მომხმარებლები',
  communication: 'კომუნიკაცია',
  system: 'სისტემა',
};
