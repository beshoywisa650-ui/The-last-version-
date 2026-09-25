import React from 'react';
import { Home, BarChart3, MoreHorizontal } from 'lucide-react';
import { Language, NavTab } from '../types';
import { getTranslation } from '../utils/translations';

export type { NavTab };

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: Language;
  hasFile: boolean;
  onDisabledTabClick?: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  lang,
  hasFile,
  onDisabledTabClick
}) => {
  const t = getTranslation(lang);

  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }> = [
    {
      id: 'home',
      label: t.home || 'Home',
      icon: <Home className="w-5 h-5" />
    },
    {
      id: 'analyze',
      label: t.analyze || 'Analyze',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: hasFile
    },
    {
      id: 'more',
      label: t.more || 'More',
      icon: <MoreHorizontal className="w-5 h-5" />
    }
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const isDisabled = tab.id === 'analyze' && !hasFile;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  onDisabledTabClick?.(tab.id);
                  return;
                }
                onSelectTab(tab.id);
              }}
              aria-disabled={isDisabled}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all relative select-none ${
                isDisabled
                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                  : isActive
                  ? 'text-[#0A3D62] font-black cursor-pointer'
                  : 'text-slate-500 hover:text-slate-800 font-semibold cursor-pointer active:scale-95'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    !isDisabled && isActive
                      ? 'bg-[#EBF3FA] text-[#0A3D62] scale-105 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  {tab.icon}
                </div>
                {!isDisabled && tab.badge && (
                  <span className="absolute 0 top-0.5 end-0.5 w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-white" />
                )}
              </div>
              <span className={`text-xs mt-1 leading-none tracking-tight transition-colors ${
                isActive ? 'font-black text-[#0A3D62]' : 'font-semibold text-slate-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
