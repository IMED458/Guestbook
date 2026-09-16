import React, { useCallback, useEffect, useState } from 'react';
import { Phone, UserPlus } from 'lucide-react';
import type { OrderRequest, OrderRequestStatus } from '../../domain/models.ts';
import { REQUEST_STATUS_LABELS } from '../../domain/labels.ts';
import { requestService } from '../../services/systemService.ts';
import { clientService } from '../../services/clientService.ts';
import { formatDateTime } from '../../domain/dates.ts';
import { useSession } from '../../lib/session.tsx';
import { navigate } from '../../lib/routes.ts';
import { inputClass } from '../../components/ui/Field.tsx';
import { secondaryButton } from '../../components/ui/Modal.tsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';
import { useToast } from '../../components/ui/Toast.tsx';

const STATUSES: OrderRequestStatus[] = ['NEW', 'NEEDS_CONTACT', 'PROCESSED', 'CONVERTED', 'REJECTED'];

const TONE: Record<OrderRequestStatus, string> = {
  NEW: 'bg-sky-50 text-sky-800 border-sky-200',
  NEEDS_CONTACT: 'bg-amber-50 text-amber-900 border-amber-300',
  PROCESSED: 'bg-stone-100 text-stone-700 border-stone-300',
  CONVERTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
};

/** Enquiries from the public site, before they are anybody's customer. */
export const RequestsPage: React.FC = () => {
  const { user, can } = useSession();
  const toast = useToast();

  const [requests, setRequests] = useState<OrderRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRequests(await requestService.list());
    } catch (err) {
      console.error('requests load failed', err);
      setError('მოთხოვნების ჩატვირთვა ვერ მოხერხდა');
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (request: OrderRequest, status: OrderRequestStatus) => {
    try {
      await requestService.setStatus(request.id, status, user?.id || '');
      toast.success('სტატუსი განახლდა');
      await load();
    } catch (err) {
      console.error('status change failed', err);
      toast.error('სტატუსის შეცვლა ვერ მოხერხდა');
    }
  };

  /** Turning an enquiry into a client is the point of this screen. */
  const convertToClient = async (request: OrderRequest) => {
    try {
      const client = await clientService.create(
        {
          displayName: request.name,
          phone: request.phone,
          email: request.email,
          notes: request.comment ? `ონლაინ მოთხოვნიდან: ${request.comment}` : undefined,
        },
        user?.id || ''
      );
      await requestService.setStatus(request.id, 'PROCESSED', user?.id || '');
      toast.success('კლიენტი შეიქმნა — ახლა შეკვეთა დაამატეთ');
      await load();
      navigate('admin/clients');
      return client;
    } catch (err) {
      console.error('conversion failed', err);
      toast.error('კლიენტის შექმნა ვერ მოხერხდა');
      return null;
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">ახალი მოთხოვნები</h1>
        <p className="mt-1 text-sm text-stone-600">
          {requests === null ? 'იტვირთება...' : `${requests.filter((r) => r.status === 'NEW').length} ახალი, სულ ${requests.length}`}
        </p>
      </header>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : requests === null ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState
            title="მოთხოვნა ჯერ არ არის"
            hint="საიტის შეკვეთის ფორმიდან გამოგზავნილი მოთხოვნები აქ გამოჩნდება."
          />
        ) : (
          <ul className="divide-y divide-stone-100">
            {requests.map((request) => (
              <li key={request.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-stone-900">{request.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" aria-hidden="true" />
                        {request.phone}
                      </span>
                      {request.email && <span>{request.email}</span>}
                      <span>{formatDateTime(request.createdAt)}</span>
                    </p>
                    {request.interest && (
                      <p className="mt-1 text-[12px] text-stone-800">დაინტერესება: {request.interest}</p>
                    )}
                    {request.comment && (
                      <p className="mt-1 text-[12px] text-stone-700 leading-relaxed">{request.comment}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${TONE[request.status]}`}>
                      {REQUEST_STATUS_LABELS[request.status]}
                    </span>

                    {can('requests.manage') && (
                      <>
                        <select
                          value={request.status}
                          onChange={(e) => setStatus(request, e.target.value as OrderRequestStatus)}
                          aria-label={`${request.name} — სტატუსი`}
                          className={`${inputClass} !w-auto !py-1 !text-[12px]`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
                        </select>

                        {request.status !== 'CONVERTED' && can('clients.create') && (
                          <button
                            type="button"
                            onClick={() => convertToClient(request)}
                            className={`${secondaryButton} inline-flex items-center gap-1.5 !py-1 !text-[12px]`}
                          >
                            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                            კლიენტად გადაქცევა
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
