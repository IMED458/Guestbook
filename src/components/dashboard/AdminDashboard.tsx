import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Image as ImageIcon,
  Palette,
  QrCode,
  Settings,
  Download,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  EyeOff,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  Share2,
  Printer,
  Copy,
  Check,
  TrendingUp,
  Heart,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { GuestBook, GuestMessage, DashboardStats, Media, AdminTab, ThemePreset, ThemeSettings } from '../../types.ts';
import { THEME_PRESETS } from '../../lib/theme.ts';
import { PrintableGuestBook } from './PrintableGuestBook.tsx';
import { useI18n, RELATIONSHIPS_TRANSLATIONS, EVENT_TYPES_TRANSLATIONS, THEME_PRESET_TRANSLATIONS } from '../../lib/i18n.tsx';

interface AdminDashboardProps {
  initialGuestBookId?: string;
  onOpenWizard: () => void;
  onViewPublicBook: (slug: string) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialGuestBookId,
  onOpenWizard,
  onViewPublicBook,
  onLogout
}) => {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [guestBooks, setGuestBooks] = useState<GuestBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initialGuestBookId || null);
  const [currentBook, setCurrentBook] = useState<GuestBook | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [mediaList, setMediaList] = useState<(Media & { guestName: string; messageDate: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Message filters & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);
  const [hasVideoFilter, setHasVideoFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');

  // QR Code State
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Printable mode
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Design Theme editing state
  const [editingTheme, setEditingTheme] = useState<ThemeSettings | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);

  // Settings editing state
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsHosts, setSettingsHosts] = useState('');
  const [settingsDate, setSettingsDate] = useState('');
  const [settingsWelcome, setSettingsWelcome] = useState('');
  const [settingsModerated, setSettingsModerated] = useState(false);
  const [settingsPrivate, setSettingsPrivate] = useState(false);
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Load all user guest books
  const loadGuestBooks = async () => {
    try {
      const books = await api.guestBooks.list();
      setGuestBooks(books);

      if (books.length > 0) {
        const active = selectedBookId && books.some((b) => b.id === selectedBookId)
          ? selectedBookId
          : books[0].id;
        setSelectedBookId(active);
        const bookObj = books.find((b) => b.id === active) || books[0];
        setCurrentBook(bookObj);
        initSettingsState(bookObj);
      } else {
        setSelectedBookId(null);
        setCurrentBook(null);
      }
    } catch (err) {
      console.error('Failed to load guest books:', err);
    }
  };

  const initSettingsState = (book: GuestBook) => {
    setSettingsTitle(book.title);
    setSettingsHosts(book.hostNames);
    setSettingsDate(book.eventDate);
    setSettingsWelcome(book.welcomeMessage);
    setSettingsModerated(book.isModerated);
    setSettingsPrivate(book.isPrivate);
    setSettingsPassword(book.password || '');
    setEditingTheme(book.theme);
  };

  // Load active guest book data (stats, messages, media, QR)
  const loadBookData = async (bookId: string) => {
    setLoading(true);
    try {
      const [bookStats, bookMessages, bookMedia] = await Promise.all([
        api.guestBooks.getStats(bookId),
        api.messages.listAdmin(bookId, {
          status: statusFilter,
          search: searchQuery,
          sort: sortOrder,
          hasPhoto: hasPhotoFilter,
          hasVideo: hasVideoFilter
        }),
        api.guestBooks.getMedia(bookId)
      ]);

      setStats(bookStats);
      setMessages(bookMessages);
      setMediaList(bookMedia);

      const targetBook = guestBooks.find((b) => b.id === bookId);
      if (targetBook) {
        const publicUrl = `${window.location.origin}/g/${targetBook.slug}`;
        api.qrcode.getPng(publicUrl).then(setQrPngUrl).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading book data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuestBooks();
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      loadBookData(selectedBookId);
    }
  }, [selectedBookId, statusFilter, sortOrder, hasPhotoFilter, hasVideoFilter]);

  // Handle Search Debounce
  useEffect(() => {
    if (!selectedBookId) return;
    const timeout = setTimeout(() => {
      api.messages.listAdmin(selectedBookId, {
        status: statusFilter,
        search: searchQuery,
        sort: sortOrder,
        hasPhoto: hasPhotoFilter,
        hasVideo: hasVideoFilter
      }).then(setMessages).catch(console.error);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSelectBook = (id: string) => {
    setSelectedBookId(id);
    const bookObj = guestBooks.find((b) => b.id === id);
    if (bookObj) {
      setCurrentBook(bookObj);
      initSettingsState(bookObj);
    }
  };

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Message moderation actions
  const handleUpdateMessageStatus = async (messageId: string, status: 'APPROVED' | 'PENDING' | 'HIDDEN') => {
    try {
      await api.messages.updateStatus(messageId, status);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
      if (selectedBookId) {
        api.guestBooks.getStats(selectedBookId).then(setStats);
      }
      const statusLabel = lang === 'ka'
        ? (status === 'APPROVED' ? 'დამტკიცდა' : status === 'PENDING' ? 'მოლოდინშია' : 'დაიმალა')
        : status;
      showToast(lang === 'ka' ? `შეტყობინება ${statusLabel}` : `Message marked as ${status}`);
    } catch (err: any) {
      alert(err.message || (lang === 'ka' ? 'სტატუსის განახლება ვერ მოხერხდა' : 'Failed to update message status'));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(lang === 'ka' ? 'ნამდვილად გსურთ ამ მილოცვის სამუდამოდ წაშლა?' : 'Are you sure you want to permanently delete this message?')) return;
    try {
      await api.messages.delete(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (selectedBookId) {
        api.guestBooks.getStats(selectedBookId).then(setStats);
      }
      showToast(lang === 'ka' ? 'მილოცვა წაიშალა' : 'Message deleted successfully');
    } catch (err: any) {
      alert(err.message || (lang === 'ka' ? 'მილოცვის წაშლა ვერ მოხერხდა' : 'Failed to delete message'));
    }
  };

  // Theme Save
  const handleSaveTheme = async () => {
    if (!currentBook || !editingTheme) return;
    setThemeSaving(true);
    try {
      const updated = await api.guestBooks.update(currentBook.id, {
        theme: editingTheme
      });
      setCurrentBook(updated);
      setGuestBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast(lang === 'ka' ? 'დიზაინი წარმატებით შეინახა!' : 'Theme settings saved successfully!');
    } catch (err: any) {
      alert(err.message || (lang === 'ka' ? 'დიზაინის შენახვა ვერ მოხერხდა' : 'Failed to save theme settings'));
    } finally {
      setThemeSaving(false);
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBook) return;
    setSettingsSaving(true);
    try {
      const updated = await api.guestBooks.update(currentBook.id, {
        title: settingsTitle.trim(),
        hostNames: settingsHosts.trim(),
        eventDate: settingsDate,
        welcomeMessage: settingsWelcome.trim(),
        isModerated: settingsModerated,
        isPrivate: settingsPrivate,
        password: settingsPrivate && settingsPassword ? settingsPassword.trim() : undefined
      });
      setCurrentBook(updated);
      setGuestBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast(lang === 'ka' ? 'პარამეტრები წარმატებით შეინახა!' : 'Settings saved successfully!');
    } catch (err: any) {
      alert(err.message || (lang === 'ka' ? 'პარამეტრების შენახვა ვერ მოხერხდა' : 'Failed to save settings'));
    } finally {
      setSettingsSaving(false);
    }
  };

  // Delete Guest Book
  const handleDeleteGuestBook = async () => {
    if (!currentBook) return;
    const confirmPrompt = lang === 'ka'
      ? `ჩაწერეთ "${currentBook.title}" სტუმრების წიგნის წასაშლელად:`
      : `Type "${currentBook.title}" to confirm deleting this entire guest book:`;
    const confirmName = prompt(confirmPrompt);
    if (confirmName !== currentBook.title) {
      alert(lang === 'ka' ? 'დადასტურების სახელი არ ემთხვევა.' : 'Confirmation name did not match.');
      return;
    }

    try {
      await api.guestBooks.delete(currentBook.id);
      showToast(lang === 'ka' ? 'სტუმრების წიგნი წაიშალა.' : 'Guest book deleted.');
      await loadGuestBooks();
    } catch (err: any) {
      alert(err.message || (lang === 'ka' ? 'სტუმრების წიგნის წაშლა ვერ მოხერხდა' : 'Failed to delete guest book'));
    }
  };

  const copyPublicLink = () => {
    if (!currentBook) return;
    const url = `${window.location.origin}/g/${currentBook.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const downloadCsv = () => {
    if (!currentBook) return;
    window.open(`/api/admin/guestbooks/${currentBook.id}/export.csv`, '_blank');
  };

  if (isPrintMode && currentBook) {
    return (
      <PrintableGuestBook
        guestBook={currentBook}
        messages={messages}
        onBack={() => setIsPrintMode(false)}
      />
    );
  }

  const publicUrl = currentBook ? `${window.location.origin}/g/${currentBook.slug}` : '';

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col md:flex-row">
      {/* Toast Alert */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-50 py-2.5 px-4 bg-stone-900 text-white text-xs font-semibold rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200/80 flex flex-col shrink-0">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center font-serif font-bold text-sm">
              M
            </div>
            <div>
              <span className="font-bold text-sm text-stone-900 block leading-tight">
                {lang === 'ka' ? 'მართვის პანელი' : 'Admin Console'}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                {lang === 'ka' ? 'ციფრული წიგნი' : 'Memoria Platform'}
              </span>
            </div>
          </div>
        </div>

        {/* Active Guest Book Switcher */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            {t('dashboard', 'activeBook')}
          </label>
          {guestBooks.length > 0 ? (
            <div className="relative">
              <select
                value={selectedBookId || ''}
                onChange={(e) => handleSelectBook(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 text-stone-800 truncate cursor-pointer shadow-2xs"
              >
                {guestBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          ) : (
            <div className="text-xs text-stone-500 italic">
              {lang === 'ka' ? 'სტუმრების წიგნი ვერ მოიძებნა' : 'No guest books found'}
            </div>
          )}

          <button
            onClick={onOpenWizard}
            className="w-full mt-2.5 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('dashboard', 'newBookBtn')}</span>
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-3 space-y-1 flex-1">
          {[
            { id: 'overview', label: t('dashboard', 'tabOverview'), icon: LayoutDashboard },
            { id: 'guestbooks', label: lang === 'ka' ? 'სტუმრების წიგნები' : 'Guest Books', icon: BookOpen, badge: guestBooks.length },
            { id: 'messages', label: t('dashboard', 'tabMessages'), icon: MessageSquare, badge: stats?.pendingMessages ? (lang === 'ka' ? `${stats.pendingMessages} ახალი` : `${stats.pendingMessages} pending`) : undefined, badgeColor: 'bg-amber-100 text-amber-800' },
            { id: 'media', label: t('dashboard', 'tabMedia'), icon: ImageIcon, badge: stats ? stats.totalPhotos + stats.totalVideos : undefined },
            { id: 'design', label: t('dashboard', 'tabDesign'), icon: Palette },
            { id: 'qrcode', label: t('dashboard', 'tabQr'), icon: QrCode },
            { id: 'settings', label: t('dashboard', 'tabSettings'), icon: Settings },
            { id: 'export', label: t('dashboard', 'tabExport'), icon: Download }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor || 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Public View Link */}
        {currentBook && (
          <div className="p-3 border-t border-stone-100">
            <button
              onClick={() => onViewPublicBook(currentBook.slug)}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
              <span>{t('dashboard', 'viewPublic')}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-stone-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900">
              {currentBook ? currentBook.title : (lang === 'ka' ? 'ჩემი ღონისძიებები' : 'My Events')}
            </h1>
            {currentBook && (
              <p className="text-[11px] text-stone-500">
                URL: /g/{currentBook.slug} • {EVENT_TYPES_TRANSLATIONS[currentBook.eventType]?.[lang] || currentBook.eventType}
              </p>
            )}
          </div>

          {currentBook && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyPublicLink}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200/70 text-stone-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('common', 'copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('common', 'copy')}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onViewPublicBook(currentBook.slug)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lang === 'ka' ? 'საჯარო გვერდის გახსნა' : 'Open Live Page'}
                </span>
              </button>
            </div>
          )}
        </header>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                    <span className="font-semibold uppercase tracking-wider">{t('dashboard', 'kpiMessages')}</span>
                    <MessageSquare className="w-4 h-4 text-stone-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-stone-900">
                    {stats?.totalMessages ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400">
                    {lang === 'ka' ? `${stats?.messagesToday ?? 0} დაემატა დღეს` : `${stats?.messagesToday ?? 0} posted today`}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                    <span className="font-semibold uppercase tracking-wider">
                      {lang === 'ka' ? 'ფოტოები და ვიდეოები' : 'Photos & Videos'}
                    </span>
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-stone-900">
                    {(stats?.totalPhotos ?? 0) + (stats?.totalVideos ?? 0)}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400">
                    {lang === 'ka'
                      ? `${stats?.totalPhotos ?? 0} ფოტო • ${stats?.totalVideos ?? 0} ვიდეო`
                      : `${stats?.totalPhotos ?? 0} photos • ${stats?.totalVideos ?? 0} videos`}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                    <span className="font-semibold uppercase tracking-wider">{t('dashboard', 'kpiReactions')}</span>
                    <Heart className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-stone-900">
                    {stats?.totalReactions ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400">
                    {lang === 'ka' ? 'სტუმრების ემოციები' : 'Love stamps from visitors'}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                    <span className="font-semibold uppercase tracking-wider">{t('dashboard', 'kpiViews')}</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-stone-900">
                    {stats?.guestBookViews ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-stone-400">
                    {lang === 'ka' ? 'ვიზიტორთა სკანირებები და ნახვები' : 'Unique visitor scans & visits'}
                  </div>
                </div>
              </div>

              {/* Pending Moderation Banner */}
              {stats && stats.pendingMessages > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        {lang === 'ka'
                          ? `${stats.pendingMessages} მილოცვა ელის დამტკიცებას`
                          : `${stats.pendingMessages} Messages Awaiting Approval`}
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        {lang === 'ka'
                          ? 'გადაამოწმეთ შეტყობინებები საჯაროდ გამოჩენამდე.'
                          : 'Review submissions in the Messages tab before they appear publicly.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter('PENDING');
                      setActiveTab('messages');
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {lang === 'ka' ? 'გადამოწმება' : 'Review Now'}
                  </button>
                </div>
              )}

              {/* Analytics Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visitors by day chart */}
                <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-stone-500" />
                      <span>{t('dashboard', 'visitorsChart')}</span>
                    </h3>
                  </div>

                  <div className="h-44 flex items-end justify-between gap-2 pt-6">
                    {stats?.visitorsByDay?.map((day, idx) => {
                      const max = Math.max(...(stats.visitorsByDay.map((d) => d.count) || [1]), 10);
                      const heightPct = Math.max(8, (day.count / max) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <span className="text-[10px] font-bold text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.count}
                          </span>
                          <div
                            className="w-full max-w-[28px] bg-stone-900 rounded-t-md transition-all group-hover:bg-stone-700"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] text-stone-400 truncate max-w-[36px]">
                            {day.label.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Messages by day chart */}
                <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-stone-500" />
                      <span>{t('dashboard', 'messagesChart')}</span>
                    </h3>
                  </div>

                  <div className="h-44 flex items-end justify-between gap-2 pt-6">
                    {stats?.messagesByDay?.map((day, idx) => {
                      const max = Math.max(...(stats.messagesByDay.map((d) => d.count) || [1]), 5);
                      const heightPct = Math.max(8, (day.count / max) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.count}
                          </span>
                          <div
                            className="w-full max-w-[28px] bg-rose-500 rounded-t-md transition-all group-hover:bg-rose-600"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] text-stone-400 truncate max-w-[36px]">
                            {day.label.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-4">
                  {lang === 'ka' ? 'სწრაფი ქმედებები' : 'Quick Actions'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('qrcode')}
                    className="p-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-left transition-colors cursor-pointer"
                  >
                    <QrCode className="w-5 h-5 text-indigo-600 mb-2" />
                    <span className="text-xs font-semibold block text-stone-900">
                      {lang === 'ka' ? 'QR კოდის ჩამოტვირთვა' : 'Download QR Code'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === 'ka' ? 'ვექტორული SVG & PNG' : 'Vector SVG & PNG'}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('design')}
                    className="p-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-left transition-colors cursor-pointer"
                  >
                    <Palette className="w-5 h-5 text-emerald-600 mb-2" />
                    <span className="text-xs font-semibold block text-stone-900">
                      {lang === 'ka' ? 'თემის მორგება' : 'Customize Theme'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === 'ka' ? 'შრიფტები და ფერები' : 'Fonts & Colors'}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('messages')}
                    className="p-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-left transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-5 h-5 text-amber-600 mb-2" />
                    <span className="text-xs font-semibold block text-stone-900">
                      {lang === 'ka' ? 'მოდერაცია' : 'Moderate Entries'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === 'ka' ? 'დამტკიცება ან დამალვა' : 'Approve or hide notes'}
                    </span>
                  </button>

                  <button
                    onClick={() => setIsPrintMode(true)}
                    className="p-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-left transition-colors cursor-pointer"
                  >
                    <Printer className="w-5 h-5 text-stone-700 mb-2" />
                    <span className="text-xs font-semibold block text-stone-900">
                      {lang === 'ka' ? 'სამახსოვრო ალბომი' : 'Printable Keepsake'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === 'ka' ? 'ბეჭდვა / PDF ალბომი' : 'Generate PDF booklet'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUEST BOOKS */}
          {activeTab === 'guestbooks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    {lang === 'ka' ? 'თქვენი სტუმრების წიგნები' : 'Your Guest Books'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {lang === 'ka' ? 'მართეთ რამდენიმე ღონისძიება თქვენს ანგარიშში.' : 'Manage multiple events under your account.'}
                  </p>
                </div>
                <button
                  onClick={onOpenWizard}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('dashboard', 'newBookBtn')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guestBooks.map((book) => {
                  const isCurrent = book.id === selectedBookId;
                  return (
                    <div
                      key={book.id}
                      className={`p-5 rounded-2xl bg-white border transition-all ${
                        isCurrent ? 'border-stone-900 shadow-sm ring-1 ring-stone-900/10' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={book.coverImage}
                            alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                          />
                          <div>
                            <h3 className="font-bold text-stone-900 text-sm">{book.title}</h3>
                            <span className="text-[11px] text-stone-500 block">
                              {lang === 'ka' ? `მასპინძელი: ${book.hostNames} • ${book.eventDate}` : `Hosted by ${book.hostNames} • ${book.eventDate}`}
                            </span>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-stone-100 text-stone-700">
                              {EVENT_TYPES_TRANSLATIONS[book.eventType]?.[lang] || book.eventType}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-900 text-white">
                            {lang === 'ka' ? 'აქტიური' : 'Active'}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleSelectBook(book.id)}
                          className={`font-semibold cursor-pointer ${
                            isCurrent ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {isCurrent ? (lang === 'ka' ? 'მიმდინარე წიგნი' : 'Currently Managing') : (lang === 'ka' ? 'ამ წიგნზე გადართვა' : 'Switch to this Book')}
                        </button>

                        <button
                          onClick={() => onViewPublicBook(book.slug)}
                          className="text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{lang === 'ka' ? 'საჯარო ნახვა' : 'Open Live'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MESSAGES (Moderation & Filters) */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{t('dashboard', 'tabMessages')}</h2>
                  <p className="text-xs text-stone-500">
                    {lang === 'ka'
                      ? 'მოძებნეთ, გაფილტრეთ, დაამტკიცეთ ან დამალეთ სტუმრების მილოცვები.'
                      : 'Search, filter, approve, or hide entries left by your guests.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadCsv}
                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>{t('dashboard', 'exportCsvBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('dashboard', 'searchMessages')}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-none focus:border-stone-900 cursor-pointer"
                  >
                    <option value="ALL">{lang === 'ka' ? 'ყველა სტატუსი' : 'All Statuses'}</option>
                    <option value="APPROVED">{lang === 'ka' ? 'დამტკიცებული' : 'Approved Only'}</option>
                    <option value="PENDING">{lang === 'ka' ? 'მოლოდინში (ახალი)' : 'Pending Only'}</option>
                    <option value="HIDDEN">{lang === 'ka' ? 'დამალული' : 'Hidden Only'}</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-none focus:border-stone-900 cursor-pointer"
                  >
                    <option value="newest">{lang === 'ka' ? 'უახლესი' : 'Newest First'}</option>
                    <option value="oldest">{lang === 'ka' ? 'უძველესი' : 'Oldest First'}</option>
                    <option value="reactions">{lang === 'ka' ? 'ყველაზე მოწონებული' : 'Most Reactions'}</option>
                  </select>
                </div>

                {/* Media checkboxes */}
                <div className="flex items-center gap-4 text-xs text-stone-600 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPhotoFilter}
                      onChange={(e) => setHasPhotoFilter(e.target.checked)}
                      className="rounded text-stone-900"
                    />
                    <span>{lang === 'ka' ? 'აქვს ფოტო' : 'Has Photo Attachment'}</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVideoFilter}
                      onChange={(e) => setHasVideoFilter(e.target.checked)}
                      className="rounded text-stone-900"
                    />
                    <span>{lang === 'ka' ? 'აქვს ვიდეო' : 'Has Video Attachment'}</span>
                  </label>
                </div>
              </div>

              {/* Message List */}
              {messages.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-stone-200">
                  <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="font-bold text-stone-900 text-sm">{t('dashboard', 'noMessagesMatching')}</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {lang === 'ka' ? 'სცადეთ შეცვალოთ ძიების ტექსტი ან ფილტრი.' : 'Try adjusting your search query or status filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const photo = msg.media?.find((m) => m.type === 'IMAGE');

                    return (
                      <div
                        key={msg.id}
                        className="p-5 rounded-2xl bg-white border border-stone-200 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="font-bold text-stone-900 text-sm">{msg.name}</h4>
                            {msg.relationship && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                                {RELATIONSHIPS_TRANSLATIONS[msg.relationship]?.[lang] || msg.relationship}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                msg.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : msg.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {msg.status === 'APPROVED'
                                ? (lang === 'ka' ? 'დამტკიცებული' : 'APPROVED')
                                : msg.status === 'PENDING'
                                ? (lang === 'ka' ? 'მოლოდინში' : 'PENDING')
                                : (lang === 'ka' ? 'დამალული' : 'HIDDEN')}
                            </span>
                          </div>

                          {msg.email && (
                            <div className="text-[11px] text-stone-400 mb-1">
                              {lang === 'ka' ? 'პირადი ელფოსტა:' : 'Private Email:'} {msg.email}
                            </div>
                          )}

                          <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line mb-3">
                            {msg.message}
                          </p>

                          {photo && (
                            <div className="mb-3">
                              <img
                                src={photo.url}
                                alt="attachment"
                                className="w-24 h-24 object-cover rounded-lg border border-stone-200"
                              />
                            </div>
                          )}

                          <div className="text-[11px] text-stone-400 flex items-center gap-3">
                            <span>{new Date(msg.createdAt).toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US')}</span>
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex items-center gap-1.5">
                                {Object.entries(msg.reactions).map(([e, c]) => (
                                  <span key={e}>
                                    {e} {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Moderation Action Buttons */}
                        <div className="flex sm:flex-col items-center gap-1.5 shrink-0">
                          {msg.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateMessageStatus(msg.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t('dashboard', 'approveBtn')}</span>
                            </button>
                          )}

                          {msg.status !== 'HIDDEN' && (
                            <button
                              onClick={() => handleUpdateMessageStatus(msg.id, 'HIDDEN')}
                              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>{t('dashboard', 'hideBtn')}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t('dashboard', 'deleteBtn')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEDIA GALLERY */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{t('dashboard', 'tabMedia')}</h2>
                <p className="text-xs text-stone-500">
                  {lang === 'ka'
                    ? 'თქვენი სტუმრების მიერ ატვირთული ყველა ფოტო და ვიდეო.'
                    : 'All photos and videos uploaded by your guests during the celebration.'}
                </p>
              </div>

              {mediaList.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-stone-200">
                  <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    {lang === 'ka' ? 'მედია ჯერ არ ატვირთულა' : 'No media uploaded yet'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {lang === 'ka'
                      ? 'როდესაც სტუმრები ატვირთავენ სურათებს თავიანთი ტელეფონიდან, ისინი გამოჩნდება ამ გალერეაში.'
                      : 'When guests upload pictures from their phone, they will appear in this gallery.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaList.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 aspect-square"
                    >
                      <img
                        src={item.url}
                        alt="Guest media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white text-xs">
                        <span className="font-bold truncate">{item.guestName}</span>
                        <span className="text-[10px] text-stone-300">
                          {new Date(item.messageDate).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DESIGN & THEMES */}
          {activeTab === 'design' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {lang === 'ka' ? 'დიზაინის მორგება' : 'Design Customization'}
                </h2>
                <p className="text-xs text-stone-500">
                  {lang === 'ka'
                    ? 'შეცვალეთ თქვენი საჯარო სტუმრების წიგნის ატმოსფერო, ფერები, შრიფტები და სტილი.'
                    : 'Change the atmosphere, colors, fonts and visual theme of your public guest book.'}
                </p>
              </div>

              {/* Preset Theme Selection */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200">
                <h3 className="text-sm font-bold text-stone-900 mb-2">
                  {lang === 'ka' ? 'მზა თემები' : 'Preset Themes'}
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  {lang === 'ka'
                    ? 'თემის არჩევა მყისიერად განაახლებს ფონს, აქცენტის ფერებსა და ტიპოგრაფიას.'
                    : 'Selecting a preset will update the background, accent colors, and typography instantly.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
                    const preset = THEME_PRESETS[key];
                    const isSelected = editingTheme?.themePreset === key;
                    const translatedTheme = THEME_PRESET_TRANSLATIONS[key];
                    const themeName = translatedTheme?.name[lang] || preset.name;
                    const themeDesc = translatedTheme?.desc[lang] || preset.description;
                    return (
                      <button
                        key={key}
                        onClick={() => setEditingTheme({ ...preset.settings })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-stone-900 ring-2 ring-stone-900/10 shadow-sm bg-stone-50'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: preset.previewPrimary }}
                          />
                          <span className="text-xs font-bold text-stone-900">{themeName}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-normal">
                          {themeDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Theme Settings */}
              {editingTheme && (
                <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-5">
                  <h3 className="text-sm font-bold text-stone-900">
                    {lang === 'ka' ? 'დეტალური სტილის პარამეტრები' : 'Fine-Tune Styling'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {lang === 'ka' ? 'ფონის ფერი' : 'Background Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTheme.bgColor}
                          onChange={(e) =>
                            setEditingTheme({ ...editingTheme, bgColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-lg cursor-pointer border border-stone-300 p-0.5"
                        />
                        <input
                          type="text"
                          value={editingTheme.bgColor}
                          onChange={(e) =>
                            setEditingTheme({ ...editingTheme, bgColor: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {lang === 'ka' ? 'ძირითადი აქცენტის ფერი' : 'Primary Accent Color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editingTheme.primaryColor}
                          onChange={(e) =>
                            setEditingTheme({ ...editingTheme, primaryColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-lg cursor-pointer border border-stone-300 p-0.5"
                        />
                        <input
                          type="text"
                          value={editingTheme.primaryColor}
                          onChange={(e) =>
                            setEditingTheme({ ...editingTheme, primaryColor: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {lang === 'ka' ? 'შრიფტი' : 'Font Family'}
                      </label>
                      <select
                        value={editingTheme.fontStyle}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            fontStyle: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="serif">Lora ({lang === 'ka' ? 'თბილი კლასიკური სერიფი' : 'Warm Classic Serif'})</option>
                        <option value="playfair">Playfair Display ({lang === 'ka' ? 'რომანტიკული საზეიმო' : 'Romantic Editorial'})</option>
                        <option value="sans">Plus Jakarta Sans ({lang === 'ka' ? 'თანამედროვე და სუფთა' : 'Modern Clean'})</option>
                        <option value="mono">Space Grotesk ({lang === 'ka' ? 'მოდერნ ტექ' : 'Modern Tech'})</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {lang === 'ka' ? 'ბარათის სტილი' : 'Card Style'}
                      </label>
                      <select
                        value={editingTheme.cardStyle}
                        onChange={(e) =>
                          setEditingTheme({
                            ...editingTheme,
                            cardStyle: e.target.value as any
                          })
                        }
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="soft">Soft &amp; Subtle ({lang === 'ka' ? 'ნაზი ხაზები' : 'Gentle borders'})</option>
                        <option value="border">Crisp Border ({lang === 'ka' ? 'მკვეთრი კონტური' : 'Modern outline'})</option>
                        <option value="elevated">Elevated Shadow ({lang === 'ka' ? 'ჩრდილით აწეული' : 'Luxury float'})</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex justify-end">
                    <button
                      onClick={handleSaveTheme}
                      disabled={themeSaving}
                      className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {themeSaving ? (lang === 'ka' ? 'ინახება...' : 'Saving Theme...') : t('dashboard', 'saveThemeBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {lang === 'ka' ? 'QR კოდი და მაგიდის ბარათები' : 'QR Code & Table Displays'}
                </h2>
                <p className="text-xs text-stone-500">
                  {lang === 'ka'
                    ? 'დაბეჭდეთ ან გააზიარეთ QR კოდი, რათა სტუმრებმა მარტივად დაასკანერონ მობილურით.'
                    : 'Print or share the custom QR code so guests can easily scan with their phone.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* QR Preview Card */}
                <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center shadow-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block">
                    {qrPngUrl ? (
                      <img
                        src={qrPngUrl}
                        alt="Guest Book QR Code"
                        className="w-56 h-56 mx-auto rounded-xl shadow-xs"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-400">
                        {lang === 'ka' ? 'QR კოდი იქმნება...' : 'Generating QR Code...'}
                      </div>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-lg text-stone-900 mt-4">
                    {currentBook?.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono mt-1 max-w-xs mx-auto truncate">
                    {publicUrl}
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={qrPngUrl || '#'}
                      download={`${currentBook?.slug}-qrcode.png`}
                      className="w-full sm:w-auto px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'ka' ? 'ჩამოტვირთეთ PNG' : 'Download PNG'}</span>
                    </a>

                    <a
                      href={api.qrcode.getSvgUrl(publicUrl)}
                      download={`${currentBook?.slug}-qrcode.svg`}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'ka' ? 'ჩამოტვირთეთ ვექტორული SVG' : 'Download Vector SVG'}</span>
                    </a>
                  </div>
                </div>

                {/* Printable Table Tent Mockup */}
                <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-3">
                    {lang === 'ka' ? 'მაგიდის დასადგამი ბარათის წინასწარი გადახედვა' : 'Printable Table Sign Preview'}
                  </span>

                  <div className="p-6 bg-white rounded-2xl border border-stone-300 text-center shadow-md">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-rose-600 block mb-1">
                      {lang === 'ka' ? 'დაასკანერეთ და დატოვეთ მილოცვა' : 'SCAN TO SIGN OUR GUEST BOOK'}
                    </span>
                    <h4 className="font-serif text-xl font-bold text-stone-900">
                      {currentBook?.title}
                    </h4>
                    <p className="text-xs text-stone-500 italic mt-1 mb-4">
                      {lang === 'ka' ? 'დაგვიტოვეთ თბილი სურვილი, მოგონება ან ფოტო ❤️' : 'Leave a message, photo, or memory ❤️'}
                    </p>

                    {qrPngUrl && (
                      <img
                        src={qrPngUrl}
                        alt="QR Code"
                        className="w-36 h-36 mx-auto rounded-lg border border-stone-200"
                      />
                    )}

                    <div className="mt-4 text-[10px] text-stone-400 font-mono">
                      {lang === 'ka' ? 'მიუშვით მობილურის კამერა გასახსნელად' : 'Point your smartphone camera to open'}
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'ka' ? 'ბარათის დაბეჭდვა' : 'Print Sign Card'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS & PRIVACY */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">{t('dashboard', 'eventSettingsTitle')}</h2>
                <p className="text-xs text-stone-500">
                  {lang === 'ka'
                    ? 'მართეთ მასპინძლის მონაცემები, თარიღი, მოდერაცია და უსაფრთხოების პარამეტრები.'
                    : 'Manage host information, event dates, publishing approvals, and privacy options.'}
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t('dashboard', 'eventTitleLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsTitle}
                      onChange={(e) => setSettingsTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t('dashboard', 'hostsLabel')}
                    </label>
                    <input
                      type="text"
                      value={settingsHosts}
                      onChange={(e) => setSettingsHosts(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {t('dashboard', 'dateLabel')}
                    </label>
                    <input
                      type="date"
                      value={settingsDate}
                      onChange={(e) => setSettingsDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {lang === 'ka' ? 'ყდის ფოტოს ბმული (URL)' : 'Cover Image URL'}
                    </label>
                    <input
                      type="url"
                      value={currentBook?.coverImage || ''}
                      onChange={(e) => {
                        if (currentBook) {
                          setCurrentBook({ ...currentBook, coverImage: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('dashboard', 'welcomeLabel')}
                  </label>
                  <textarea
                    rows={3}
                    value={settingsWelcome}
                    onChange={(e) => setSettingsWelcome(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 resize-none"
                  />
                </div>

                {/* Moderation Toggle */}
                <div className="pt-3 border-t border-stone-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        {t('dashboard', 'moderationToggle')}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {lang === 'ka'
                          ? 'ჩართვის შემთხვევაში, ახალი მილოცვა დარჩება მოლოდინში სანამ არ დაამტკიცებთ.'
                          : 'When enabled, new messages stay PENDING until you approve them.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsModerated}
                      onChange={(e) => setSettingsModerated(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Privacy & Password */}
                <div className="pt-3 border-t border-stone-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        {t('dashboard', 'privacyToggle')}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {lang === 'ka'
                          ? 'დაიცავით მოგონებები პაროლით მხოლოდ მოწვეული სტუმრებისთვის.'
                          : 'Lock memories behind a custom password for invited guests only.'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsPrivate}
                      onChange={(e) => setSettingsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {settingsPrivate && (
                    <div className="mt-3 max-w-sm">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        {t('dashboard', 'passwordLabel')}
                      </label>
                      <input
                        type="text"
                        value={settingsPassword}
                        onChange={(e) => setSettingsPassword(e.target.value)}
                        placeholder="e.g. celebration2026"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {settingsSaving ? (lang === 'ka' ? 'ინახება...' : 'Saving Settings...') : t('dashboard', 'saveSettingsBtn')}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-200">
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-1">
                  {lang === 'ka' ? 'საშიში ზონა' : 'Danger Zone'}
                </h3>
                <p className="text-xs text-rose-700 mb-4">
                  {t('dashboard', 'deleteGuestBookDesc')}
                </p>
                <button
                  type="button"
                  onClick={handleDeleteGuestBook}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {t('dashboard', 'deleteGuestBookBtn')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: EXPORT & PRINT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  {lang === 'ka' ? 'ექსპორტი და სამახსოვრო ალბომი' : 'Export & Keepsakes'}
                </h2>
                <p className="text-xs text-stone-500">
                  {lang === 'ka'
                    ? 'გაიტანეთ სტუმრების მონაცემები არქივისთვის, ელექტრონული ცხრილებისთვის ან დასაბეჭდად.'
                    : 'Export guest data for archives, spreadsheets, or physical memory books.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <Download className="w-8 h-8 text-emerald-600 mb-3" />
                    <h3 className="font-bold text-stone-900 text-sm mb-1">
                      {lang === 'ka' ? 'CSV ცხრილის ექსპორტი' : 'CSV Spreadsheet Export'}
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {lang === 'ka'
                        ? 'ჩამოტვირთეთ დეტალური CSV ცხრილი: სტუმრების სახელები, პირადი ელფოსტები, კავშირის ტეგები, სრული მილოცვის ტექსტები, მედია ბმულები და თარიღები.'
                        : 'Download a structured CSV spreadsheet containing: Guest Names, Private Emails, Relationship tags, Full message transcripts, Media URLs, and Timestamps.'}
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={downloadCsv}
                      className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('dashboard', 'exportCsvBtn')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <Printer className="w-8 h-8 text-amber-600 mb-3" />
                    <h3 className="font-bold text-stone-900 text-sm mb-1">
                      {lang === 'ka' ? 'დასაბეჭდი სამახსოვრო ალბომი' : 'Printable Memory Booklet'}
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {lang === 'ka'
                        ? 'იხილეთ სუფთა, ელეგანტური რედაქციული განლაგება, რომელიც სპეციალურად ფორმატირებულია ქაღალდზე დასაბეჭდად ან PDF ალბომად შესანახად.'
                        : 'View a clean, editorial layout formatted specifically for standard paper printing or saving as a permanent PDF keepsake album.'}
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setIsPrintMode(true)}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === 'ka' ? 'სამახსოვრო ალბომის გახსნა' : 'Open Printable Booklet'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
