import React from 'react';
import AppModalShell, { modalGhostBtnClass } from '../AppModalShell.jsx';

/**
 * Legacy Modal wrapper — delegates to AppModalShell for consistent purple branding.
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  modalWidthClass,
  actions,
  size = 'medium',
  footer,
}) {
  const sizeMap = {
    small: 'sm',
    medium: 'md',
    large: 'xl',
    xlarge: '3xl',
    full: '3xl',
  };

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title={title}
      size={sizeMap[size] || 'md'}
      widthClass={modalWidthClass}
      gradient="brand"
      headerActions={actions}
      portal
      footer={
        footer !== undefined ? footer : (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={modalGhostBtnClass}>
              إغلاق
            </button>
          </div>
        )
      }
    >
      {children}
    </AppModalShell>
  );
}

export default Modal;
