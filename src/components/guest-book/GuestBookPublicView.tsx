import React, { useState, useEffect } from 'react';
import {
  Heart,
  Share2,
  Calendar,
  Lock,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Loader2,
  Shield,
  Clock,
  Play,
  PenTool
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { publicGuestBookUrl } from '../../lib/urls.ts';
import { GuestBook, GuestMessage, FontStyle } from '../../types.ts';
import { LeaveMessageModal } from './LeaveMessageModal.tsx';
import { ShareModal } from './ShareModal.tsx';
import { ImageLightbox } from './ImageLightbox.tsx';
import { getFontFamily, isDarkColor, FONT_OPTIONS } from '../../lib/theme.ts';
import { useI18n, LanguageSwitcher } from '../../lib/i18n.tsx';

interface GuestBookPublicViewProps {
  slug: string;
  onBackToHome: () => void;
  onOpenDashboard?: () => void;
}

const EMOJIS = ['❤️', '🥰', '😂', '👏', '🎉'];

export const GuestBookPublicView: React.FC<GuestBookPublicViewProps> = ({
  slug,
  onBackToHome,
  onOpenDashboard
}) => {
  const { t, lang, formatEventDate, translateRelationship, translateEventType } = useI18n();
  const [guestBook, setGuestBook] = useState<GuestBook | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Private password gate
  const [isPrivateLocked, setIsPrivateLocked] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modals
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxGuest, setLightboxGuest] = useState<string | undefined>(undefined);
  const [previewFont, setPreviewFont] = useState<FontStyle | null>(null);

  const loadGuestBook = async (passwordAttempt?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.guestBooks.getBySlug(slug, passwordAttempt);
      setGuestBook(res.guestBook);
      setMessages(res.messages || []);
      setIsOwner(res.isOwner);
      setIsPrivateLocked(false);
    } catch (err: any) {
      if (err.message?.includes('password protected')) {
        setIsPrivateLocked(true);
      } else {
        setError(err.message || 'Could not load guest book.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuestBook();
  }, [slug]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    try {
      await api.guestBooks.verifyPassword(slug, enteredPassword);
      await loadGuestBook(enteredPassword);
    } catch {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentCounts = { ...(msg.reactions || {}) };
        const userReactions = [...(msg.userReactions || [])];
        const hasReacted = userReactions.includes(emoji);

        if (hasReacted) {
          // Remove
          currentCounts[emoji] = Math.max(0, (currentCounts[emoji] || 1) - 1);
          if (currentCounts[emoji] === 0) delete currentCounts[emoji];
          const updatedUserReactions = userReactions.filter((r) => r !== emoji);
          return { ...msg, reactions: currentCounts, userReactions: updatedUserReactions };
        } else {
          // Add
          currentCounts[emoji] = (currentCounts[emoji] || 0) + 1;
          return { ...msg, reactions: currentCounts, userReactions: [...userReactions, emoji] };
        }
      })
    );

    try {
      await api.messages.toggleReaction(messageId, emoji);
    } catch {
      // Revert if failed
      loadGuestBook();
    }
  };

  const handleMessageAdded = (newMsg: GuestMessage) => {
    if (!guestBook?.isModerated) {
      setMessages((prev) => [newMsg, ...prev]);
    }
  };

  if (loading && !guestBook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500 mb-3" />
        <p className="text-sm text-stone-600 font-serif">
          {lang === 'ka' ? 'სტუმრების წიგნი იტვირთება...' : 'Opening guest book memories...'}
        </p>
      </div>
    );
  }

  if (error && !guestBook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4 text-center">
        <div className="max-w-md p-8 bg-white rounded-2xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-serif font-bold text-stone-900 mb-2">
            {lang === 'ka' ? 'სტუმრების წიგნი ვერ მოიძებნა' : 'Guest Book Not Found'}
          </h2>
          <p className="text-sm text-stone-600 mb-6">{error}</p>
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            {t('common', 'back')}
          </button>
        </div>
      </div>
    );
  }

  // Password Lock Screen for private guest books
  if (isPrivateLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-900/95 text-white">
        <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-serif font-bold">
            {lang === 'ka' ? 'დაცული სტუმრების წიგნი' : 'Private Guest Book'}
          </h2>
          <p className="text-xs text-stone-600 mt-2 mb-6">
            {lang === 'ka'
              ? 'ეს წიგნი დახურულია. გთხოვთ შეიყვანოთ მოწვევაში მითითებული პაროლი გასაგრძელებლად.'
              : 'This celebration is private. Please enter the password provided on your invitation to continue.'}
          </p>

          {passwordError && (
            <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              required
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              placeholder={lang === 'ka' ? 'შეიყვანეთ პაროლი...' : 'Enter password...'}
              className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
            />

            <button
              type="submit"
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {lang === 'ka' ? 'სტუმრების წიგნის გახსნა' : 'Enter Guest Book'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-800 flex items-center justify-between">
            <button
              onClick={onBackToHome}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
            >
              ← {t('common', 'back')}
            </button>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    );
  }

  if (!guestBook) return null;

  const theme = guestBook.theme;
  const isDark = isDarkColor(theme.bgColor);
  const effectiveFontStyle = previewFont || theme.fontStyle || 'serif';
  const fontFamily = getFontFamily(effectiveFontStyle);

  // Dynamic card styling classes
  const getCardClasses = () => {
    switch (theme.cardStyle) {
      case 'border':
        return isDark
          ? 'bg-stone-900 border border-stone-800 shadow-none'
          : 'bg-white border-2 border-stone-200/90 shadow-none';
      case 'elevated':
        return isDark
          ? 'bg-stone-900/90 border border-stone-800 shadow-xl'
          : 'bg-white border border-stone-100 shadow-lg shadow-stone-200/50';
      case 'soft':
      default:
        return isDark
          ? 'bg-stone-900/80 border border-stone-800/60 shadow-sm'
          : 'bg-white border border-stone-200/70 shadow-xs';
    }
  };

  const getButtonClasses = () => {
    switch (theme.buttonStyle) {
      case 'pill':
        return 'rounded-full';
      case 'minimal':
        return 'rounded-lg border shadow-none';
      case 'rounded':
      default:
        return 'rounded-xl';
    }
  };

  const currentUrl = publicGuestBookUrl(guestBook.slug);

  return (
    <div
      className="min-h-screen transition-colors duration-300 font-sans"
      style={{
        backgroundColor: theme.bgColor
      }}
    >
      {/* Top Floating Control Bar */}
      <div className="sticky top-0 z-30 w-full backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-colors duration-300"
        style={{
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          backgroundColor: isDark ? 'rgba(10, 10, 12, 0.75)' : 'rgba(255, 255, 255, 0.75)'
        }}
      >
        <button
          onClick={onBackToHome}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            isDark ? 'text-stone-300 hover:text-white hover:bg-white/10' : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common', 'back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {isOwner && onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                isDark ? 'bg-stone-800 text-stone-200 hover:bg-stone-700' : 'bg-stone-100 text-stone-800 hover:bg-stone-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('guestbook', 'adminView')}</span>
            </button>
          )}

          <button
            id="public-share-top-btn"
            onClick={() => setIsShareModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-stone-800 text-stone-300 hover:bg-stone-800'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('guestbook', 'shareQr')}</span>
          </button>

          <button
            id="public-leave-message-top-btn"
            onClick={() => setIsMessageModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 text-white transition-all shadow-sm cursor-pointer ${getButtonClasses()}`}
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{t('guestbook', 'leaveMessage')}</span>
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200/40 group">
          {/* Cover Image */}
          <div className="h-64 sm:h-96 w-full relative">
            <img
              src={guestBook.coverImage}
              alt={
                lang === 'ka'
                  ? `${guestBook.title} — ღონისძიების მთავარი ფოტო`
                  : `${guestBook.title} — event cover photo`
              }
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

            {/* Event Category Tag */}
            <div className="absolute top-4 left-4">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 text-stone-900 shadow-md backdrop-blur-sm">
                {translateEventType(guestBook.eventType)}
              </span>
            </div>

            {/* Bottom Content within Cover */}
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 text-white">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300 font-medium mb-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>{formatEventDate(guestBook.eventDate)}</span>
                <span>•</span>
                <span>
                  {t('guestbook', 'hostedBy')} {guestBook.hostNames}
                </span>
              </div>

              <h1
                className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold text-white tracking-tight leading-tight drop-shadow-md"
                style={{ fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, serif" }}
              >
                {guestBook.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Welcome Message Card */}
        <div
          className={`mt-6 p-6 sm:p-8 rounded-2xl text-center relative ${getCardClasses()}`}
        >
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-5 h-5 fill-current" />
          </div>

          <p
            className={`text-base sm:text-xl italic leading-relaxed max-w-2xl mx-auto font-serif ${
              isDark ? 'text-stone-200' : 'text-stone-800'
            }`}
            style={{ fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, serif" }}
          >
            &ldquo;{guestBook.welcomeMessage}&rdquo;
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              id="hero-leave-message-cta-btn"
              onClick={() => setIsMessageModalOpen(true)}
              className={`px-6 py-3 text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer ${getButtonClasses()}`}
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>{t('guestbook', 'leaveMessage')}</span>
            </button>

            <button
              id="hero-share-qr-cta-btn"
              onClick={() => setIsShareModalOpen(true)}
              className={`px-5 py-3 text-sm font-semibold transition-all border flex items-center gap-2 cursor-pointer ${getButtonClasses()} ${
                isDark
                  ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700'
                  : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>{t('guestbook', 'shareQr')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guest Messages Feed Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between mb-8 pb-4 border-b"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        >
          <div>
            <h2
              className={`text-2xl sm:text-3xl font-serif font-bold ${
                isDark ? 'text-white' : 'text-stone-900'
              }`}
            >
              {t('guestbook', 'memoryWall')}
            </h2>
            <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              {messages.length}{' '}
              {lang === 'ka'
                ? 'მოგონება გაზიარებული'
                : messages.length === 1
                ? 'memory shared'
                : 'memories shared'}
            </p>
          </div>

          <button
            onClick={() => setIsMessageModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-4 py-2 text-white transition-all cursor-pointer ${getButtonClasses()}`}
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{t('guestbook', 'writeNote')}</span>
          </button>
        </div>

        {/* Feed: Empty State or Grid */}
        {messages.length === 0 ? (
          <div
            className={`p-12 sm:p-16 rounded-3xl text-center border ${getCardClasses()}`}
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3
              className={`text-xl sm:text-2xl font-serif font-bold ${
                isDark ? 'text-white' : 'text-stone-900'
              }`}
            >
              {t('guestbook', 'emptyTitle')}
            </h3>
            <p
              className={`text-sm mt-2 max-w-sm mx-auto ${
                isDark ? 'text-stone-400' : 'text-stone-600'
              }`}
            >
              {t('guestbook', 'emptySubtitle')}
            </p>
            <div className="mt-6">
              <button
                id="empty-state-cta-btn"
                onClick={() => setIsMessageModalOpen(true)}
                className={`px-6 py-3 text-white text-sm font-semibold transition-all shadow-md cursor-pointer ${getButtonClasses()}`}
                style={{ backgroundColor: theme.primaryColor }}
              >
                {t('guestbook', 'leaveMessage')}
              </button>
            </div>
          </div>
        ) : (
          /* Responsive Pinterest / Instagram Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
            {messages.map((msg) => {
              const photo = msg.media?.find((m) => m.type === 'IMAGE');
              const video = msg.media?.find((m) => m.type === 'VIDEO');

              return (
                <div
                  key={msg.id}
                  className={`p-5 sm:p-6 rounded-2xl transition-all duration-300 hover:shadow-md ${getCardClasses()}`}
                >
                  {/* Card Header: Guest Name & Category & Timestamp */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4
                        className={`text-base font-bold tracking-tight ${
                          isDark ? 'text-white' : 'text-stone-900'
                        }`}
                      >
                        {msg.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(msg.createdAt).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {msg.relationship && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isDark
                            ? 'bg-stone-800 text-stone-300 border-stone-700'
                            : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {translateRelationship(msg.relationship)}
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <p
                    className={`text-base leading-relaxed whitespace-pre-line mb-4 transition-all font-medium ${
                      isDark ? 'text-stone-300' : 'text-stone-800'
                    }`}
                    style={{ fontFamily }}
                  >
                    {msg.message}
                  </p>

                  {/* Optional Photo Attachment */}
                  {photo && (
                    <div
                      onClick={() => {
                        setLightboxUrl(photo.url);
                        setLightboxGuest(msg.name);
                      }}
                      className="mb-4 rounded-xl overflow-hidden border border-stone-200/60 cursor-pointer group relative max-h-80 bg-stone-900"
                    >
                      <img
                        src={photo.url}
                        alt={
                          lang === 'ka'
                            ? `${msg.name}-ის მიერ ატვირთული ფოტო`
                            : `Photo uploaded by ${msg.name}`
                        }
                        className="w-full h-auto max-h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="px-3 py-1 bg-black/75 text-white text-xs rounded-full backdrop-blur-xs">
                          {t('guestbook', 'clickToExpand')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Optional Video Attachment */}
                  {video && (
                    <div className="mb-4 p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs flex items-center gap-2 text-stone-700">
                      <Play className="w-4 h-4 text-rose-500" />
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline font-medium text-rose-600"
                      >
                        {t('guestbook', 'watchVideo')} ({video.url})
                      </a>
                    </div>
                  )}

                  {/* Emoji Reactions Bar */}
                  <div
                    className="pt-3 border-t flex items-center justify-between flex-wrap gap-2"
                    style={{
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                    }}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJIS.map((emoji) => {
                        const count = msg.reactions?.[emoji] || 0;
                        const userHasReacted = msg.userReactions?.includes(emoji);

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            aria-pressed={Boolean(userHasReacted)}
                            aria-label={
                              lang === 'ka'
                                ? `რეაქცია ${emoji} ${msg.name}-ის ჩანაწერზე, ${count} რეაქცია`
                                : `React with ${emoji} to the entry by ${msg.name}, ${count} so far`
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                              userHasReacted
                                ? 'bg-rose-100 border border-rose-300 text-rose-800 scale-105 font-bold shadow-xs'
                                : count > 0
                                ? isDark
                                  ? 'bg-stone-800/80 border border-stone-700 text-stone-300'
                                  : 'bg-stone-100 border border-stone-200 text-stone-700'
                                : isDark
                                ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                                : 'text-stone-600 hover:text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <span aria-hidden="true">{emoji}</span>
                            {count > 0 && <span aria-hidden="true">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <LeaveMessageModal
        isOpen={isMessageModalOpen}
        guestBookSlug={guestBook.slug}
        isModerated={guestBook.isModerated}
        onClose={() => setIsMessageModalOpen(false)}
        onSuccess={handleMessageAdded}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        title={guestBook.title}
        url={currentUrl}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ImageLightbox
        url={lightboxUrl}
        guestName={lightboxGuest}
        onClose={() => setLightboxUrl(null)}
      />

      {/* Floating Demo Font Switcher (available on demo book) */}
      {slug === 'wedding-nika-ana' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] px-4 py-2.5 rounded-full bg-stone-900/90 text-white shadow-2xl backdrop-blur-md border border-stone-700/80 flex items-center gap-2 text-xs font-sans overflow-x-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap pr-2 border-r border-stone-700">
            <PenTool className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold text-[11px] text-stone-300">
              {lang === 'ka' ? 'შრიფტი:' : 'Font:'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { id: 'serif' as FontStyle, name: '📖 საზეიმო სერიფი' },
              { id: 'sans' as FontStyle, name: '💎 თანამედროვე სადა' },
              { id: 'classic_script' as FontStyle, name: '🖋️ კლასიკური' },
              { id: 'playfair' as FontStyle, name: '✨ ედიტორიალი' },
              { id: 'handwriting' as FontStyle, name: '🌸 კურსივი' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPreviewFont(f.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  effectiveFontStyle === f.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
