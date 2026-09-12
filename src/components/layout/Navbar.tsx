import React from 'react';
import { BookOpen, Sparkles, User as UserIcon, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';
import { User } from '../../types.ts';
import { useI18n, LanguageSwitcher } from '../../lib/i18n.tsx';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenDemo: () => void;
  onOpenDashboard: () => void;
  onOpenWizard: () => void;
  onGoHome: () => void;
  onOpenDemoBook: () => void;
  onLogout: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onOpenDemo,
  onOpenDashboard,
  onOpenWizard,
  onGoHome,
  onOpenDemoBook,
  onLogout,
  currentView
}) => {
  const { t, lang } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <button
          id="nav-brand-button"
          onClick={onGoHome}
          className="flex items-center gap-2 sm:gap-2.5 group text-left cursor-pointer focus:outline-none min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-stone-900 text-amber-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-amber-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="hidden min-[360px]:block font-serif font-bold text-base sm:text-lg tracking-tight text-stone-900 leading-tight whitespace-nowrap">
              Memoria
            </span>
            {/* The tagline is the first thing to go when the bar gets tight. */}
            <span className="hidden sm:block text-[11px] uppercase tracking-wider text-stone-600 truncate">
              {lang === 'ka' ? 'სტუმრების წიგნი' : 'Digital Guest Book'}
            </span>
          </div>
        </button>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          <button
            id="nav-home-btn"
            onClick={onGoHome}
            className={`text-sm font-medium transition-colors hover:text-stone-900 cursor-pointer ${
              currentView === 'landing' ? 'text-stone-900 font-semibold' : 'text-stone-600'
            }`}
          >
            {t('nav', 'home')}
          </button>
          <button
            id="nav-demo-guestbook-btn"
            onClick={onOpenDemoBook}
            className="text-sm font-medium text-stone-600 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-rose-500" aria-hidden="true" />
            <span>{t('nav', 'demoGuestbook')}</span>
          </button>
          {currentUser && (
            <button
              id="nav-dashboard-link-btn"
              onClick={onOpenDashboard}
              className={`text-sm font-medium transition-colors hover:text-stone-900 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin-dashboard' ? 'text-stone-900 font-semibold' : 'text-stone-600'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>{t('nav', 'adminDashboard')}</span>
            </button>
          )}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                id="nav-create-wizard-btn"
                onClick={onOpenWizard}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('nav', 'newGuestbook')}</span>
              </button>
              <button
                id="nav-dashboard-user-btn"
                onClick={onOpenDashboard}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
                <span className="max-w-[120px] truncate">{currentUser.name}</span>
              </button>
              <button
                id="nav-logout-btn"
                onClick={onLogout}
                title={t('nav', 'logout')}
                aria-label={t('nav', 'logout')}
                className="p-2 text-stone-600 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="nav-demo-login-btn"
                onClick={onOpenDemo}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 rounded-lg transition-colors cursor-pointer"
              >
                <span>{t('nav', 'demoAdmin')}</span>
              </button>
              <button
                id="nav-login-btn"
                onClick={() => onOpenAuth('login')}
                className="hidden min-[360px]:inline-flex px-2 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-stone-700 whitespace-nowrap hover:text-stone-900 transition-colors cursor-pointer"
              >
                {t('nav', 'login')}
              </button>
              <button
                id="nav-get-started-btn"
                onClick={() => onOpenAuth('register')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white whitespace-nowrap bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-all hover:shadow cursor-pointer"
              >
                <span>{t('nav', 'getStarted')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
