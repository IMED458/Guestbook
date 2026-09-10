import { ThemePreset, ThemeSettings, FontStyle, CardStyle, ButtonStyle } from '../types.ts';

export interface ThemePresetOption {
  id: ThemePreset;
  name: string;
  description: string;
  settings: ThemeSettings;
  previewBg: string;
  previewPrimary: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetOption> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Warm ivory canvas with refined serif & golden warmth',
    previewBg: '#FCFAF6',
    previewPrimary: '#B45309',
    settings: {
      themePreset: 'classic',
      bgColor: '#FCFAF6',
      primaryColor: '#B45309',
      fontStyle: 'serif',
      cardStyle: 'soft',
      buttonStyle: 'rounded'
    }
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Crisp slate neutral, high-contrast typography & clean borders',
    previewBg: '#F8FAFC',
    previewPrimary: '#0F172A',
    settings: {
      themePreset: 'elegant',
      bgColor: '#F8FAFC',
      primaryColor: '#0F172A',
      fontStyle: 'sans',
      cardStyle: 'border',
      buttonStyle: 'pill'
    }
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean stark white, monochromatic aesthetic & generous space',
    previewBg: '#FFFFFF',
    previewPrimary: '#18181B',
    settings: {
      themePreset: 'minimal',
      bgColor: '#FFFFFF',
      primaryColor: '#18181B',
      fontStyle: 'sans',
      cardStyle: 'soft',
      buttonStyle: 'minimal'
    }
  },
  romantic: {
    id: 'romantic',
    name: 'Romantic',
    description: 'Blush rose tones, soft rounded cards & emotional editorial font',
    previewBg: '#FFF1F2',
    previewPrimary: '#E11D48',
    settings: {
      themePreset: 'romantic',
      bgColor: '#FFF1F2',
      primaryColor: '#E11D48',
      fontStyle: 'playfair',
      cardStyle: 'elevated',
      buttonStyle: 'pill'
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Deep onyx night, luminous accents & modern contrast',
    previewBg: '#09090B',
    previewPrimary: '#F43F5E',
    settings: {
      themePreset: 'dark',
      bgColor: '#09090B',
      primaryColor: '#F43F5E',
      fontStyle: 'sans',
      cardStyle: 'border',
      buttonStyle: 'rounded'
    }
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    description: 'Midnight navy with rich champagne gold accents & serif heading',
    previewBg: '#0F172A',
    previewPrimary: '#F59E0B',
    settings: {
      themePreset: 'luxury',
      bgColor: '#0F172A',
      primaryColor: '#F59E0B',
      fontStyle: 'playfair',
      cardStyle: 'elevated',
      buttonStyle: 'pill'
    }
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel',
    description: 'Gentle lavender & soft berry tones for playful celebrations',
    previewBg: '#FAF5FF',
    previewPrimary: '#9333EA',
    settings: {
      themePreset: 'pastel',
      bgColor: '#FAF5FF',
      primaryColor: '#9333EA',
      fontStyle: 'serif',
      cardStyle: 'soft',
      buttonStyle: 'rounded'
    }
  }
};

export interface FontOption {
  id: FontStyle;
  nameKa: string;
  nameEn: string;
  categoryKa: string;
  categoryEn: string;
  fontFamily: string;
  sampleKa: string;
  sampleEn: string;
  badgeKa: string;
  badgeEn: string;
  descriptionKa: string;
  descriptionEn: string;
  isHandwriting?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'serif',
    nameKa: 'საზეიმო სერიფი (Noto Serif)',
    nameEn: 'Royal Serif (Noto Serif)',
    categoryKa: 'სერიფი',
    categoryEn: 'Serif',
    fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, 'Times New Roman', serif",
    sampleKa: 'ქორწინება, ერთგულება და მარადიული სიყვარული. ❤️',
    sampleEn: 'Celebrating love, commitment, and joy. ❤️',
    badgeKa: 'რეკომენდებული',
    badgeEn: 'Recommended',
    descriptionKa: 'უმაღლესი კლასის საზეიმო ქართული შრიფტი — იდეალურია ქორწილებისა და სამახსოვრო წიგნებისთვის',
    descriptionEn: 'Regal, high-readability Georgian serif typography designed for luxury weddings and keepsakes'
  },
  {
    id: 'sans',
    nameKa: 'თანამედროვე სადა (FiraGO / Sans)',
    nameEn: 'Modern Clean (FiraGO / Sans)',
    categoryKa: 'სადა',
    categoryEn: 'Sans',
    fontFamily: "'FiraGO', 'Noto Sans Georgian', 'Plus Jakarta Sans', -apple-system, sans-serif",
    sampleKa: 'სუფთა, მკაფიო და უზადოდ იკითხვადი ტექსტი.',
    sampleEn: 'Clean, crisp and universally legible typography.',
    badgeKa: 'მოდერნი',
    badgeEn: 'Modern',
    descriptionKa: 'თანამედროვე ქართული სტანდარტი, უზადო სისუფთავე და მკაფიოობა ნებისმიერ ეკრანზე',
    descriptionEn: 'The contemporary Georgian standard with pristine readability on every screen'
  },
  {
    id: 'classic_script',
    nameKa: 'კლასიკური ხელწერა (BPG Classic)',
    nameEn: 'Classic Literary Script',
    categoryKa: 'ხელწერა',
    categoryEn: 'Script',
    fontFamily: "'BPG Classic', 'Noto Serif Georgian', Georgia, serif",
    sampleKa: 'მუდამ ერთად, ბედნიერად და სიხარულით! 🥂',
    sampleEn: 'Wishing you a lifetime of joy & harmony! 🥂',
    badgeKa: 'კლასიკა',
    badgeEn: 'Classic',
    descriptionKa: 'დახვეწილი კლასიკური ქართული ხელწერა დაბალანსებული და გლუვი ხაზებით',
    descriptionEn: 'Refined classic Georgian script with smooth, balanced curves',
    isHandwriting: true
  },
  {
    id: 'playfair',
    nameKa: 'Playfair ედიტორიალი',
    nameEn: 'Playfair Editorial Serif',
    categoryKa: 'დისპლეი',
    categoryEn: 'Editorial',
    fontFamily: "'Playfair Display', 'Noto Serif Georgian', Georgia, serif",
    sampleKa: 'ჟურნალისებრი, დახვეწილი და პრემიუმ სტილი. ✨',
    sampleEn: 'Editorial luxury with high typographic contrast. ✨',
    badgeKa: 'პრემიუმი',
    badgeEn: 'Editorial',
    descriptionKa: 'მაღალკონტრასტული საზეიმო შრიფტი პრემიუმ ალბომებისთვის',
    descriptionEn: 'High-contrast headline serif for premium wedding stationery'
  },
  {
    id: 'handwriting',
    nameKa: 'რომანტიკული კურსივი (Italic)',
    nameEn: 'Romantic Italic Serif',
    categoryKa: 'კურსივი',
    categoryEn: 'Handwriting',
    fontFamily: "'Noto Serif Georgian', 'Lora', Georgia, serif",
    sampleKa: 'სიყვარულითა და საუკეთესო სურვილებით! 🌸',
    sampleEn: 'With endless love and warmest wishes! 🌸',
    badgeKa: 'რომანტიკა',
    badgeEn: 'Romantic',
    descriptionKa: 'თბილი, პოეტური კურსივი ბუნებრივი და ცოცხალი ხელნაწერის შეგრძნებით',
    descriptionEn: 'Warm poetic cursive with natural literary flow',
    isHandwriting: true
  },
  {
    id: 'nostalgia',
    nameKa: 'ნოსტალგია ვინტაჟი',
    nameEn: 'Nostalgia Vintage Script',
    categoryKa: 'ვინტაჟი',
    categoryEn: 'Vintage',
    fontFamily: "'Noto Serif Georgian', 'Playfair Display', Georgia, serif",
    sampleKa: 'დაუვიწყარი მოგონებები და წლები... 🌸',
    sampleEn: 'Treasured memories to cherish forever... 🌸',
    badgeKa: 'ვინტაჟი',
    badgeEn: 'Vintage',
    descriptionKa: 'რომანტიკული რეტრო შრიფტი სამახსოვრო ალბომებისთვის',
    descriptionEn: 'Romantic vintage script for timeless keepsake albums',
    isHandwriting: true
  },
  {
    id: 'calligraphy',
    nameKa: 'საზეიმო კალიგრაფია',
    nameEn: 'Royal Calligraphy',
    categoryKa: 'კალიგრაფია',
    categoryEn: 'Calligraphy',
    fontFamily: "'Noto Serif Georgian', 'BPG Classic', Georgia, serif",
    sampleKa: 'გილოცავთ ამ ბედნიერ და საზეიმო დღეს! ✨',
    sampleEn: 'Celebrating your magical celebration! ✨',
    badgeKa: 'კალიგრაფიული',
    badgeEn: 'Calligraphy',
    descriptionKa: 'სადღესასწაულო ქართული საზეიმო კალიგრაფია',
    descriptionEn: 'Ornate Georgian celebratory calligraphy for royal aesthetics',
    isHandwriting: true
  },
  {
    id: 'nateli',
    nameKa: 'ნათელი დისპლეი (BPG Nateli)',
    nameEn: 'Nateli Modern Display',
    categoryKa: 'დისპლეი',
    categoryEn: 'Display',
    fontFamily: "'BPG Nateli', 'FiraGO', 'Noto Sans Georgian', sans-serif",
    sampleKa: 'გამორჩეული, თბილი ქართული დიზაინი.',
    sampleEn: 'Distinctive warm Georgian display.',
    badgeKa: 'გამორჩეული',
    badgeEn: 'Display',
    descriptionKa: 'მკაფიო და ენერგიული ქართული შრიფტი',
    descriptionEn: 'Expressive modern Georgian typeface'
  },
  {
    id: 'glaho',
    nameKa: 'გლახო კლასიკური (BPG Glaho)',
    nameEn: 'Glaho Literary Classic',
    categoryKa: 'ლიტერატურული',
    categoryEn: 'Literary',
    fontFamily: "'BPG Glaho', 'Noto Serif Georgian', Georgia, serif",
    sampleKa: 'ლიტერატურული და წიგნისებრი საზეიმო ელფერი.',
    sampleEn: 'Literary tone with authentic bookish character.',
    badgeKa: 'წიგნისებრი',
    badgeEn: 'Bookish',
    descriptionKa: 'ქართული ბეჭდური წიგნების ტრადიციული შრიფტი',
    descriptionEn: 'Traditional Georgian publishing and literary typeface'
  },
  {
    id: 'mono',
    nameKa: 'Space Grotesk მოდერნი',
    nameEn: 'Space Grotesk Minimal',
    categoryKa: 'გროტესკი',
    categoryEn: 'Grotesk',
    fontFamily: "'Space Grotesk', 'FiraGO', 'Noto Sans Georgian', monospace, sans-serif",
    sampleKa: 'ინოვაციური, გეომეტრიული და ტექნოლოგიური.',
    sampleEn: 'Geometric, techno and architectonic.',
    badgeKa: 'გროტესკი',
    badgeEn: 'Geometric',
    descriptionKa: 'გეომეტრიული თანამედროვე შრიფტი',
    descriptionEn: 'Geometric monospace-inspired modernism'
  }
];

export function isDarkColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16);
  const g = ((num >> 8) & 0x00FF);
  const b = (num & 0x0000FF);
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

export function getFontFamily(fontStyle: FontStyle): string {
  const match = FONT_OPTIONS.find((f) => f.id === fontStyle);
  if (match) return match.fontFamily;

  switch (fontStyle) {
    case 'serif':
      return "'Noto Serif Georgian', 'Lora', Georgia, 'Times New Roman', serif";
    case 'playfair':
      return "'Playfair Display', 'Noto Serif Georgian', Georgia, serif";
    case 'sans':
      return "'FiraGO', 'Noto Sans Georgian', 'Plus Jakarta Sans', -apple-system, sans-serif";
    case 'classic_script':
      return "'BPG Classic', 'Noto Serif Georgian', Georgia, serif";
    case 'nostalgia':
      return "'Noto Serif Georgian', 'Playfair Display', Georgia, serif";
    case 'calligraphy':
    case 'handwriting':
      return "'Noto Serif Georgian', 'Lora', Georgia, serif";
    case 'nateli':
      return "'BPG Nateli', 'FiraGO', 'Noto Sans Georgian', sans-serif";
    case 'glaho':
      return "'BPG Glaho', 'Noto Serif Georgian', Georgia, serif";
    case 'mono':
      return "'Space Grotesk', 'FiraGO', 'Noto Sans Georgian', monospace, sans-serif";
    default:
      return "'Noto Serif Georgian', 'FiraGO', -apple-system, BlinkMacSystemFont, sans-serif";
  }
}
