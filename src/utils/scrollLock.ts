import { useEffect } from 'react';

/**
 * Hook to lock body scrolling when a modal or overlay is open.
 * Restores original overflow behavior on close or unmount.
 */
let activeScrollLocks = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Hook to lock body scrolling when a modal or overlay is open.
 * Stack-safe: preserves scroll lock when multiple modals open/close.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    if (activeScrollLocks === 0) {
      originalOverflow = window.getComputedStyle(document.body).overflow;
      originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    activeScrollLocks++;

    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);
      if (activeScrollLocks === 0) {
        document.body.style.overflow = originalOverflow === 'hidden' ? '' : originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}
