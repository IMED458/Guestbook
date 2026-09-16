import React, { useState } from 'react';
import {
  Heart,
  Sparkles,
  Play,
  Pause,
  PenTool,
  BookOpen,
  Send,
  Check,
  Share2,
  Camera,
  Music,
  ExternalLink,
  Layers,
  Calendar,
  Volume2
} from 'lucide-react';
import { FontStyle } from '../../types.ts';
import { FONT_OPTIONS, getFontFamily } from '../../lib/theme.ts';
import { useI18n } from '../../lib/i18n.tsx';

interface MemoryBookShowcaseProps {
  onViewDemo: () => void;
  onCreateBook: () => void;
}

interface DemoNote {
  id: string;
  author: string;
  roleKa: string;
  roleEn: string;
  textKa: string;
  textEn: string;
  date: string;
  likes: number;
  hasLiked?: boolean;
  photoUrl?: string;
  isAudio?: boolean;
  audioDuration?: string;
  rotation?: string;
}

export const MemoryBookShowcase: React.FC<MemoryBookShowcaseProps> = ({
  onViewDemo,
  onCreateBook
}) => {
  const { lang } = useI18n();

  // Active theme & typography controls for live experimentation
  const [activeFont, setActiveFont] = useState<FontStyle>('serif');
  const [activePalette, setActivePalette] = useState<'blush' | 'ivory' | 'midnight' | 'sage'>('blush');

  // Interactive audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);

  // Quick message adding in demo
  const [newAuthor, setNewAuthor] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Sample notes
  const [notes, setNotes] = useState<DemoNote[]>([
    {
      id: 'note-1',
      author: 'ელენე და გიორგი',
      roleKa: 'ოჯახის წევრები',
      roleEn: 'Family',
      textKa: 'თქვენს ცხოვრებაში დაიწყო ყველაზე ჯადოსნური და ლამაზი თავი! გისურვებთ ულევ სიყვარულს, ულამაზეს საერთო გზასა და ბედნიერებას ყოველ წამს! ❤️🥂✨',
      textEn: 'The most magical chapter of your lives has begun! Wishing you endless love, radiant smiles, and pure joy together! ❤️🥂✨',
      date: '15:42',
      likes: 24,
      photoUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      rotation: '-rotate-1'
    },
    {
      id: 'note-2',
      author: 'დავითი & მარიამი',
      roleKa: 'მეგობრები',
      roleEn: 'Friends',
      textKa: 'ხმოვანი მილოცვა: „ნიკა, ანა, მთელი გულით გილოცავთ! დაუვიწყარი საღამოა!“ 🎙️',
      textEn: 'Voice note: "Nika & Ana, congratulations from the bottom of our hearts! An unforgettable night!" 🎙️',
      date: '16:10',
      likes: 19,
      isAudio: true,
      audioDuration: '0:24',
      rotation: 'rotate-1'
    },
    {
      id: 'note-3',
      author: 'სოფო კალანდაძე',
      roleKa: 'მეჯვარე',
      roleEn: 'Maid of Honor',
      textKa: 'ანა ჩემო უსაყვარლესო და ნიკა! საოცარი წყვილი ხართ, მუდამ ასე ანათებდეთ და ერთმანეთს სითბოს ჩუქნიდეთ! მიყვარხართ! 🌸👰🤵',
      textEn: 'My dearest Ana and Nika! You are the most breathtaking couple. Keep shining and inspiring us all with your love! 🌸👰🤵',
      date: '17:05',
      likes: 31,
      photoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      rotation: '-rotate-0.5'
    }
  ]);

  const palettes = {
    blush: {
      id: 'blush',
      nameKa: 'ვარდისფერი რომანტიკა',
      nameEn: 'Romantic Blush',
      bookCover: 'bg-[#FFF5F6]',
      pageBg: 'bg-[#FFFBFC]',
      primaryColor: '#E11D48',
      accentBadge: 'bg-rose-100 text-rose-800 border-rose-200',
      paperBorder: 'border-rose-200/70',
      leatherSpine: 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950',
      goldFoil: '#D4AF37'
    },
    ivory: {
      id: 'ivory',
      nameKa: 'სპილოსძვლისფერი & ოქრო',
      nameEn: 'Ivory & Gold',
      bookCover: 'bg-[#FAF7F2]',
      pageBg: 'bg-[#FCFAF7]',
      primaryColor: '#B45309',
      accentBadge: 'bg-amber-100 text-amber-900 border-amber-200',
      paperBorder: 'border-amber-200/70',
      leatherSpine: 'bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900',
      goldFoil: '#B45309'
    },
    midnight: {
      id: 'midnight',
      nameKa: 'შუაღამის ლუქსი',
      nameEn: 'Midnight Luxury',
      bookCover: 'bg-[#0F172A]',
      pageBg: 'bg-[#141E33]',
      primaryColor: '#F59E0B',
      accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      paperBorder: 'border-stone-700/80',
      leatherSpine: 'bg-gradient-to-r from-stone-950 via-black to-stone-950',
      goldFoil: '#F59E0B'
    },
    sage: {
      id: 'sage',
      nameKa: 'ზურმუხტოვანი სიმწვანე',
      nameEn: 'Olive & Sage',
      bookCover: 'bg-[#F4F7F4]',
      pageBg: 'bg-[#FAFBF9]',
      primaryColor: '#15803D',
      accentBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      paperBorder: 'border-emerald-200/70',
      leatherSpine: 'bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900',
      goldFoil: '#15803D'
    }
  };

  const currentTheme = palettes[activePalette];
  const isDarkTheme = activePalette === 'midnight';

  const fontOptionsList = [
    { id: 'serif' as FontStyle, labelKa: '📖 საზეიმო სერიფი', labelEn: '📖 Royal Serif', badge: 'რეკომენდებული' },
    { id: 'sans' as FontStyle, labelKa: '💎 თანამედროვე სადა', labelEn: '💎 Modern Sans', badge: 'სადა' },
    { id: 'classic_script' as FontStyle, labelKa: '🖋️ კლასიკური ხელწერა', labelEn: '🖋️ Classic Script', badge: 'კლასიკა' },
    { id: 'playfair' as FontStyle, labelKa: '✨ Playfair ედიტორიალი', labelEn: '✨ Playfair', badge: 'პრემიუმი' },
    { id: 'handwriting' as FontStyle, labelKa: '🌸 რომანტიკული კურსივი', labelEn: '🌸 Romantic Italic', badge: 'რომანტიკა' }
  ];

  const handleLike = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const hasLiked = !n.hasLiked;
        return {
          ...n,
          hasLiked,
          likes: hasLiked ? n.likes + 1 : n.likes - 1
        };
      })
    );
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newMessage.trim()) return;

    const newEntry: DemoNote = {
      id: `custom-${Date.now()}`,
      author: newAuthor.trim(),
      roleKa: 'სტუმარი (თქვენ)',
      roleEn: 'Guest (You)',
      textKa: newMessage.trim(),
      textEn: newMessage.trim(),
      date: 'ახლახან',
      likes: 1,
      hasLiked: true,
      rotation: 'rotate-0.5'
    };

    setNotes([newEntry, ...notes]);
    setNewAuthor('');
    setNewMessage('');
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3500);
  };

  return (
    <section
      className="w-full max-w-6xl mx-auto"
      aria-label={lang === 'ka' ? 'ინტერაქტიული მაგალითი' : 'Interactive example'}
    >
      <p className="mb-3 text-xs font-semibold text-stone-700 text-center">
        {lang === 'ka'
          ? 'ინტერაქტიული მაგალითი — ქვემოთ მოცემული ჩანაწერები სადემონსტრაციოა და არა რეალური მომხმარებლების შეფასებები.'
          : 'Interactive example — the entries below are sample content, not real customer reviews.'}
      </p>

      {/* Top Floating Control Bar: Interactive Font & Theme Picker */}
      <div className="mb-6 p-3 sm:p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Font Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 mr-1">
            <PenTool className="w-4 h-4 text-rose-600" />
            <span>{lang === 'ka' ? 'შრიფტის გამოცდა:' : 'Test Font:'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {fontOptionsList.map((f) => {
              const isSelected = activeFont === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFont(f.id)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                  }`}
                >
                  {lang === 'ka' ? f.labelKa : f.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Color Palette */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
            {lang === 'ka' ? 'თემა:' : 'Theme:'}
          </span>
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200">
            {Object.values(palettes).map((pal) => {
              const isSelected = activePalette === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setActivePalette(pal.id as any)}
                  aria-pressed={isSelected}
                  aria-label={`${lang === 'ka' ? 'თემა' : 'Theme'}: ${lang === 'ka' ? pal.nameKa : pal.nameEn}`}
                  title={lang === 'ka' ? pal.nameKa : pal.nameEn}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${
                    isSelected ? 'ring-2 ring-stone-900 scale-105' : 'hover:opacity-80'
                  }`}
                  style={{ backgroundColor: pal.primaryColor }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Luxury Memory Book Album Frame */}
      <div className="relative rounded-3xl sm:rounded-[36px] p-2 sm:p-5 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 shadow-2xl border border-stone-800/80 overflow-hidden">
        {/* Real Gold Bookmark Silk Ribbon Effect */}
        <div className="absolute top-0 right-12 z-20 w-8 h-20 bg-gradient-to-b from-rose-600 to-rose-700 shadow-md transform -skew-y-3 origin-top flex flex-col justify-between items-center pb-2">
          <div className="w-full h-1 bg-amber-400/40" />
          <Heart className="w-3.5 h-3.5 text-white fill-white animate-pulse" />
        </div>

        {/* Open Book Spread Container */}
        <div
          className={`relative rounded-2xl sm:rounded-[28px] overflow-hidden border ${currentTheme.paperBorder} transition-all duration-500 font-sans`}
        >
          {/* Header Banner: Book Spine & Monogram */}
          <div
            className={`p-6 sm:p-10 border-b ${currentTheme.paperBorder} ${
              isDarkTheme ? 'bg-stone-900 text-white' : 'bg-gradient-to-b from-rose-50/70 to-white text-stone-900'
            } transition-colors`}
          >
            <div className="max-w-3xl mx-auto text-center relative">
              {/* Wax Seal / Monogram Stamp */}
              <div className="flex flex-col items-center justify-center mb-4">
                <div
                  className="w-14 h-14 rounded-full border-2 border-amber-300 shadow-md flex items-center justify-center text-sm font-serif font-bold tracking-widest uppercase mb-3 select-none"
                  style={{
                    backgroundColor: currentTheme.primaryColor,
                    color: '#ffffff'
                  }}
                >
                  ნ & ა
                </div>

                {/* Event Sub-label */}
                <div className="flex flex-wrap items-center justify-center gap-2 font-sans">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 bg-rose-50/90 px-3 py-1 rounded-full border border-rose-200">
                    {lang === 'ka' ? 'საქორწილო სტუმრების წიგნი' : 'WEDDING GUEST BOOK'}
                  </span>
                  <span className="text-xs text-stone-600 font-sans flex items-center gap-1.5 bg-stone-100/90 px-3 py-1 rounded-full border border-stone-200">
                    <Calendar className="w-3.5 h-3.5 text-stone-600" />
                    15 სექტემბერი, 2026
                  </span>
                </div>
              </div>

              {/* Title in Royal Georgian Serif */}
              <h2
                className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 leading-tight transition-all font-serif"
                style={{ fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, serif" }}
              >
                {lang === 'ka' ? 'ნიკასა და ანას ქორწილი' : 'Nika & Ana’s Wedding Celebration'}
              </h2>

              {/* Host Welcome Note */}
              <p
                className="mt-3 text-base sm:text-xl italic leading-relaxed text-stone-700 max-w-2xl mx-auto font-serif"
                style={{ fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, serif" }}
              >
                &ldquo;
                {lang === 'ka'
                  ? 'მოგესალმებით ჩვენს საქორწილო სტუმრების წიგნში ❤️ დაგვიტოვეთ თქვენი გულწრფელი სურვილები, მოგონებები და ფოტოები, რომლებიც სამუდამოდ გაგვახარებს.'
                  : 'Welcome to our wedding guest book ❤️ Leave us a heartfelt message, memory or photo that we will cherish for a lifetime.'}
                &rdquo;
              </p>

              {/* Quick Actions in Showcase */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 font-sans">
                <button
                  type="button"
                  onClick={onViewDemo}
                  className="px-6 py-3 rounded-xl text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'ka' ? 'სრული დემო წიგნის გახსნა' : 'Open Full Live Guest Book'}</span>
                </button>

                <button
                  type="button"
                  onClick={onCreateBook}
                  className="px-5 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-900 text-xs font-bold transition-all border border-stone-300 shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'ka' ? 'შექმენი შენი წიგნი' : 'Create Your Own Book'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Book Content / Memory Wall */}
          <div
            className={`p-4 sm:p-8 ${currentTheme.pageBg} min-h-[460px] transition-colors`}
          >
            {/* Memory Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {notes.map((note) => {
                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl p-5 border ${currentTheme.paperBorder} bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group ${note.rotation || ''}`}
                  >
                    {/* Washi Tape Header Decoration */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-amber-100/80 border border-amber-200/90 rounded-sm transform -rotate-1 shadow-xs z-10 opacity-80" />

                    <div>
                      {/* Polaroid Photo (if exists) */}
                      {note.photoUrl && (
                        <div className="mb-4 rounded-xl overflow-hidden p-1.5 bg-stone-50 border border-stone-200 shadow-inner group-hover:scale-[1.01] transition-transform">
                          <img
                            src={note.photoUrl}
                            alt={
                              lang === 'ka'
                                ? `სადემონსტრაციო ფოტო ჩანაწერთან — ${note.author}`
                                : `Sample photo attached to the entry by ${note.author}`
                            }
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Author Header */}
                      <div className="flex items-center justify-between gap-2 mb-2 font-sans">
                        <div className="font-bold text-stone-900 text-sm">
                          {note.author}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200/70">
                          {lang === 'ka' ? note.roleKa : note.roleEn}
                        </span>
                      </div>

                      {/* Audio Message Player simulation */}
                      {note.isAudio && (
                        <div className="my-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 font-sans">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                              aria-label={
                                isPlayingAudio
                                  ? (lang === 'ka' ? 'ხმოვანი შეტყობინების პაუზა' : 'Pause the voice message')
                                  : (lang === 'ka' ? 'ხმოვანი შეტყობინების დაკვრა' : 'Play the voice message')
                              }
                              className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-sm"
                            >
                              {isPlayingAudio ? (
                                <Pause className="w-4 h-4 fill-white" aria-hidden="true" />
                              ) : (
                                <Play className="w-4 h-4 fill-white ml-0.5" aria-hidden="true" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[11px] text-stone-600 mb-1">
                                <span className="font-semibold flex items-center gap-1">
                                  <Volume2 className="w-3 h-3 text-rose-600" />
                                  {lang === 'ka' ? 'ხმოვანი შეტყობინება' : 'Voice Memo'}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {isPlayingAudio ? '0:12' : note.audioDuration}
                                </span>
                              </div>
                              {/* Audio Soundwave Bars */}
                              <div className="flex items-center gap-0.5 h-4">
                                {[40, 70, 90, 60, 100, 45, 80, 50, 95, 60, 85, 40, 75, 90, 55, 30].map(
                                  (height, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex-1 rounded-full transition-all duration-300 ${
                                        idx < 7 && isPlayingAudio
                                          ? 'bg-rose-600'
                                          : 'bg-stone-300'
                                      }`}
                                      style={{
                                        height: isPlayingAudio
                                          ? `${Math.max(20, (height * (idx % 2 === 0 ? 1 : 0.7)))}%`
                                          : `${height * 0.5}%`
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Note Body in Selected Georgian Font */}
                      <p
                        className="text-base text-stone-800 leading-relaxed transition-all font-medium whitespace-pre-line"
                        style={{ fontFamily: getFontFamily(activeFont) }}
                      >
                        {lang === 'ka' ? note.textKa : note.textEn}
                      </p>
                    </div>

                    {/* Footer: Reaction Heart & Time */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 font-sans">
                      <span>{note.date}</span>
                      <button
                        type="button"
                        onClick={() => handleLike(note.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                          note.hasLiked
                            ? 'bg-rose-50 text-rose-600 font-bold border border-rose-200'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            note.hasLiked ? 'fill-rose-600 text-rose-600' : 'text-stone-600'
                          }`}
                        />
                        <span>{note.likes}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive "Leave a Test Note" Banner right inside the Demo */}
            <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white border border-stone-200 shadow-sm font-sans">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    <span>
                      {lang === 'ka'
                        ? 'გამოსცადეთ თავად: დაწერეთ სატესტო მილოცვა'
                        : 'Try it yourself: Leave a quick test message'}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {lang === 'ka'
                      ? 'აკრიფეთ ტექსტი და ნახეთ, როგორ გამოჩნდება ქართული ხელნაწერის შრიფტით წიგნში.'
                      : 'Type anything and see how it dynamically renders on the memory wall in your selected font.'}
                  </p>
                </div>

                {addedSuccess && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'ka' ? 'მილოცვა დაემატა კედელზე!' : 'Added to the memory wall!'}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleAddQuickNote} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder={lang === 'ka' ? 'თქვენი სახელი (მაგ. ნინო & გიგა)' : 'Your name (e.g. Nino & Giga)'}
                  className="px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 transition-colors"
                />
                <input
                  type="text"
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    lang === 'ka'
                      ? 'მილოცვის ტექსტი (მაგ. ბედნიერებას და სიხარულს გისურვებთ!)'
                      : 'Message text (e.g. Wishing you a lifetime of laughter!)'
                  }
                  className="px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'ka' ? 'კედელზე გამოქვეყნება' : 'Post to Memory Wall'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
