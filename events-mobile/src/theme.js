import { Platform } from 'react-native';

export const colors = {
  ink: '#0f172a',
  inkSoft: '#334155',
  muted: '#64748b',
  line: 'rgba(148, 163, 184, 0.24)',
  white: '#ffffff',
  panel: 'rgba(255,255,255,0.74)',
  panelStrong: 'rgba(255,255,255,0.9)',
  cyan: '#0891b2',
  cyanBright: '#0ea5e9',
  teal: '#14b8a6',
  tealSoft: '#ccfbf1',
  gold: '#f59e0b',
  goldSoft: '#fef3c7',
  success: '#15803d',
  successSoft: '#e7f8ee',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  skySoft: '#e0f2fe',
  shell: '#f8fbff',
  shellBottom: '#eef4ff',
};

export const fonts = {
  heading: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
  body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
};

export const shadows = {
  panel: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};