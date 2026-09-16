import type { CatalogCategory, CatalogItem, Tetri } from '../domain/models.ts';
import { createOne, deleteOne, listWhere, newId, nowIso, updateOne } from './firestoreHelpers.ts';

const CATEGORIES = 'catalogCategories';
const ITEMS = 'catalogItems';

/**
 * The catalogue is entirely administrator-defined. Nothing is hard-coded, so a
 * new line of business — wine, chocolate, printing — is a row, not a release.
 */
export const catalogService = {
  async listCategories(): Promise<CatalogCategory[]> {
    const all = await listWhere<CatalogCategory>(CATEGORIES);
    return all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'ka'));
  },

  async createCategory(input: { name: string; description?: string; sortOrder?: number }): Promise<CatalogCategory> {
    const id = newId('cat');
    const now = nowIso();
    const record: CatalogCategory = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      sortOrder: input.sortOrder ?? 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const { id: _omit, ...data } = record;
    await createOne(CATEGORIES, id, data as unknown as Record<string, unknown>);
    return record;
  },

  async updateCategory(id: string, input: Partial<CatalogCategory>): Promise<void> {
    await updateOne(CATEGORIES, id, input as Record<string, unknown>);
  },

  async deleteCategory(id: string): Promise<void> {
    await deleteOne(CATEGORIES, id);
  },

  async listItems(): Promise<CatalogItem[]> {
    const all = await listWhere<CatalogItem>(ITEMS);
    return all.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
  },

  async createItem(input: {
    categoryId: string;
    name: string;
    description?: string;
    price: Tetri;
    unit?: string;
    productionDays?: number;
  }): Promise<CatalogItem> {
    const id = newId('itm');
    const now = nowIso();
    const record: CatalogItem = {
      id,
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      price: input.price,
      unit: input.unit?.trim() || undefined,
      productionDays: input.productionDays,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const { id: _omit, ...data } = record;
    await createOne(ITEMS, id, data as unknown as Record<string, unknown>);
    return record;
  },

  async updateItem(id: string, input: Partial<CatalogItem>): Promise<void> {
    await updateOne(ITEMS, id, input as Record<string, unknown>);
  },

  async deleteItem(id: string): Promise<void> {
    await deleteOne(ITEMS, id);
  },
};
