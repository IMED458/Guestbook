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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialBookIdForDashboard, setInitialBookIdForDashboard] = useState<string | undefined>(undefined);

  // Sync with browser URL
  const updateRouteFromUrl = () => {
    const path = window.location.pathname;
    if (path.startsWith('/g/')) {
      const slug = path.replace('/g/', '').split('/')[0];
      if (slug) {
        setActiveSlug(slug);
        setCurrentView('public');
        return;
      }
    } else if (path === '/dashboard' || path.startsWith('/dashboard/')) {
      setCurrentView('dashboard');
      return;
    }
    setCurrentView('landing');
  };

  const navigateTo = (view: AppView, slug?: string) => {
    setCurrentView(view);
    if (view === 'public' && slug) {
      setActiveSlug(slug);
      window.history.pushState({}, '', `/g/${slug}`);
    } else if (view === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
    } else {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Check logged in user
    api.auth.me().then((user) => {
      if (user) setCurrentUser(user);
    }).catch(() => {});

    updateRouteFromUrl();

    const handlePopState = () => {
      updateRouteFromUrl();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenCreate = () => {
    if (!currentUser) {
      // Prompt sign in / sign up first
      setIsAuthModalOpen(true);
    } else {
      setIsWizardOpen(true);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    // If wizard was requested or user signed in to create, open wizard
    setIsWizardOpen(true);
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
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenCreate={handleOpenCreate}
          onOpenDashboard={() => navigateTo('dashboard')}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        {currentView === 'landing' && (
          <LandingPage
            onOpenCreate={handleOpenCreate}
            onViewDemo={() => navigateTo('public', 'wedding-nika-ana')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
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
        onClose={() => setIsAuthModalOpen(false)}
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
