import type { Client, ClientStatus } from '../domain/models.ts';
import {
  byNewest,
  createOne,
  deleteOne,
  getOne,
  listWhere,
  newId,
  nowIso,
  updateOne,
  where,
} from './firestoreHelpers.ts';

const PATH = 'clients';

export interface ClientInput {
  displayName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export const clientService = {
  async list(): Promise<Client[]> {
    const all = await listWhere<Client>(PATH);
    // Archived clients stay in the database; they are simply not offered.
    return all.filter((c) => !c.deletedAt).sort(byNewest());
  },

  async get(id: string): Promise<Client | null> {
    return getOne<Client>(PATH, id);
  },

  async create(input: ClientInput, actorId: string): Promise<Client> {
    const id = newId('cl');
    const now = nowIso();

    const record: Client = {
      id,
      displayName: input.displayName.trim(),
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      companyName: input.companyName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      secondaryPhone: input.secondaryPhone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      address: input.address?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      deletedAt: null,
    };

    const { id: _omit, ...data } = record;
    await createOne(PATH, id, data as unknown as Record<string, unknown>);
    return record;
  },

  async update(id: string, input: Partial<ClientInput> & { status?: ClientStatus }): Promise<void> {
    await updateOne(PATH, id, input as Record<string, unknown>);
  },

  /**
   * Archive rather than erase. A client carries orders, payments and events;
   * losing them to a stray click is far more costly than a stale row.
   */
  async archive(id: string): Promise<void> {
    await updateOne(PATH, id, { status: 'ARCHIVED', deletedAt: nowIso() });
  },

  async restore(id: string): Promise<void> {
    await updateOne(PATH, id, { status: 'ACTIVE', deletedAt: null });
  },

  /** Permanent removal, reserved for a super administrator. */
  async destroy(id: string): Promise<void> {
    await deleteOne(PATH, id);
  },

  async listArchived(): Promise<Client[]> {
    const all = await listWhere<Client>(PATH, [where('status', '==', 'ARCHIVED')]);
    return all.sort(byNewest());
  },
};
