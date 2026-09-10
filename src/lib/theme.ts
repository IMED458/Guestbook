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
  switch (fontStyle) {
    case 'playfair':
      return "'Playfair Display', 'Noto Serif Georgian', Georgia, serif";
    case 'serif':
      return "'Lora', 'Noto Serif Georgian', Georgia, serif";
    case 'mono':
      return "'Space Grotesk', 'Noto Sans Georgian', monospace, sans-serif";
    case 'sans':
    default:
      return "'Plus Jakarta Sans', 'Noto Sans Georgian', -apple-system, BlinkMacSystemFont, sans-serif";
  }
}
