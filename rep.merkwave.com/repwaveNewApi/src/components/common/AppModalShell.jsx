import React from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  BRAND,
  MODAL_GRADIENTS,
  modalBackdropClass,
  modalPanelClass,
  modalInputClass,
  modalSectionClass,
  modalSectionHeaderClass,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalGhostBtnClass,
  modalHeaderActionClass,
} from '../../constants/brandColors.js';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
};

/**
 * Shared modern modal shell — purple brand palette throughout.
 */
export default function AppModalShell({
  open = true,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  headerActions,
  size = 'xl',
  widthClass,
  gradient = 'brand',
  zIndex = 'z-50',
  bodyClassName = 'p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#FAFAFE]',
  panelClassName = '',
  printClassName = '',
  closeOnBackdrop = true,
  portal = false,
}) {
  if (!open) return null;

  const width = widthClass || SIZE_CLASSES[size] || SIZE_CLASSES.xl;
  const gradientStyle = MODAL_GRADIENTS[gradient] || gradient;

  const modal = (
    <div
      className={`${modalBackdropClass} ${zIndex}`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`${modalPanelClass} ${width} my-2 sm:my-4 ${panelClassName} ${printClassName}`}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div
          className="px-5 py-4 flex items-center justify-between shrink-0 relative overflow-hidden"
          style={{ background: gradientStyle }}
        >
          {/* subtle shine */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 20% 0%, rgba(255,255,255,0.45) 0%, transparent 55%)',
            }}
          />
          <div className="flex items-center gap-3 min-w-0 relative z-10">
            {Icon && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 shrink-0 ring-1 ring-white/20">
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white truncate drop-shadow-sm">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-white/80 truncate hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 no-print relative z-10">
            {headerActions}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 text-white transition-colors ring-1 ring-white/10"
                aria-label="إغلاق"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className={bodyClassName}>{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-[#EDE7FF] bg-white shrink-0 no-print">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return portal ? createPortal(modal, document.body) : modal;
}

export {
  BRAND,
  MODAL_GRADIENTS,
  modalInputClass,
  modalSectionClass,
  modalSectionHeaderClass,
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalGhostBtnClass,
  modalHeaderActionClass,
};
