import React from 'react';
import { useSession } from '../../lib/session.tsx';

/**
 * The back-office landing screen. Its tiles are wired to real figures as each
 * module lands; nothing here is a placeholder that pretends to have data.
 */
export const DashboardPage: React.FC = () => {
  const { user } = useSession();

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">მთავარი</h1>
        <p className="mt-1 text-sm text-stone-600">
          გამარჯობა, {user?.firstName || user?.username}.
        </p>
      </header>

      <section
        aria-labelledby="setup-heading"
        className="rounded-xl border border-stone-200 bg-white p-6"
      >
        <h2 id="setup-heading" className="text-base font-semibold text-stone-900">
          სისტემა აეწყო
        </h2>
        <p className="mt-2 text-sm text-stone-700 leading-relaxed">
          ავტორიზაცია, უფლებები და ფაილების საცავი მუშაობს. მოდულები ეტაპობრივად
          ემატება — თითოეული მაშინ გამოჩნდება მენიუში, როცა რეალურად იმუშავებს.
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { term: 'თქვენი როლი', detail: user?.role === 'SUPER_ADMIN' ? 'სუპერ ადმინისტრატორი' : 'თანამშრომელი' },
            { term: 'მომხმარებელი', detail: user?.username || '—' },
            { term: 'სტატუსი', detail: user?.status === 'ACTIVE' ? 'აქტიური' : 'გათიშული' },
          ].map((item) => (
            <div key={item.term} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                {item.term}
              </dt>
              <dd className="mt-1 text-sm font-medium text-stone-900">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};
