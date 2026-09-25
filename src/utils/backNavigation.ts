import { useEffect, useRef } from 'react';

export type BackHandler = () => boolean | void; // return false only if not handled, true or void if handled
export type VoidHandler = () => void;

export interface BackEntry {
  id: string;
  priority: number;
  onBack: () => boolean | void;
  pushHistory: boolean;
  poppedByHistory: boolean;
  timestamp: number;
}

// Unified priority stack of all active back handlers
const backStack: BackEntry[] = [];
let globalTabBackHandler: BackHandler | null = null;
let globalExitHandler: VoidHandler | null = null;
let isInitialized = false;

// Counter for programmatic history.back() calls so popstate can safely ignore them
let programmaticBackCount = 0;
let programmaticBackResetTimeout: any = null;

function safeDecrementProgrammaticBack() {
  if (programmaticBackCount > 0) {
    programmaticBackCount--;
  }
}

function recordProgrammaticBack() {
  programmaticBackCount++;
  if (programmaticBackResetTimeout) {
    clearTimeout(programmaticBackResetTimeout);
  }
  // Auto-decay safety timeout: in case the browser drops or throttles popstate, reset after 250ms
  programmaticBackResetTimeout = setTimeout(() => {
    programmaticBackCount = 0;
  }, 250);
}

function initGlobalBackListeners() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Listen for browser / hardware / Android popstate
  window.addEventListener('popstate', (_e) => {
    // A. If triggered by our own programmatic history.back(), consume and ignore it
    if (programmaticBackCount > 0) {
      safeDecrementProgrammaticBack();
      return;
    }

    // B. Check unified backStack (sorted by priority descending, then newest first)
    if (backStack.length > 0) {
      sortBackStack();
      const topEntry = backStack.pop();
      if (topEntry) {
        topEntry.poppedByHistory = true;
        try {
          const result = topEntry.onBack();
          // If onBack explicitly returned false, it didn't consume it; otherwise considered handled
          if (result !== false) {
            return;
          }
        } catch (err) {
          console.error('Error executing back action:', err);
          return;
        }
      }
    }

    // C. Check tab back handler (e.g. from 'analyze' or 'more' to 'home')
    if (globalTabBackHandler) {
      try {
        const handled = globalTabBackHandler();
        if (handled !== false) return;
      } catch (err) {
        console.error('Error executing tab back handler:', err);
      }
    }

    // D. Root exit handler (on 'home' tab)
    if (globalExitHandler) {
      try {
        globalExitHandler();
      } catch (err) {
        console.error('Error executing exit handler:', err);
      }
    }
  });

  // 2. Listen for Keyboard 'Escape' key to trigger top back action seamlessly
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      const handled = triggerBackAction();
      if (handled) {
        e.preventDefault();
      }
    }
  });
}

function sortBackStack() {
  // Sort by priority descending (highest first). If equal, newest first (LIFO).
  backStack.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.timestamp - a.timestamp;
  });
}

/**
 * Programmatically triggers the top back action.
 * Used by in-app back buttons, keyboard shortcuts, or touch gestures.
 * Returns true if an action was handled.
 */
export function triggerBackAction(): boolean {
  initGlobalBackListeners();

  // 1. Check unified stack
  if (backStack.length > 0) {
    sortBackStack();
    const topEntry = backStack.pop();
    if (topEntry) {
      try {
        const result = topEntry.onBack();
        if (result !== false) {
          // If this entry pushed a history state, pop it programmatically
          if (topEntry.pushHistory && typeof window !== 'undefined') {
            recordProgrammaticBack();
            try {
              window.history.back();
            } catch (_) {
              safeDecrementProgrammaticBack();
            }
          }
          return true;
        }
      } catch (err) {
        console.error('Error in triggerBackAction:', err);
        return true;
      }
    }
  }

  // 2. Check tab back handler
  if (globalTabBackHandler) {
    try {
      const handled = globalTabBackHandler();
      if (handled !== false) {
        return true;
      }
    } catch (err) {
      console.error('Error in tab back handler:', err);
    }
  }

  // 3. Check exit handler
  if (globalExitHandler) {
    try {
      globalExitHandler();
      return true;
    } catch (err) {
      console.error('Error in globalExitHandler:', err);
    }
  }

  return false;
}

/**
 * Returns true if any modal, card, drawer, or drilldown is currently active in the back stack.
 */
export function hasActiveBackItem(): boolean {
  return backStack.length > 0;
}

/**
 * Generalized Hook for any back-intercepting element:
 * - Modals
 * - Action cards / detail sheets
 * - Popovers / dropdowns
 * - Drill-downs
 * - Drawers / accordions
 */
export function useBackAction(
  isActive: boolean,
  onBack: () => boolean | void,
  options: {
    id: string;
    priority?: number;
    pushHistory?: boolean;
  }
): void {
  const { id, priority = 30, pushHistory = true } = options;
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const isPushedRef = useRef(false);

  useEffect(() => {
    initGlobalBackListeners();

    if (!isActive) {
      // Element is closed or was just closed
      const idx = backStack.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const entry = backStack[idx];
        backStack.splice(idx, 1);

        // If it was pushed to history and NOT popped by browser history, revert the history entry
        if (entry.pushHistory && !entry.poppedByHistory && isPushedRef.current) {
          recordProgrammaticBack();
          try {
            window.history.back();
          } catch (_) {
            safeDecrementProgrammaticBack();
          }
        }
      }
      isPushedRef.current = false;
      return;
    }

    // Element is active:
    // 1. Remove any existing entry with the same id to prevent duplicate stacks
    const existingIdx = backStack.findIndex((e) => e.id === id);
    if (existingIdx !== -1) {
      backStack.splice(existingIdx, 1);
    }

    // 2. Push history state if required and not already pushed
    if (pushHistory && !isPushedRef.current && typeof window !== 'undefined') {
      try {
        window.history.pushState({ _backId: id }, '');
        isPushedRef.current = true;
      } catch (_) {}
    }

    // 3. Register in backStack
    const entry: BackEntry = {
      id,
      priority,
      onBack: () => onBackRef.current(),
      pushHistory,
      poppedByHistory: false,
      timestamp: Date.now()
    };
    backStack.push(entry);
    sortBackStack();

    return () => {
      // Cleanup on unmount or when isActive changes to false
      const curIdx = backStack.findIndex((e) => e.id === id);
      if (curIdx !== -1) {
        const item = backStack[curIdx];
        backStack.splice(curIdx, 1);
        if (item.pushHistory && !item.poppedByHistory && isPushedRef.current) {
          recordProgrammaticBack();
          try {
            window.history.back();
          } catch (_) {
            safeDecrementProgrammaticBack();
          }
        }
      }
      isPushedRef.current = false;
    };
  }, [isActive, id, priority, pushHistory]);
}

/**
 * Hook to link a modal dialog with browser/device back navigation.
 */
export function useBackModal(
  isOpen: boolean,
  onClose: () => void,
  modalId: string = 'modal',
  priority: number = 50
): void {
  useBackAction(isOpen, onClose, {
    id: modalId,
    priority,
    pushHistory: true
  });
}

/**
 * Hook for in-page collapsible decks/drawers (like Filters, Columns)
 */
export function useInPageDeckBack(
  isOpen: boolean,
  onClose: () => void,
  deckId: string = 'inpage-deck',
  priority: number = 20
): void {
  useBackAction(isOpen, onClose, {
    id: deckId,
    priority,
    pushHistory: true
  });
}

/**
 * Hook for interactive action cards (e.g. row action card, drill-down options card)
 */
export function useBackCard(
  isOpen: boolean,
  onClose: () => void,
  cardId: string = 'action-card',
  priority: number = 35
): void {
  useBackAction(isOpen, onClose, {
    id: cardId,
    priority,
    pushHistory: true
  });
}

export function registerInPageBackHandler(handler: BackHandler | null): () => void {
  if (!handler) return () => {};
  const id = `inpage-${Date.now()}`;
  const entry: BackEntry = {
    id,
    priority: 20,
    onBack: handler,
    pushHistory: false,
    poppedByHistory: false,
    timestamp: Date.now()
  };
  backStack.push(entry);
  sortBackStack();
  return () => {
    const idx = backStack.findIndex((e) => e.id === id);
    if (idx !== -1) backStack.splice(idx, 1);
  };
}

export function setGlobalTabBackHandler(handler: BackHandler | null): void {
  initGlobalBackListeners();
  globalTabBackHandler = handler;
}

export function setGlobalExitHandler(handler: VoidHandler | null): void {
  initGlobalBackListeners();
  globalExitHandler = handler;
}

export function pushNavigationState(tab: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (window.history.state && window.history.state.tab === tab) {
      return;
    }
    window.history.pushState({ tab }, '');
  } catch (_) {}
}

export function exitApp(): void {
  try {
    // 1. Android Native WebView interface
    if ((window as any).Android && typeof (window as any).Android.closeApp === 'function') {
      (window as any).Android.closeApp();
      return;
    }
    // 2. Cordova / Capacitor
    if ((navigator as any).app && typeof (navigator as any).app.exitApp === 'function') {
      (navigator as any).app.exitApp();
      return;
    }
    // 3. Window close
    window.close();
  } catch (_) {}
}
