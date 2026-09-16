import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, LogIn, User as UserIcon } from 'lucide-react';
import { Field, inputClass } from '../../components/ui/Field.tsx';
import { useSession } from '../../lib/session.tsx';
import { looksLikeEmail } from '../../domain/username.ts';
import { navigate } from '../../lib/routes.ts';
import { SITE } from '../../lib/site-config.ts';

/**
 * Signing in.
 *
 * There is no registration here on purpose: accounts are created by the
 * administration, never by the visitor. A guest who arrives by QR needs no
 * account at all and never sees this page.
 */
export const LoginPage: React.FC = () => {
  const { signIn, loading, user } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Someone already signed in has no business on the sign-in page.
  useEffect(() => {
    if (!user) return;
    navigate(user.role === 'CLIENT' ? 'client' : 'admin');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('შეიყვანეთ მომხმარებელი');
      return;
    }
    if (!password) {
      setError('შეიყვანეთ პაროლი');
      return;
    }

    try {
      const profile = await signIn(username, password);
      navigate(
        profile.mustChangePassword
          ? 'client/profile'
          : profile.role === 'CLIENT'
            ? 'client'
            : 'admin'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შესვლა ვერ მოხერხდა');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-stone-900 text-amber-100 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900">{SITE.productName}</h1>
          <p className="mt-1 text-sm text-stone-600">სამართავი პანელი</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm"
        >
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-[13px] font-medium text-rose-800"
            >
              {error}
            </div>
          )}

          <Field
            id="login-username"
            label="მომხმარებელი"
            required
            hint={
              looksLikeEmail(username)
                ? 'აქ მომხმარებელი იწერება, არა ელფოსტა — მაგალითად: imedo'
                : undefined
            }
          >
            {(describedBy) => (
              <div className="relative">
                <UserIcon
                  className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  ref={usernameRef}
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby={describedBy}
                  placeholder="imedo"
                  className={`${inputClass} pl-9`}
                />
              </div>
            )}
          </Field>

          <Field id="login-password" label="პაროლი" required>
            {(describedBy) => (
              <div className="relative">
                <KeyRound
                  className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-describedby={describedBy}
                  placeholder="••••••••"
                  className={`${inputClass} pl-9`}
                />
              </div>
            )}
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>მოწმდება...</span>
              </>
            ) : (
              <span>შესვლა</span>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-stone-600 leading-relaxed">
          ანგარიშს ადმინისტრაცია ქმნის.
          <br />
          თუ მონაცემები დაგავიწყდათ, დაუკავშირდით მას.
        </p>
      </div>
    </main>
  );
};
