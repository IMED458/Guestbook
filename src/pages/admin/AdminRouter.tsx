import React, { useEffect, useState } from 'react';
import { ADMIN_NAV } from '../../lib/nav.ts';
import { matchRoute, navigate, normalizeHash } from '../../lib/routes.ts';
import { useSession } from '../../lib/session.tsx';
import { AdminLayout } from './AdminLayout.tsx';
import { DashboardPage } from './DashboardPage.tsx';
import { ClientsPage } from './ClientsPage.tsx';
import { CatalogPage } from './CatalogPage.tsx';
import { UsersPage } from './UsersPage.tsx';
import { EventsPage } from './EventsPage.tsx';
import { OrdersPage } from './OrdersPage.tsx';
import { OrderDetailsPage } from './OrderDetailsPage.tsx';
import { AlbumsPage } from './AlbumsPage.tsx';
import { QrStudioPage } from './QrStudioPage.tsx';
import { EmailPage } from './EmailPage.tsx';
import { ActivityPage } from './ActivityPage.tsx';
import { SettingsPage } from './SettingsPage.tsx';
import { RequestsPage } from './RequestsPage.tsx';
import { ClientDetailsPage } from './ClientDetailsPage.tsx';

/**
 * Chooses the back-office page for the current hash, after checking that the
 * person may actually be there. The permission comes from the same route table
 * the sidebar reads, so a link and its guard cannot disagree.
 */
export const AdminRouter: React.FC = () => {
  const { user, ready, isAdmin, can, isSuperAdmin } = useSession();
  const [path, setPath] = useState(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setPath(normalizeHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('login');
      return;
    }
    if (!isAdmin) navigate('client');
  }, [ready, user, isAdmin]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-sm text-stone-600">იტვირთება...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const matched = matchRoute(`#/${path}`);
  const needed = matched?.definition.permissions;
  const allowed = !needed || needed.some((permission) => can(permission));

  let page: React.ReactNode;

  if (!allowed) {
    page = (
      <Denied
        title="წვდომა შეზღუდულია"
        message="ამ განყოფილებაზე წვდომა თქვენს ანგარიშს არ აქვს. საჭიროების შემთხვევაში მიმართეთ ადმინისტრატორს."
      />
    );
  } else {
    switch (path) {
      case 'admin':
        page = <DashboardPage />;
        break;
      case 'admin/clients':
        page = <ClientsPage />;
        break;
      case 'admin/catalog':
        page = <CatalogPage />;
        break;
      case 'admin/users':
        page = <UsersPage />;
        break;
      case 'admin/events':
        page = <EventsPage />;
        break;
      case 'admin/orders':
        page = <OrdersPage />;
        break;
      case 'admin/albums':
        page = <AlbumsPage />;
        break;
      case 'admin/qr':
        page = <QrStudioPage />;
        break;
      case 'admin/email':
        page = <EmailPage />;
        break;
      case 'admin/requests':
        page = <RequestsPage />;
        break;
      case 'admin/activity':
        page = <ActivityPage />;
        break;
      case 'admin/settings':
        page = <SettingsPage />;
        break;
      default:
        // Detail routes carry an id, so they are matched by pattern.
        if (matched?.definition.pattern === 'admin/orders/:id') {
          page = <OrderDetailsPage orderId={matched.params.id} />;
        } else if (matched?.definition.pattern === 'admin/clients/:id') {
          page = <ClientDetailsPage clientId={matched.params.id} />;
        } else {
          page = <ComingSoon path={path} isSuperAdmin={isSuperAdmin} />;
        }
    }
  }

  return <AdminLayout>{page}</AdminLayout>;
};

const Denied: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="p-6 lg:p-8">
    <div className="max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h1 className="text-base font-semibold text-amber-900">{title}</h1>
      <p className="mt-2 text-sm text-amber-900 leading-relaxed">{message}</p>
    </div>
  </div>
);

/**
 * Names the module honestly rather than showing an empty screen that looks
 * broken. Modules are added in dependency order; this says which one is next.
 */
const ComingSoon: React.FC<{ path: string; isSuperAdmin: boolean }> = ({ path }) => {
  const label =
    ADMIN_NAV.flatMap((section) => section.items).find((item) => item.pattern === path)?.label ||
    'ეს განყოფილება';

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-semibold text-stone-900">{label}</h1>
      <div className="mt-5 max-w-lg rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-700 leading-relaxed">
          ეს მოდული ჯერ არ არის ჩართული. სისტემა ეტაპობრივად ეწყობა და თითოეული
          განყოფილება მაშინ ემატება, როცა რეალურად მუშაობს — ცრუ ღილაკები არ იდგმება.
        </p>
        <p className="mt-3 text-[13px] text-stone-600 leading-relaxed">
          თუ ეს გზავნილი მოულოდნელად ხედავთ, ბმული არასწორია — დაბრუნდით მენიუთი.
        </p>
      </div>
    </div>
  );
};
