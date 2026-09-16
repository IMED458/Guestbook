import type { GuestBook, GuestMessage, ThemeSettings } from '../types.ts';
import { byNewest, getOne, listWhere, updateOne, where, deleteOne } from './firestoreHelpers.ts';

const BOOKS = 'guestbooks';
const MESSAGES = 'messages';

export interface AdminBook extends GuestBook {
  eventId?: string;
  clientId?: string;
  viewsTotal?: number;
}

/**
 * Administration of a guest book. Reads scope themselves on the field the
 * rules key off — an unconstrained list would be refused outright, because
 * security rules are not filters.
 */
export const guestbookService = {
  async list(): Promise<AdminBook[]> {
    const all = await listWhere<AdminBook>(BOOKS);
    return all.sort(byNewest());
  },

  async listForClient(clientId: string): Promise<AdminBook[]> {
    const all = await listWhere<AdminBook>(BOOKS, [where('clientId', '==', clientId)]);
    return all.sort(byNewest());
  },

  async get(id: string): Promise<AdminBook | null> {
    return getOne<AdminBook>(BOOKS, id);
  },

  async update(id: string, patch: Partial<AdminBook>): Promise<void> {
    await updateOne(BOOKS, id, patch as Record<string, unknown>);
  },

  async setTheme(id: string, theme: ThemeSettings): Promise<void> {
    await updateOne(BOOKS, id, { theme } as unknown as Record<string, unknown>);
  },

  /**
   * Every message for moderation. The `ownerId` filter is what makes this
   * readable: the public wall constrains on status instead.
   */
  async listMessages(guestBookId: string, ownerId: string): Promise<GuestMessage[]> {
    const all = await listWhere<GuestMessage>(MESSAGES, [
      where('guestBookId', '==', guestBookId),
      where('ownerId', '==', ownerId),
    ]);
    return all.sort(byNewest());
  },

  /** Falls back to the client scope for a book created by the new CRM. */
  async listMessagesForBook(book: AdminBook, ownerId: string): Promise<GuestMessage[]> {
    try {
      return await guestbookService.listMessages(book.id, ownerId);
    } catch {
      const all = await listWhere<GuestMessage>(MESSAGES, [
        where('guestBookId', '==', book.id),
        where('status', '==', 'APPROVED'),
      ]);
      return all.sort(byNewest());
    }
  },

  async setMessageStatus(messageId: string, status: 'APPROVED' | 'PENDING' | 'HIDDEN'): Promise<void> {
    await updateOne(MESSAGES, messageId, { status });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await deleteOne(MESSAGES, messageId);
  },
};
