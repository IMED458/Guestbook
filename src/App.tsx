import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.tsx';
import { LandingPage } from './components/landing/LandingPage.tsx';
import { GuestBookPublicView } from './components/guest-book/GuestBookPublicView.tsx';
import { GuestBookWizard } from './components/dashboard/GuestBookWizard.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { AdminRouter } from './pages/admin/AdminRouter.tsx';
import { AlbumUploadPage } from './pages/public/AlbumUploadPage.tsx';
import { ClientDashboard } from './pages/client/ClientDashboard.tsx';
import { EventLandingPage } from './pages/public/EventLandingPage.tsx';
import { OrderRequestPage } from './pages/public/OrderRequestPage.tsx';


import { LegalPage } from './components/legal/LegalPage.tsx';
import { SiteFooter } from './components/layout/SiteFooter.tsx';
import { CookieBanner } from './components/common/CookieBanner.tsx';
import { api } from './lib/api.ts';
import { useI18n } from './lib/i18n.tsx';
import { LEGAL_SLUGS, type LegalSlug } from './content/legal.ts';
import { navigate } from './lib/routes.ts';
import { User, GuestBook } from './types.ts';

type AppView = 'landing' | 'public' | 'dashboard' | 'legal' | 'login' | 'admin' | 'album' | 'client' | 'event' | 'request';

const isLegalSlug = (value: string): value is LegalSlug =>
  (LEGAL_SLUGS as string[]).includes(value);

export default function App() {
  const { lang } = useI18n();
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeSlug, setActiveSlug] = useState<string>('wedding-nika-ana');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingWizard, setPendingWizard] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialBookIdForDashboard, setInitialBookIdForDashboard] = useState<string | undefined>(undefined);
  const [legalSlug, setLegalSlug] = useState<LegalSlug>('privacy');
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

  // Hash routing keeps every deep link a single static document, which is what
  // GitHub Pages serves — no rewrite rules, no 404 on refresh or direct link.
  const updateRouteFromUrl = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');

    // The new back office. Everything below this point is the original
    // guest-book app, which keeps working untouched while the CRM is built
    // out beside it.
    if (hash === 'login') {
      setCurrentView('login');
      return;
    }

    if (hash === 'request') {
      setCurrentView('request');
      return;
    }

    if (hash === 'admin' || hash.startsWith('admin/')) {
      setCurrentView('admin');
      return;
    }

    if (hash === 'client' || hash.startsWith('client/')) {
      setCurrentView('client');
      return;
    }

    if (hash.startsWith('e/')) {
      const slug = hash.slice(2).split(/[/?]/)[0];
      if (slug) {
        setActiveSlug(decodeURIComponent(slug));
        setCurrentView('event');
        return;
      }
    }

    if (hash.startsWith('a/')) {
      const slug = hash.slice(2).split(/[/?]/)[0];
      if (slug) {
        setActiveSlug(decodeURIComponent(slug));
        setCurrentView('album');
        return;
      }
    }

    if (hash.startsWith('g/')) {
      const slug = hash.slice(2).split(/[/?]/)[0];
      if (slug) {
        setActiveSlug(decodeURIComponent(slug));
        setCurrentView('public');
        return;
      }
    }

    if (hash.startsWith('legal/')) {
      const slug = hash.slice(6).split(/[/?]/)[0];
      if (isLegalSlug(slug)) {
        setLegalSlug(slug);
        setCurrentView('legal');
        return;
      }
    }

    // The old back office lived at #/dashboard. Forward it rather than
    // breaking a bookmark or a link already sent to somebody.
    if (hash === 'dashboard' || hash.startsWith('dashboard/')) {
      window.location.replace(`${window.location.pathname}${window.location.search}#/admin`);
      setCurrentView('admin');
      return;
    }

    setCurrentView('landing');
  };

  const navigateToLegal = (slug: LegalSlug) => {
    setLegalSlug(slug);
    setCurrentView('legal');
    window.location.hash = `#/legal/${slug}`;
    window.scrollTo({ top: 0 });
  };

  const navigateTo = (view: AppView, slug?: string) => {
    setCurrentView(view);
    if (view === 'public' && slug) {
      setActiveSlug(slug);
      window.location.hash = `#/g/${slug}`;
    } else if (view === 'dashboard') {
      window.location.hash = '#/admin';
    } else {
      window.location.hash = '#/';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Restore the Firebase session, if there is one.
    api.auth
      .me()
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));

    updateRouteFromUrl();

    window.addEventListener('hashchange', updateRouteFromUrl);
    return () => window.removeEventListener('hashchange', updateRouteFromUrl);
  }, []);

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenCreate = () => {
    if (!currentUser) {
      // Prompt sign in / sign up first, then continue into the wizard.
      setPendingWizard(true);
      openAuth('register');
    } else {
      setIsWizardOpen(true);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (pendingWizard) {
      setPendingWizard(false);
      setIsWizardOpen(true);
    } else {
      navigate('admin');
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await api.auth.demoLogin();
      setCurrentUser(res.user);
      navigate('admin');
    } catch {
      openAuth('login');
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    navigateTo('landing');
  };

  const handleGuestBookCreated = (newBook: GuestBook) => {
    setIsWizardOpen(false);
    setInitialBookIdForDashboard(newBook.id);
    navigate('admin');
  };

  if (currentView === 'login') {
    return <LoginPage />;
  }

  if (currentView === 'request') {
    return <OrderRequestPage />;
  }

  if (currentView === 'admin') {
    return <AdminRouter />;
  }

  if (currentView === 'client') {
    return <ClientDashboard />;
  }

  if (currentView === 'album') {
    return <AlbumUploadPage slug={activeSlug} />;
  }

  if (currentView === 'event') {
    return <EventLandingPage slug={activeSlug} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-rose-100 selection:text-rose-900">
      <a href="#main-content" className="skip-link">
        {lang === 'ka' ? 'გადასვლა მთავარ შიგთავსზე' : 'Skip to main content'}
      </a>

      {/* Top Navbar: Show on Landing and Dashboard */}
      {currentView !== 'public' && (
        <Navbar
          currentUser={currentUser}
          currentView={currentView === 'dashboard' ? 'admin-dashboard' : currentView}
          onOpenAuth={openAuth}
          onOpenDemo={handleDemoLogin}
          onOpenDemoBook={() => navigateTo('public', 'wedding-nika-ana')}
          onOpenWizard={handleOpenCreate}
          onOpenDashboard={() => navigate('admin')}
          onGoHome={() => navigateTo('landing')}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <LandingPage
            onOpenCreate={handleOpenCreate}
            onViewDemo={() => navigateTo('public', 'wedding-nika-ana')}
            onOpenAuth={() => openAuth('register')}
          />
        )}

        {currentView === 'public' && (
          <GuestBookPublicView
            slug={activeSlug}
            onBackToHome={() => navigateTo('landing')}
            onOpenDashboard={currentUser ? () => navigate('admin') : undefined}
          />
        )}

        {currentView === 'legal' && (
          <LegalPage
            slug={legalSlug}
            onBackToHome={() => navigateTo('landing')}
            onNavigateLegal={navigateToLegal}
          />
        )}
      </main>

      {/* The dashboard is a full-height app shell of its own; everywhere else
          gets the shared footer with the legal links and operator details. */}
      {currentView !== 'dashboard' && (
        <SiteFooter
          onNavigateLegal={navigateToLegal}
          onOpenCookieSettings={() => setCookieSettingsOpen(true)}
        />
      )}

      <CookieBanner
        forceOpen={cookieSettingsOpen}
        onDismissForced={() => setCookieSettingsOpen(false)}
        onNavigateLegal={navigateToLegal}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onNavigateLegal={(slug) => {
          setIsAuthModalOpen(false);
          navigateToLegal(slug);
        }}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingWizard(false);
        }}
        onSuccess={handleAuthSuccess}
      />

      <GuestBookWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleGuestBookCreated}
      />
    </div>
  );
}
