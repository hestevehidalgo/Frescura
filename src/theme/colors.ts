// Paleta cálida de Frescura: crema, verde hoja y tomate.
// Cada color de texto cumple contraste AA (4,5:1) sobre su fondo; ver colors.test.ts.

export const palette = {
  light: {
    background: '#FBF7F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F1EADF',
    border: '#E2D8CA',
    text: '#2A2420',
    textMuted: '#6B5F55',
    primary: '#2F6B45',
    onPrimary: '#FFFFFF',
    accent: '#B8462B',
    onAccent: '#FFFFFF',
    tabInactive: '#7A6E64',
    // Estados de vencimiento: siempre con ícono y texto, nunca solo color.
    dangerBg: '#FBE3DC',
    dangerFg: '#9A2E15',
    warnBg: '#FCEBC9',
    warnFg: '#7A4A00',
    okBg: '#E2F0E6',
    okFg: '#22573A',
    neutralBg: '#EFE8DD',
    neutralFg: '#5C5148',
    overlay: 'rgba(30, 24, 20, 0.45)',
  },
  dark: {
    background: '#161311',
    surface: '#221E1B',
    surfaceAlt: '#2C2724',
    border: '#3A3430',
    text: '#F3EEE7',
    textMuted: '#B9AEA3',
    primary: '#7FC99A',
    onPrimary: '#10261A',
    accent: '#F08A6E',
    onAccent: '#2A0F07',
    tabInactive: '#A0958B',
    dangerBg: '#4A1F16',
    dangerFg: '#FFB8A3',
    warnBg: '#47360F',
    warnFg: '#FFD98A',
    okBg: '#1D3A28',
    okFg: '#A7DDB9',
    neutralBg: '#2F2A26',
    neutralFg: '#D6CCC2',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };
