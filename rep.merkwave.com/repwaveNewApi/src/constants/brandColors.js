/**
 * RepWave brand palette — aligned with logo purple tones.
 */
export const BRAND = {
  primary: '#8B5FD6',
  primaryHover: '#7A52C2',
  primaryDark: '#2D1B69',
  primaryDeep: '#1A0F35',
  lavender: '#C4A8F0',
  lavenderLight: '#EDE7FF',
  lavenderSoft: '#f5f3ff',
  indigo: '#6366F1',
  violet: '#A78BFA',
};

/** Extended purple-family accents for dashboards & charts */
export const DASHBOARD = {
  plum: '#9333EA',
  grape: '#6D28D9',
  orchid: '#D946EF',
  fuchsia: '#C026D3',
  periwinkle: '#818CF8',
  mauve: '#E879F9',
  lilac: '#DDD6FE',
  accents: [
    '#8B5FD6',
    '#9333EA',
    '#6366F1',
    '#A78BFA',
    '#7A52C2',
    '#C026D3',
    '#6D28D9',
    '#818CF8',
  ],
};

export const MODAL_GRADIENTS = {
  /** Default — logo purple */
  brand: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%)`,
  purple: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.indigo} 100%)`,
  soft: `linear-gradient(135deg, ${BRAND.violet} 0%, ${BRAND.primary} 100%)`,
  deep: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 100%)`,
  danger: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, #BE123C 100%)`,
  // Legacy aliases → purple family
  green: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%)`,
  amber: `linear-gradient(135deg, ${BRAND.violet} 0%, ${BRAND.primary} 100%)`,
  slate: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.indigo} 100%)`,
};

export const modalBackdropClass = 'fixed inset-0 flex items-center justify-center bg-[#1A0F35]/40 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fadeIn';

export const modalPanelClass =
  'bg-[#FAFAFE] rounded-2xl shadow-[0_25px_60px_-10px_rgba(139,95,214,0.35)] w-full overflow-hidden flex flex-col max-h-[92vh] border border-[#EDE7FF]';

export const modalInputClass =
  'mt-1 block w-full px-3 py-2.5 border border-[#EDE7FF] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B5FD6]/25 focus:border-[#8B5FD6] sm:text-sm bg-white';

export const modalSectionClass =
  'bg-white rounded-xl border border-[#EDE7FF]/80 shadow-sm overflow-hidden';

export const modalSectionHeaderClass =
  'flex items-center gap-2 px-4 py-2.5 border-b border-[#EDE7FF] bg-[#FAFAFE]';

export const modalPrimaryBtnClass =
  'px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B5FD6] hover:bg-[#7A52C2] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';

export const modalSecondaryBtnClass =
  'px-5 py-2.5 border border-[#EDE7FF] rounded-xl text-sm font-semibold text-[#2D1B69] bg-white hover:bg-[#FAFAFE] transition-colors';

export const modalGhostBtnClass =
  'px-4 py-2 text-xs font-semibold rounded-xl bg-[#EDE7FF]/60 hover:bg-[#EDE7FF] text-[#2D1B69] transition-colors';

export const modalHeaderActionClass =
  'no-print px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors';
