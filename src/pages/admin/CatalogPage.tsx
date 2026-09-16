import React, { useCallback, useEffect, useState } from 'react';
import { FolderPlus, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CatalogCategory, CatalogItem } from '../../domain/models.ts';
import { catalogService } from '../../services/catalogService.ts';
import { formatGel, parseLariInput } from '../../domain/money.ts';
import { useSession } from '../../lib/session.tsx';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { Modal, primaryButton, secondaryButton } from '../../components/ui/Modal.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

/**
 * Categories and their items. Nothing here ships as a fixed list: a new
 * product line is a row somebody adds, not a code change.
 */
export const CatalogPage: React.FC = () => {
  const { can } = useSession();
  const toast = useToast();

  const [categories, setCategories] = useState<CatalogCategory[] | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryEditing, setCategoryEditing] = useState<CatalogCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const [itemModal, setItemModal] = useState(false);
  const [itemEditing, setItemEditing] = useState<CatalogItem | null>(null);
  const [itemForm, setItemForm] = useState({ categoryId: '', name: '', price: '', unit: '', productionDays: '' });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'category' | 'item'; id: string; name: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, its] = await Promise.all([catalogService.listCategories(), catalogService.listItems()]);
      setCategories(cats);
      setItems(its);
    } catch (err) {
      console.error('catalog load failed', err);
      setError('კატალოგის ჩატვირთვა ვერ მოხერხდა');
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCategory = async () => {
    if (!categoryName.trim()) {
      setFormError('კატეგორიის სახელი სავალდებულოა');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (categoryEditing) {
        await catalogService.updateCategory(categoryEditing.id, { name: categoryName.trim() });
        toast.success('კატეგორია განახლდა');
      } else {
        await catalogService.createCategory({ name: categoryName, sortOrder: (categories?.length || 0) + 1 });
        toast.success('კატეგორია დაემატა');
      }
      setCategoryModal(false);
      await load();
    } catch (err) {
      console.error('category save failed', err);
      setFormError('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async () => {
    const price = parseLariInput(itemForm.price);

    if (!itemForm.name.trim()) {
      setFormError('დასახელება სავალდებულოა');
      return;
    }
    if (!itemForm.categoryId) {
      setFormError('აირჩიეთ კატეგორია');
      return;
    }
    if (price === null || price < 0) {
      setFormError('ფასი რიცხვი უნდა იყოს, მაგალითად 150 ან 150.50');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const days = itemForm.productionDays ? Number(itemForm.productionDays) : undefined;
      if (itemEditing) {
        await catalogService.updateItem(itemEditing.id, {
          categoryId: itemForm.categoryId,
          name: itemForm.name.trim(),
          price,
          unit: itemForm.unit.trim() || undefined,
          productionDays: Number.isFinite(days) ? days : undefined,
        });
        toast.success('პროდუქტი განახლდა');
      } else {
        await catalogService.createItem({
          categoryId: itemForm.categoryId,
          name: itemForm.name,
          price,
          unit: itemForm.unit || undefined,
          productionDays: Number.isFinite(days) ? days : undefined,
        });
        toast.success('პროდუქტი დაემატა');
      }
      setItemModal(false);
      await load();
    } catch (err) {
      console.error('item save failed', err);
      setFormError('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      if (deleting.kind === 'category') {
        await catalogService.deleteCategory(deleting.id);
        toast.success('კატეგორია წაიშალა');
      } else {
        await catalogService.deleteItem(deleting.id);
        toast.success('პროდუქტი წაიშალა');
      }
      setDeleting(null);
      await load();
    } catch (err) {
      console.error('catalog delete failed', err);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setDeleteBusy(false);
    }
  };

  const manage = can('catalog.manage');

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">პროდუქტები და სერვისები</h1>
          <p className="mt-1 text-sm text-stone-600">
            {categories === null ? 'იტვირთება...' : `${categories.length} კატეგორია · ${items.length} პოზიცია`}
          </p>
        </div>

        {manage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCategoryEditing(null);
                setCategoryName('');
                setFormError(null);
                setCategoryModal(true);
              }}
              className={`${secondaryButton} inline-flex items-center gap-2`}
            >
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
              კატეგორია
            </button>
            <button
              type="button"
              disabled={!categories?.length}
              onClick={() => {
                setItemEditing(null);
                setItemForm({ categoryId: categories?.[0]?.id || '', name: '', price: '', unit: '', productionDays: '' });
                setFormError(null);
                setItemModal(true);
              }}
              className={`${primaryButton} inline-flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              პროდუქტი
            </button>
          </div>
        )}
      </header>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : categories === null ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl">
          <EmptyState
            title="კატალოგი ცარიელია"
            hint={'დაიწყეთ კატეგორიით — მაგალითად „მოსაწვევები“ ან „სასაჩუქრე პროდუქცია“ — და შემდეგ დაამატეთ პოზიციები.'}
            action={
              manage ? (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryEditing(null);
                    setCategoryName('');
                    setCategoryModal(true);
                  }}
                  className={primaryButton}
                >
                  პირველი კატეგორია
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.categoryId === category.id);

            return (
              <section key={category.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 bg-stone-50">
                  <h2 className="text-sm font-semibold text-stone-900">{category.name}</h2>
                  {manage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryEditing(category);
                          setCategoryName(category.name);
                          setFormError(null);
                          setCategoryModal(true);
                        }}
                        aria-label={`${category.name} — რედაქტირება`}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting({ kind: 'category', id: category.id, name: category.name })}
                        aria-label={`${category.name} — წაშლა`}
                        className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {categoryItems.length === 0 ? (
                  <p className="px-4 py-6 text-[13px] text-stone-600">ამ კატეგორიაში პოზიცია ჯერ არ არის.</p>
                ) : (
                  <table className="w-full text-left text-[13px]">
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">დასახელება</th>
                        <th scope="col">ფასი</th>
                        <th scope="col">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryItems.map((item) => (
                        <tr key={item.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2 font-medium text-stone-900">
                              <Package className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
                              {item.name}
                            </span>
                            {item.unit && <span className="ml-5.5 text-[11px] text-stone-600">ერთეული: {item.unit}</span>}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-stone-900 whitespace-nowrap">
                            {formatGel(item.price)}
                          </td>
                          <td className="px-4 py-2.5">
                            {manage && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemEditing(item);
                                    setItemForm({
                                      categoryId: item.categoryId,
                                      name: item.name,
                                      price: String(item.price / 100),
                                      unit: item.unit || '',
                                      productionDays: item.productionDays ? String(item.productionDays) : '',
                                    });
                                    setFormError(null);
                                    setItemModal(true);
                                  }}
                                  aria-label={`${item.name} — რედაქტირება`}
                                  className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleting({ kind: 'item', id: item.id, name: item.name })}
                                  aria-label={`${item.name} — წაშლა`}
                                  className="p-1.5 rounded-lg text-stone-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={categoryModal}
        title={categoryEditing ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}
        onClose={() => setCategoryModal(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setCategoryModal(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={saveCategory} disabled={saving}>
              {saving ? 'ინახება...' : 'შენახვა'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {formError}
            </div>
          )}
          <Field id="category-name" label="კატეგორიის სახელი" required>
            {() => (
              <input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="მაგ. მოსაწვევები"
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={itemModal}
        title={itemEditing ? 'პოზიციის რედაქტირება' : 'ახალი პროდუქტი ან სერვისი'}
        onClose={() => setItemModal(false)}
        footer={
          <>
            <button type="button" className={secondaryButton} onClick={() => setItemModal(false)} disabled={saving}>
              გაუქმება
            </button>
            <button type="button" className={primaryButton} onClick={saveItem} disabled={saving}>
              {saving ? 'ინახება...' : 'შენახვა'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800">
              {formError}
            </div>
          )}

          <Field id="item-category" label="კატეგორია" required>
            {() => (
              <select
                id="item-category"
                value={itemForm.categoryId}
                onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))}
                className={inputClass}
              >
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </Field>

          <Field id="item-name" label="დასახელება" required>
            {() => (
              <input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="მაგ. ონლაინ მოსაწვევი"
                className={inputClass}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="item-price" label="ფასი (₾)" required hint="მაგალითად 150 ან 150.50">
              {(describedBy) => (
                <input
                  id="item-price"
                  inputMode="decimal"
                  value={itemForm.price}
                  onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>
            <Field id="item-unit" label="ერთეული">
              {() => (
                <input
                  id="item-unit"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="ცალი, საათი, კომპლექტი"
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <Field id="item-days" label="დამზადების ვადა (დღე)" hint="შეკვეთის შექმნისას დედლაინს შემოგთავაზებთ.">
            {(describedBy) => (
              <input
                id="item-days"
                inputMode="numeric"
                value={itemForm.productionDays}
                onChange={(e) => setItemForm((p) => ({ ...p, productionDays: e.target.value }))}
                aria-describedby={describedBy}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        title={deleting?.kind === 'category' ? 'კატეგორიის წაშლა' : 'პოზიციის წაშლა'}
        message={
          deleting?.kind === 'category'
            ? `„${deleting?.name}“ წაიშლება. მასში არსებული პოზიციები დარჩება, მაგრამ კატეგორიის გარეშე.`
            : `„${deleting?.name}“ სამუდამოდ წაიშლება. უკვე შექმნილ შეკვეთებს ეს არ შეეხება.`
        }
        confirmLabel="წაშლა"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};
