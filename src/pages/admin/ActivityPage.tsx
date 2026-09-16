import React, { useEffect, useState } from 'react';
import type { ActivityLog } from '../../domain/models.ts';
import { activityService } from '../../services/systemService.ts';
import { formatDateTime } from '../../domain/dates.ts';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/DataState.tsx';

const ACTION_LABELS: Record<string, string> = {
  'user.created': 'მომხმარებელი შეიქმნა',
  'user.deleted': 'მომხმარებელი წაიშალა',
  'user.password_reset': 'პაროლი შეიცვალა',
  'order.created': 'შეკვეთა შეიქმნა',
  'order.deleted': 'შეკვეთა წაიშალა',
  'payment.added': 'გადახდა დაემატა',
  'media.deleted': 'ფაილი წაიშალა',
  'email.sent': 'ელფოსტა გაიგზავნა',
};

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    activityService
      .list()
      .then(setLogs)
      .catch((err) => {
        console.error('activity load failed', err);
        setError('ისტორიის ჩატვირთვა ვერ მოხერხდა');
        setLogs([]);
      });
  };

  useEffect(load, []);

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">აქტივობის ისტორია</h1>
        <p className="mt-1 text-sm text-stone-600">
          ჩანაწერები მხოლოდ ემატება — რედაქტირება და წაშლა შეუძლებელია.
        </p>
      </header>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : logs === null ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState title="ჩანაწერი ჯერ არ არის" />
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-stone-900">
                    {ACTION_LABELS[log.action] || log.action}
                  </p>
                  <p className="text-[11px] text-stone-600">{formatDateTime(log.timestamp)}</p>
                </div>
                <p className="mt-0.5 text-[11px] text-stone-600">
                  {log.actorName} · {log.entityType} {log.entityId.slice(0, 14)}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <span className="ml-1">
                      ({Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')})
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
