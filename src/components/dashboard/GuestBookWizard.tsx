import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  Heart,
  Palette,
  CheckCircle2,
  Lock,
  Image as ImageIcon,
  Loader2,
  PartyPopper,
  Building,
  Cake,
  Flower2,
  X
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { useModalA11y } from '../../lib/useModalA11y.ts';
import { EventType, ThemePreset, GuestBook, FontStyle } from '../../types.ts';
import { THEME_PRESETS, FONT_OPTIONS, getFontFamily } from '../../lib/theme.ts';
import { useI18n } from '../../lib/i18n.tsx';
import { FontPicker } from '../common/FontPicker.tsx';
import { CoverImagePicker } from '../common/CoverImagePicker.tsx';
import { COVER_PRESETS } from '../../lib/cover-presets.ts';

interface GuestBookWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newBook: GuestBook) => void;
}

const EVENT_TYPES: { id: EventType; labelEn: string; labelKa: string; icon: any; defaultCover: string }[] = [
  {
    id: 'wedding',
    labelEn: 'Wedding',
    labelKa: 'ქორწილი',
    icon: Heart,
    defaultCover: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'birthday',
    labelEn: 'Birthday',
    labelKa: 'დაბადების დღე',
    icon: Cake,
    defaultCover: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'party',
    labelEn: 'Celebration / Party',
    labelKa: 'წვეულება / ზეიმი',
    icon: PartyPopper,
    defaultCover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'corporate',
    labelEn: 'Corporate Event',
    labelKa: 'კორპორატიული',
    icon: Building,
    defaultCover: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'hotel',
    labelEn: 'Hotel / Airbnb / Venue',
    labelKa: 'სასტუმრო / აპარტამენტი',
    icon: Sparkles,
    defaultCover: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'memorial',
    labelEn: 'Memorial Tribute',
    labelKa: 'სამახსოვრო / მემორიალი',
    icon: Flower2,
    defaultCover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'other',
    labelEn: 'Other Event',
    labelKa: 'სხვა ღონისძიება',
    icon: Sparkles,
    defaultCover: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1600&q=80'
  }
];


export const GuestBookWizard: React.FC<GuestBookWizardProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const { t, lang } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [eventType, setEventType] = useState<EventType>('wedding');
  const [title, setTitle] = useState(lang === 'ka' ? 'ნიკა და ანას ქორწილი' : 'Nika & Ana Wedding');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [hostNames, setHostNames] = useState(lang === 'ka' ? 'ნიკა და ანა' : 'Nika & Ana');
  const [welcomeMessage, setWelcomeMessage] = useState(
    lang === 'ka'
      ? 'მოგესალმებით ჩვენს ციფრულ სტუმრების წიგნში! დაგვიტოვეთ თბილი სურვილი, მოგონება ან ფოტო ❤️'
      : 'Welcome to our guest book! Leave us a warm message, memory or photo that we can keep forever.'
  );
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80'
  );
  const [themePreset, setThemePreset] = useState<ThemePreset>('romantic');
  const [fontStyle, setFontStyle] = useState<FontStyle>('handwriting');
  const [isModerated, setIsModerated] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  const { ref: dialogRef } = useModalA11y(isOpen, onClose);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Each step starts at the top of its own scroll region, so the heading of
  // the new step is what you see rather than the middle of a long list.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  if (!isOpen) return null;

  const handleSelectEventType = (type: EventType) => {
    setEventType(type);
    const found = EVENT_TYPES.find((t) => t.id === type);
    if (found) {
      setCoverImage(found.defaultCover);
      if (type === 'wedding') {
        setTitle(lang === 'ka' ? 'ნიკა და ანას ქორწილი' : 'Nika & Ana Wedding');
        setWelcomeMessage(lang === 'ka' ? 'მოგესალმებით ჩვენს საქორწილო სტუმრების წიგნში ❤️ დაგვიტოვეთ სამახსოვრო სიტყვები და ფოტოები.' : 'Welcome to our wedding guest book ❤️ Leave us a memory or photo to cherish forever.');
        setFontStyle('handwriting');
      } else if (type === 'birthday') {
        setTitle(lang === 'ka' ? 'მაიას 30-ე დაბადების დღე' : 'Maya’s 30th Birthday Bash');
        setWelcomeMessage(lang === 'ka' ? 'ძალიან მიხარია, რომ ჩემთან ერთად ხართ! გაგვიზიარეთ თქვენი სურვილები და ფოტოები 🎉' : 'So glad you are here to celebrate with me! Drop your birthday wishes and photos 🎉');
        setFontStyle('classic_script');
      } else if (type === 'hotel') {
        setTitle(lang === 'ka' ? 'ვილა სანესტის სტუმრების წიგნი' : 'Villa Sunset Guest Book');
        setWelcomeMessage(lang === 'ka' ? 'მოგესალმებით ჩვენს ვილაში! გთხოვთ გაგვიზიაროთ თქვენი შთაბეჭდილებები და მოგონებები 🌿' : 'Welcome to our villa! Please share your travel experiences, thoughts and memories 🌿');
        setFontStyle('serif');
      } else {
        setTitle(lang === 'ka' ? `${found.labelKa}-ის სტუმრების წიგნი` : `${found.labelEn} Guest Book`);
      }
    }
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    try {
      const basePreset = THEME_PRESETS[themePreset].settings;
      const selectedThemeSettings = {
        ...basePreset,
        fontStyle: fontStyle
      };

      const newBook = await api.guestBooks.create({
        title: title.trim() || (lang === 'ka' ? 'ჩემი სტუმრების წიგნი' : 'My Guest Book'),
        eventType,
        eventDate,
        hostNames: hostNames.trim() || title.trim(),
        welcomeMessage: welcomeMessage.trim(),
        coverImage,
        theme: selectedThemeSettings,
        isModerated,
        isPrivate,
        password: isPrivate && password ? password.trim() : undefined
      });

      onCreated(newBook);
      onClose();
    } catch (err: any) {
      setError(err.message || (lang === 'ka' ? 'სტუმრების წიგნის შექმნა ვერ მოხერხდა. სცადეთ თავიდან.' : 'Failed to create guest book. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setError(null);
    if (step === 2 && !title.trim()) {
      setError(lang === 'ka' ? 'გთხოვთ შეიყვანოთ ღონისძიების სახელწოდება.' : 'Please enter a name for your event.');
      return;
    }
    setStep((prev) => Math.min(8, prev + 1));
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
        id="guestbook-wizard-container"
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative flex flex-col"
      >
        {/* Header with Progress Bar — stays visible while the body scrolls */}
        <div className="shrink-0 p-6 sm:p-8 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-600 block mb-1">
              {lang === 'ka' ? `ნაბიჯი ${step} / 8-დან` : `Step ${step} of 8`}
            </span>
            <h2 id="wizard-title" className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              {lang === 'ka' ? 'სტუმრების წიგნის შექმნა' : 'Create Your Guest Book'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === 'ka' ? 'ფანჯრის დახურვა' : 'Close this dialog'}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Progress Bar Line */}
        <div className="shrink-0 w-full bg-stone-100 h-1.5">
          <div
            className="bg-stone-900 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 8) * 100}%` }}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="shrink-0 m-6 mb-0 p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl font-medium"
          >
            {error}
          </div>
        )}

        {/* Step Content — the only scrolling region */}
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8">
          {/* STEP 1: EVENT TYPE */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'რა სახის ღონისძიებას მართავთ?' : 'What kind of event are you hosting?'}
              </h3>
              <p className="text-xs text-stone-600 mb-6">
                {lang === 'ka' ? 'აირჩიეთ ტიპი შესაბამისი პარამეტრების მისაღებად.' : 'Choose the occasion to automatically customize your defaults.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = eventType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectEventType(t.id)}
                      className={`p-4 rounded-2xl border text-left flex flex-col items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-stone-600'}`} />
                      <span className="text-xs sm:text-sm font-semibold">
                        {lang === 'ka' ? t.labelKa : t.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: EVENT NAME */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'რა არის ღონისძიების სახელი?' : 'What is the name of your event?'}
              </h3>
              <p className="text-xs text-stone-600 mb-6">
                {lang === 'ka'
                  ? 'ეს სახელი გამოჩნდება სტუმრების წიგნის სათაურში და ბმულში.'
                  : 'This appears prominently at the top of your digital guest book and generates your URL.'}
              </p>
              <input
                id="wizard-event-name-input"
                type="text"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'ka' ? 'მაგ. ნიკა და ანას ქორწილი, ვილა კახეთი' : 'e.g. Nika & Ana Wedding, Villa Kakhuri, Sophie\'s 25th'}
                className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all font-medium"
              />
              <div className="mt-3 text-xs text-stone-600 flex items-center gap-1.5">
                <span>{lang === 'ka' ? 'ბმულის გადახედვა:' : 'Preview URL:'}</span>
                <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                  /g/{title ? title.toLowerCase().replace(/[^a-z0-9\u10D0-\u10FA]+/g, '-').replace(/^-+|-+$/g, '') : 'your-event-slug'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: EVENT DATE */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'როდის იმართება ღონისძიება?' : 'When is the event taking place?'}
              </h3>
              <p className="text-xs text-stone-600 mb-6">
                {lang === 'ka' ? 'სტუმრებს შეუძლიათ სურვილების დატოვება ამ თარიღამდე, დროს ან შემდეგ.' : 'Guests can view and sign the guest book before, during, or after this date.'}
              </p>
              <div className="max-w-xs">
                <input
                  id="wizard-event-date-input"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded-2xl text-sm font-medium focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>
          )}

          {/* STEP 4: HOST NAMES */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'ვინ არიან მასპინძლები ან ორგანიზატორები?' : 'Who are the hosts or organizers?'}
              </h3>
              <p className="text-xs text-stone-600 mb-6">
                {lang === 'ka' ? 'გამოჩნდება თარიღის გვერდით (მაგ. „მასპინძელი: ნიკა და ანა“).' : 'Displayed next to the event date (e.g. “Hosted by Nika & Ana”).'}
              </p>
              <input
                id="wizard-host-names-input"
                type="text"
                value={hostNames}
                onChange={(e) => setHostNames(e.target.value)}
                placeholder={lang === 'ka' ? 'მაგ. ნიკა და ანა, ბერიძეების ოჯახი' : 'e.g. Nika & Ana, The Miller Family, ACME Corp'}
                className="w-full px-4 py-3 text-base bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all font-medium"
              />
            </div>
          )}

          {/* STEP 5: WELCOME MESSAGE */}
          {step === 5 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'დაწერეთ მისასალმებელი სიტყვა სტუმრებისთვის' : 'Write a welcome greeting for your guests'}
              </h3>
              <p className="text-xs text-stone-600 mb-4">
                {lang === 'ka' ? 'ეს შეტყობინება გამოჩნდება ბანერის ქვემოთ ციტატის ბარათში.' : 'This appears in a featured quotation card below your cover photo.'}
              </p>
              <textarea
                id="wizard-welcome-message-input"
                rows={4}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full p-4 text-sm bg-stone-50 border border-stone-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all resize-none"
              />
            </div>
          )}

          {/* STEP 6: COVER IMAGE */}
          {step === 6 && (
            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">
                {lang === 'ka' ? 'აირჩიეთ ყდის (ბანერის) ფოტო' : 'Choose a banner cover image'}
              </h3>
              <p className="text-xs text-stone-600 mb-4">
                {lang === 'ka' ? 'აირჩიეთ შემოთავაზებული ფოტოებიდან ან შეიყვანეთ საკუთარი ბმული.' : 'Select from our curated photography or paste your own custom image URL.'}
              </p>
              <CoverImagePicker
                value={coverImage}
                onChange={setCoverImage}
                presets={COVER_PRESETS}
              />
            </div>
          )}

          {/* STEP 7: THEME & FONT STYLES */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">
                  {lang === 'ka'
                    ? 'აირჩიეთ დიზაინის თემა და შრიფტი'
                    : 'Select Aesthetic Theme & Font Family'}
                </h3>
                <p className="text-xs text-stone-600">
                  {lang === 'ka'
                    ? 'შეგიძლიათ დააყენოთ ქართული ხელნაწერი, კალიგრაფია ან ელეგანტური სერიფი.'
                    : 'Select from authentic Georgian cursive scripts, royal calligraphy, or clean modern fonts.'}
                </p>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-2">
                  {lang === 'ka' ? '1. ფერთა პალიტრა (პრესეტი)' : '1. Color Palette Preset'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
                    const preset = THEME_PRESETS[key];
                    const isSelected = themePreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setThemePreset(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full mb-1.5 border border-black/10"
                          style={{ backgroundColor: preset.previewPrimary }}
                        />
                        <span className="text-[11px] font-bold block">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-stone-800">
                    {lang === 'ka'
                      ? '2. შრიფტი და ხელნაწერის სტილი'
                      : '2. Typography & Handwriting Style'}
                  </label>
                  <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-semibold">
                    {lang === 'ka' ? 'ქართული შრიფტების მხარდაჭერით' : 'Georgian fonts supported'}
                  </span>
                </div>

                <FontPicker
                  selectedFont={fontStyle}
                  onChange={setFontStyle}
                  compact={true}
                  showCustomPreviewInput={false}
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                  {lang === 'ka' ? 'როგორ გამოჩნდება თქვენს წიგნში:' : 'Live Preview in your Book:'}
                </span>
                <div
                  className="p-5 rounded-xl border shadow-sm transition-all"
                  style={{
                    backgroundColor: THEME_PRESETS[themePreset].previewBg,
                    fontFamily: getFontFamily(fontStyle)
                  }}
                >
                  <div
                    className="text-xs font-semibold tracking-wider uppercase mb-1"
                    style={{ color: THEME_PRESETS[themePreset].previewPrimary }}
                  >
                    {hostNames || title}
                  </div>
                  <div className="text-base sm:text-lg font-normal text-stone-900 leading-snug">
                    &ldquo;{welcomeMessage}&rdquo;
                  </div>
                  <div className="mt-3 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500">
                    <span>{eventDate}</span>
                    <span className="italic">
                      {lang === 'ka' ? 'შრიფტი:' : 'Font:'}{' '}
                      {FONT_OPTIONS.find((f) => f.id === fontStyle)?.nameKa || fontStyle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy & Moderation Toggles */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-semibold text-stone-800 block">
                      {lang === 'ka' ? 'მასპინძლის მიერ დამტკიცება (მოდერაცია)' : 'Require Host Approval'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {lang === 'ka' ? 'შეტყობინებები გამოქვეყნდება მხოლოდ თქვენი დადასტურების შემდეგ' : 'Hold messages in moderation queue before publishing'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isModerated}
                    onChange={(e) => setIsModerated(e.target.checked)}
                    className="w-4 h-4 rounded text-stone-900 focus:ring-0 cursor-pointer"
                  />
                </label>

                <div className="border-t border-stone-200/60 pt-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-semibold text-stone-800 block">
                        {lang === 'ka' ? 'პაროლით დაცვა' : 'Password Protect Guest Book'}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {lang === 'ka' ? 'მხოლოდ პაროლის მქონე სტუმრებს შეეძლებათ ნახვა' : 'Only people with the password can view memories'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  {isPrivate && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={lang === 'ka' ? 'შეიყვანეთ წვდომის პაროლი...' : 'Enter access password...'}
                        className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW & CONFIRM */}
          {step === 8 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-900">
                  {lang === 'ka' ? 'მზადაა გამოსაქვეყნებლად!' : 'Ready to Publish!'}
                </h3>
                <p className="text-xs text-stone-600">
                  {lang === 'ka'
                    ? 'გადაამოწმეთ დეტალები. შეცვლა ნებისმიერ დროს შეგიძლიათ მართვის პანელიდან.'
                    : 'Confirm your details below. You can customize everything anytime from your admin dashboard.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'სახელი:' : 'Event Name:'}</span>
                  <span className="font-semibold text-stone-900">{title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'ტიპი:' : 'Event Type:'}</span>
                  <span className="font-semibold text-stone-900 uppercase">{eventType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'თარიღი:' : 'Event Date:'}</span>
                  <span className="font-semibold text-stone-900">{eventDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'მასპინძლები:' : 'Host Names:'}</span>
                  <span className="font-semibold text-stone-900">{hostNames || title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'თემა:' : 'Theme:'}</span>
                  <span className="font-semibold text-stone-900 capitalize">{themePreset}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">{lang === 'ka' ? 'შრიფტი:' : 'Font Style:'}</span>
                  <span className="font-semibold text-stone-900">
                    {FONT_OPTIONS.find((f) => f.id === fontStyle)?.nameKa || fontStyle}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">{lang === 'ka' ? 'მოდერაცია:' : 'Moderation:'}</span>
                  <span className="font-semibold text-stone-900">
                    {isModerated
                      ? (lang === 'ka' ? 'ჩართულია (წინასწარი გადამოწმება)' : 'Enabled (Review First)')
                      : (lang === 'ka' ? 'მყისიერი გამოქვეყნება' : 'Instant Publish')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons — always reachable */}
        <div className="shrink-0 p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'ka' ? 'უკან' : 'Back'}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 8 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{lang === 'ka' ? 'შემდეგი' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="wizard-final-create-btn"
              type="button"
              disabled={loading}
              onClick={handleCreate}
              className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ka' ? 'იქმნება სტუმრების წიგნი...' : 'Creating Guest Book...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ka' ? 'შექმნა და გაშვება' : 'Create & Launch Guest Book'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
