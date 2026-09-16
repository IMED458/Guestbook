import type { ActivityLog, OrderRequest, OrderRequestStatus, SystemSettings } from '../domain/models.ts';
import { byNewest, createOne, getOne, listWhere, newId, nowIso, updateOne } from './firestoreHelpers.ts';

const ACTIVITY = 'activityLogs';
const REQUESTS = 'orderRequests';
const SETTINGS = 'settings';

/**
 * Audit entries are append-only: the rules refuse update and delete outright,
 * so a record of who did what cannot be tidied away afterwards.
 */
export const activityService = {
  async list(limit = 200): Promise<ActivityLog[]> {
    const all = await listWhere<ActivityLog>(ACTIVITY);
    return all.sort(byNewest('timestamp')).slice(0, limit);
  },

  /** Best-effort: an unrecorded action must never fail the action itself. */
  async record(entry: {
    actorUserId: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, string | number | boolean | null>;
  }): Promise<void> {
    try {
      await createOne(ACTIVITY, newId('act'), { ...entry, timestamp: nowIso() });
    } catch (err) {
      console.error('activity log write failed', err);
    }
  },
};

export const requestService = {
  async list(): Promise<OrderRequest[]> {
    const all = await listWhere<OrderRequest>(REQUESTS);
    return all.sort(byNewest());
  },

  /** Submitted by the public form, with no account. */
  async submit(input: {
    name: string;
    phone: string;
    email?: string;
    interest?: string;
    comment?: string;
  }): Promise<void> {
    const now = nowIso();
    await createOne(REQUESTS, newId('req'), {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      interest: input.interest?.trim() || null,
      comment: input.comment?.trim() || null,
      status: 'NEW',
      convertedOrderId: null,
      convertedClientId: null,
      createdAt: now,
      updatedAt: now,
    });
  },

  async setStatus(id: string, status: OrderRequestStatus, handledBy: string): Promise<void> {
    await updateOne(REQUESTS, id, { status, handledBy });
  },

  async markConverted(id: string, clientId: string, orderId: string, handledBy: string): Promise<void> {
    await updateOne(REQUESTS, id, {
      status: 'CONVERTED',
      convertedClientId: clientId,
      convertedOrderId: orderId,
      handledBy,
    });
  },
};

const DEFAULT_SETTINGS: SystemSettings = {
  brandName: 'Memoria',
  currency: 'GEL',
  orderNumberPrefix: 'ORD',
  orderSequence: {},
  defaultAlbumLimits: {
    uploadEnabled: true,
    allowImages: true,
    allowVideos: true,
    maxFileSize: 2 * 1024 * 1024 * 1024,
    storageQuota: 0,
    expiresAt: null,
  },
  updatedAt: nowIso(),
};

export const settingsService = {
  async get(): Promise<SystemSettings> {
    const stored = await getOne<SystemSettings>(SETTINGS, 'general');
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
  },

  async save(patch: Partial<SystemSettings>, actorId: string): Promise<void> {
    const existing = await getOne<SystemSettings>(SETTINGS, 'general');
    const next = { ...DEFAULT_SETTINGS, ...(existing || {}), ...patch, updatedBy: actorId, updatedAt: nowIso() };
    const { id: _omit, ...data } = next as SystemSettings & { id?: string };
    await createOne(SETTINGS, 'general', data as unknown as Record<string, unknown>);
  },
};
