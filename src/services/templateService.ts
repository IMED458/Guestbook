import { EMAIL_TEMPLATES } from './emailService.ts';
import { createOne, deleteOne, listWhere, newId, nowIso, updateOne } from './firestoreHelpers.ts';

const PATH = 'emailTemplates';

export interface StoredTemplate {
  id: string;
  key: string;
  label: string;
  subject: string;
  body: string;
  /** Which EmailJS template carries it. Falls back to the custom one. */
  emailjsTemplateId?: string;
  /** Built-ins ship with the product and cannot be deleted, only edited. */
  builtIn: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Templates are editable and extendable.
 *
 * The built-ins ship with the product so a fresh install can write to a client
 * on day one; anything saved in Firestore overrides or adds to them. A
 * built-in can be reworded but not removed, because something has to be there
 * when the list is empty.
 */
export const templateStore = {
  async list(): Promise<StoredTemplate[]> {
    let stored: StoredTemplate[] = [];
    try {
      stored = await listWhere<StoredTemplate>(PATH);
    } catch {
      // Unreadable templates must not stop someone writing a letter.
    }

    const defaults: StoredTemplate[] = EMAIL_TEMPLATES.map((t, index) => ({
      id: `builtin_${t.key}`,
      key: t.key,
      label: t.label,
      subject: t.subject,
      body: t.body,
      builtIn: true,
      sortOrder: index,
    }));

    const overridden = defaults.map((d) => {
      const custom = stored.find((s) => s.key === d.key);
      return custom ? { ...d, ...custom, builtIn: true } : d;
    });

    const extra = stored.filter((s) => !defaults.some((d) => d.key === s.key));

    return [...overridden, ...extra].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async save(template: Omit<StoredTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<void> {
    const now = nowIso();
    // A built-in override is stored under its own key so the two stay paired.
    const id = template.id && !template.id.startsWith('builtin_') ? template.id : newId('tpl');

    const data = {
      key: template.key,
      label: template.label.trim(),
      subject: template.subject,
      body: template.body,
      emailjsTemplateId: template.emailjsTemplateId || null,
      builtIn: template.builtIn,
      sortOrder: template.sortOrder,
      updatedAt: now,
    };

    const existing = (await listWhere<StoredTemplate>(PATH)).find((s) => s.key === template.key);
    if (existing) {
      await updateOne(PATH, existing.id, data);
    } else {
      await createOne(PATH, id, { ...data, createdAt: now });
    }
  },

  async remove(template: StoredTemplate): Promise<void> {
    if (template.builtIn) throw new Error('ჩაშენებული თარგის წაშლა შეუძლებელია — შეგიძლიათ მხოლოდ ტექსტის შეცვლა');
    await deleteOne(PATH, template.id);
  },

  /** A key derived from the label, kept unique against what already exists. */
  makeKey(label: string, existing: StoredTemplate[]): string {
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'template';

    let key = base;
    let counter = 2;
    while (existing.some((t) => t.key === key)) {
      key = `${base}_${counter++}`;
    }
    return key;
  },
};
