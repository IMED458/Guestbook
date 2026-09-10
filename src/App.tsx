import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.tsx';
import { LandingPage } from './components/landing/LandingPage.tsx';
import { GuestBookPublicView } from './components/guest-book/GuestBookPublicView.tsx';
import { AdminDashboard } from './components/dashboard/AdminDashboard.tsx';
import { GuestBookWizard } from './components/dashboard/GuestBookWizard.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { api } from './lib/api.ts';
import { User, GuestBook } from './types.ts';

type AppView = 'landing' | 'public' | 'dashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeSlug, setActiveSlug] = useState<string>('wedding-nika-ana');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingWizard, setPendingWizard] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialBookIdForDashboard, setInitialBookIdForDashboard] = useState<string | undefined>(undefined);

  // Hash routing keeps every deep link a single static document, which is what
  // GitHub Pages serves — no rewrite rules, no 404 on refresh or direct link.
  const updateRouteFromUrl = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');

    if (hash.startsWith('g/')) {
      const slug = hash.slice(2).split(/[/?]/)[0];
      if (slug) {
        setActiveSlug(decodeURIComponent(slug));
        setCurrentView('public');
        return;
      }
    }

    if (hash === 'dashboard' || hash.startsWith('dashboard/')) {
      setCurrentView('dashboard');
      return;
    }

    setCurrentView('landing');
  };

  const navigateTo = (view: AppView, slug?: string) => {
    setCurrentView(view);
    if (view === 'public' && slug) {
      setActiveSlug(slug);
      window.location.hash = `#/g/${slug}`;
    } else if (view === 'dashboard') {
      window.location.hash = '#/dashboard';
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
      navigateTo('dashboard');
    }
  };

  const handleDemoLogin = async () => {
    try {
      const res = await api.auth.demoLogin();
      setCurrentUser(res.user);
      navigateTo('dashboard');
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
    setInitialBookIdForDashboard(newBook.id);
    navigateTo('dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* Top Navbar: Show on Landing and Dashboard */}
      {currentView !== 'public' && (
        <Navbar
          currentUser={currentUser}
          currentView={currentView === 'dashboard' ? 'admin-dashboard' : currentView}
          onOpenAuth={openAuth}
          onOpenDemo={handleDemoLogin}
          onOpenDemoBook={() => navigateTo('public', 'wedding-nika-ana')}
          onOpenWizard={handleOpenCreate}
          onOpenDashboard={() => navigateTo('dashboard')}
          onGoHome={() => navigateTo('landing')}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
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
            onOpenDashboard={currentUser ? () => navigateTo('dashboard') : undefined}
          />
        )}

        {currentView === 'dashboard' && (
          <AdminDashboard
            initialGuestBookId={initialBookIdForDashboard}
            onOpenWizard={() => setIsWizardOpen(true)}
            onViewPublicBook={(slug) => navigateTo('public', slug)}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
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
