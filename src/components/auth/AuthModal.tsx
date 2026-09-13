import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { User } from '../../types.ts';
import { useI18n, LanguageSwitcher } from '../../lib/i18n.tsx';
import { useModalA11y } from '../../lib/useModalA11y.ts';
import type { LegalSlug } from '../../content/legal.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
  onNavigateLegal: (slug: LegalSlug) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
  onNavigateLegal
}) => {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { ref: dialogRef } = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error(lang === 'ka' ? 'გთხოვთ შეიყვანოთ თქვენი სახელი' : 'Please enter your full name');
        if (!email.trim()) throw new Error(lang === 'ka' ? 'გთხოვთ შეიყვანოთ ელ.ფოსტა' : 'Please enter your email');
        if (password.length < 6) throw new Error(lang === 'ka' ? 'პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან' : 'Password must be at least 6 characters');
        if (!termsAccepted) {
          throw new Error(
            lang === 'ka'
              ? 'რეგისტრაციისთვის საჭიროა წესებისა და კონფიდენციალურობის პოლიტიკის მიღება.'
              : 'Please accept the Terms and the Privacy Policy to create an account.'
          );
        }

        const res = await api.auth.register(email.trim(), password, name.trim());
        onSuccess(res.user);
        onClose();
      } else {
        if (!email.trim() || !password) throw new Error(lang === 'ka' ? 'გთხოვთ შეიყვანოთ ელ.ფოსტა და პაროლი' : 'Please enter your email and password');
        const res = await api.auth.login(email.trim(), password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (lang === 'ka' ? 'ავტორიზაცია ვერ მოხერხდა. სცადეთ თავიდან.' : 'Authentication failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.demoLogin();
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || (lang === 'ka' ? 'დემო მომხმარებლით შესვლა ვერ მოხერხდა' : 'Failed to sign in as demo user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        id="auth-modal-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative flex flex-col max-h-[92dvh]"
      >
        {/* Close button */}
        <button
          id="auth-close-btn"
          onClick={onClose}
          aria-label={lang === 'ka' ? 'ფანჯრის დახურვა' : 'Close this dialog'}
          className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center text-stone-600 hover:text-stone-900 bg-white/90 hover:bg-stone-100 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 id="auth-modal-title" className="text-2xl font-serif font-bold text-stone-900">
              {mode === 'login' ? t('auth', 'welcomeBack') : t('auth', 'createAccount')}
            </h2>
            <p className="text-sm text-stone-600 mt-1.5">
              {mode === 'login'
                ? t('auth', 'loginSubtitle')
                : t('auth', 'registerSubtitle')}
            </p>
          </div>

          {/* Instant Demo Login Button */}
          <div className="mb-5">
            <button
              id="auth-demo-instant-btn"
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200 text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-700" aria-hidden="true" />
              <span>{t('auth', 'demoLogin')}</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink mx-3 text-xs text-stone-600 uppercase tracking-wider">
              {t('auth', 'orCredentials')}
            </span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-center gap-2"
            >
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name-input" className="block text-xs font-semibold text-stone-800 mb-1.5">
                  {t('auth', 'fullName')}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-500 absolute left-3 top-3" aria-hidden="true" />
                  <input
                    id="auth-name-input"
                    autoComplete="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ka' ? 'მაგ. გიორგი ბერიძე' : 'e.g. David Miller'}
                    className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-semibold text-stone-800 mb-1.5">
                {t('auth', 'email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3" aria-hidden="true" />
                <input
                  id="auth-email-input"
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@guestbook.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password-input" className="block text-xs font-semibold text-stone-800 mb-1.5">
                {t('auth', 'password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" aria-hidden="true" />
                <input
                  id="auth-password-input"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="pt-1">
                <label
                  htmlFor="auth-terms-checkbox"
                  className="flex items-start gap-2.5 text-xs text-stone-800 leading-relaxed cursor-pointer"
                >
                  <input
                    id="auth-terms-checkbox"
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 rounded border-stone-400 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 cursor-pointer"
                  />
                  <span>
                    {lang === 'ka' ? 'ვეთანხმები ' : 'I agree to the '}
                    <button
                      type="button"
                      onClick={() => onNavigateLegal('terms')}
                      className="font-semibold underline underline-offset-2 hover:text-stone-950 cursor-pointer"
                    >
                      {lang === 'ka' ? 'წესებსა და პირობებს' : 'Terms and Conditions'}
                    </button>
                    {lang === 'ka' ? ' და ' : ' and the '}
                    <button
                      type="button"
                      onClick={() => onNavigateLegal('privacy')}
                      className="font-semibold underline underline-offset-2 hover:text-stone-950 cursor-pointer"
                    >
                      {lang === 'ka' ? 'კონფიდენციალურობის პოლიტიკას' : 'Privacy Policy'}
                    </button>
                    {lang === 'ka' ? '.' : '.'}
                  </span>
                </label>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{t('auth', 'loading')}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? t('auth', 'signIn') : t('auth', 'createAccount')}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center text-xs text-stone-600">
            {mode === 'login' ? (
              <>
                {t('auth', 'noAccount')}{' '}
                <button
                  id="auth-switch-register-btn"
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-semibold text-stone-900 hover:underline cursor-pointer"
                >
                  {t('auth', 'createOne')}
                </button>
              </>
            ) : (
              <>
                {t('auth', 'haveAccount')}{' '}
                <button
                  id="auth-switch-login-btn"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-semibold text-stone-900 hover:underline cursor-pointer"
                >
                  {t('auth', 'signInHere')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
