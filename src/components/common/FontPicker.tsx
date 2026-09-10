import React, { useState } from 'react';
import { FontStyle } from '../../types.ts';
import { FONT_OPTIONS, FontOption } from '../../lib/theme.ts';
import { useI18n } from '../../lib/i18n.tsx';
import { Check, Sparkles, PenTool, Type, BookOpen, Layers } from 'lucide-react';

interface FontPickerProps {
  selectedFont: FontStyle;
  onChange: (font: FontStyle) => void;
  compact?: boolean;
  showCustomPreviewInput?: boolean;
}

export const FontPicker: React.FC<FontPickerProps> = ({
  selectedFont,
  onChange,
  compact = false,
  showCustomPreviewInput = true
}) => {
  const { lang } = useI18n();
  const [filter, setFilter] = useState<'all' | 'handwriting' | 'serif' | 'sans'>('all');
  const [customText, setCustomText] = useState('');

  const filteredFonts = FONT_OPTIONS.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'handwriting') {
      return (
        f.id === 'handwriting' ||
        f.id === 'calligraphy' ||
        f.id === 'classic_script' ||
        f.id === 'nostalgia'
      );
    }
    if (filter === 'serif') {
      return f.id === 'serif' || f.id === 'playfair' || f.id === 'glaho';
    }
    if (filter === 'sans') {
      return f.id === 'sans' || f.id === 'nateli' || f.id === 'mono';
    }
    return true;
  });

  const categories = [
    {
      id: 'all',
      labelKa: 'ყველა შრიფტი',
      labelEn: 'All Fonts',
      icon: Layers,
      count: FONT_OPTIONS.length
    },
    {
      id: 'handwriting',
      labelKa: '✍️ ხელნაწერი & კალიგრაფია',
      labelEn: '✍️ Handwriting & Script',
      icon: PenTool,
      count: 4
    },
    {
      id: 'serif',
      labelKa: '📖 სერიფი & წიგნისებრი',
      labelEn: '📖 Serif & Editorial',
      icon: BookOpen,
      count: 3
    },
    {
      id: 'sans',
      labelKa: '✨ სადა & მოდერნი',
      labelEn: '✨ Modern & Sans',
      icon: Type,
      count: 3
    }
  ];

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {categories.map((cat) => {
          const isSelected = filter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>{lang === 'ka' ? cat.labelKa : cat.labelEn}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Live Sample Custom Input */}
      {showCustomPreviewInput && (
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
          <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {lang === 'ka'
                ? 'შემოწმება საკუთარი ტექსტით (აკრიფეთ სიტყვა):'
                : 'Test with your custom text:'}
            </span>
            {customText && (
              <button
                type="button"
                onClick={() => setCustomText('')}
                className="text-[10px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                {lang === 'ka' ? 'გასუფთავება' : 'Clear'}
              </button>
            )}
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              lang === 'ka'
                ? 'მაგ. ნიკა და ანა, გილოცავთ ქორწინებას! ❤️'
                : 'e.g. Nika & Ana, wishing you everlasting happiness! ❤️'
            }
            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-stone-900 transition-colors"
          />
        </div>
      )}

      {/* Font Cards Grid */}
      <div
        className={`grid gap-3 ${
          compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
        }`}
      >
        {filteredFonts.map((font) => {
          const isSelected = selectedFont === font.id;
          const displaySample = customText.trim()
            ? customText
            : lang === 'ka'
            ? font.sampleKa
            : font.sampleEn;

          return (
            <button
              key={font.id}
              type="button"
              onClick={() => onChange(font.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer group ${
                isSelected
                  ? 'border-stone-900 bg-stone-900/3 ring-2 ring-stone-900 shadow-sm'
                  : 'border-stone-200/90 bg-white hover:border-stone-400 hover:shadow-xs'
              }`}
            >
              {/* Top Row: Font Name & Badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900 tracking-tight">
                    {lang === 'ka' ? font.nameKa : font.nameEn}
                  </span>
                  {font.isHandwriting && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 inline-flex items-center gap-1">
                      <PenTool className="w-2.5 h-2.5" />
                      {lang === 'ka' ? font.badgeKa : font.badgeEn}
                    </span>
                  )}
                  {!font.isHandwriting && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                      {lang === 'ka' ? font.badgeKa : font.badgeEn}
                    </span>
                  )}
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-stone-900 text-white'
                      : 'border border-stone-300 text-transparent group-hover:border-stone-500'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-stone-500 mb-3 line-clamp-1">
                {lang === 'ka' ? font.descriptionKa : font.descriptionEn}
              </p>

              {/* Real Font Rendering Display Box */}
              <div
                className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 transition-colors group-hover:bg-amber-50/30"
                style={{ fontFamily: font.fontFamily }}
              >
                <div
                  className={`text-base sm:text-lg leading-snug text-stone-900 transition-all ${
                    font.isHandwriting ? 'text-rose-950 font-normal' : ''
                  }`}
                >
                  {displaySample}
                </div>
                <div className="mt-1 text-[11px] text-stone-600 tracking-wider">
                  აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ • Aa Bb Cc 123
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
