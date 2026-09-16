import React, { useEffect, useState } from 'react';
import { GuestBookPublicView } from './components/guest-book/GuestBookPublicView.tsx';
import { LegalPage } from './components/legal/LegalPage.tsx';
import { SiteFooter } from './components/layout/SiteFooter.tsx';
import { CookieBanner } from './components/common/CookieBanner.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { AdminRouter } from './pages/admin/AdminRouter.tsx';
import { ClientDashboard } from './pages/client/ClientDashboard.tsx';
import { AlbumUploadPage } from './pages/public/AlbumUploadPage.tsx';
import { EventLandingPage } from './pages/public/EventLandingPage.tsx';
import { OrderRequestPage } from './pages/public/OrderRequestPage.tsx';
import { LEGAL_SLUGS, type LegalSlug } from './content/legal.ts';
import { navigate, normalizeHash } from './lib/routes.ts';

/**
 * The top-level router.
 *
 * Hash routing keeps every deep link a request for the single index.html a
 * static host serves, so a refresh or a shared link needs no rewrite rules.
 *
 * The marketing site that used to sit at `#/` is archived under
 * `src/archive/public-site/`, not deleted. Nobody arrives at a front page:
 * staff and clients sign in, and guests reach `#/g/`, `#/a/` or `#/e/`
 * straight from a QR code.
 */
type AppView =
  | 'login'
  | 'request'
  | 'admin'
  | 'client'
  | 'guestbook'
  | 'album'
  | 'event'
  | 'legal';

const isLegalSlug = (value: string): value is LegalSlug =>
  (LEGAL_SLUGS as string[]).includes(value);

/** Public surfaces carry the footer and the cookie choice; the apps do not. */
const PUBLIC_VIEWS: AppView[] = ['guestbook', 'album', 'event', 'request', 'legal'];

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [slug, setSlug] = useState('');
  const [legalSlug, setLegalSlug] = useState<LegalSlug>('privacy');
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  useEffect(() => {
    const resolve = () => {
      const hash = normalizeHash(window.location.hash);

      // A guest scanning a QR code lands on one of these three.
      for (const [prefix, next] of [
        ['g/', 'guestbook'],
        ['a/', 'album'],
        ['e/', 'event'],
      ] as [string, AppView][]) {
        if (hash.startsWith(prefix)) {
          const value = hash.slice(prefix.length).split(/[/?]/)[0];
          if (value) {
            setSlug(decodeURIComponent(value));
            setView(next);
            return;
          }
        }
      }

      if (hash.startsWith('legal/')) {
        const value = hash.slice(6).split(/[/?]/)[0];
        if (isLegalSlug(value)) {
          setLegalSlug(value);
          setView('legal');
          return;
        }
      }

      if (hash === 'admin' || hash.startsWith('admin/')) {
        setView('admin');
        return;
      }

      if (hash === 'client' || hash.startsWith('client/')) {
        setView('client');
        return;
      }

      if (hash === 'request') {
        setView('request');
        return;
      }

      // `#/dashboard` was the previous back office; forward it so an old
      // bookmark still lands somewhere useful.
      if (hash === 'dashboard' || hash.startsWith('dashboard/')) {
        navigate('admin');
        setView('admin');
        return;
      }

      // Everything else, the empty hash included, is the sign-in page.
      setView('login');
    };

    resolve();
    window.addEventListener('hashchange', resolve);
    return () => window.removeEventListener('hashchange', resolve);
  }, []);

  const content = (() => {
    switch (view) {
      case 'admin':
        return <AdminRouter />;
      case 'client':
        return <ClientDashboard />;
      case 'guestbook':
        return <GuestBookPublicView slug={slug} onBackToHome={() => navigate('login')} />;
      case 'album':
        return <AlbumUploadPage slug={slug} />;
      case 'event':
        return <EventLandingPage slug={slug} />;
      case 'request':
        return <OrderRequestPage />;
      case 'legal':
        return (
          <LegalPage
            slug={legalSlug}
            onBackToHome={() => navigate('login')}
            onNavigateLegal={(next) => {
              setLegalSlug(next);
              navigate('legal/:slug', { slug: next });
            }}
          />
        );
      default:
        return <LoginPage />;
    }
  })();

  if (!PUBLIC_VIEWS.includes(view)) {
    return content;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <a href="#main-content" className="skip-link">
        გადასვლა მთავარ შიგთავსზე
      </a>

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
        {content}
      </main>

      <SiteFooter
        onNavigateLegal={(next) => {
          setLegalSlug(next);
          navigate('legal/:slug', { slug: next });
        }}
        onOpenCookieSettings={() => setCookieSettingsOpen(true)}
      />

      <CookieBanner
        forceOpen={cookieSettingsOpen}
        onDismissForced={() => setCookieSettingsOpen(false)}
        onNavigateLegal={(next) => {
          setLegalSlug(next);
          navigate('legal/:slug', { slug: next });
        }}
      />
    </div>
  );
}
