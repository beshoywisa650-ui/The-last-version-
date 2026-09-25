import React from 'react';
import { BarChart3, Globe, FileSpreadsheet } from 'lucide-react';
import { Language, LoadedFileMeta, NavTab } from '../types';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  fileMeta?: LoadedFileMeta | null;
  currentTab?: NavTab;
  canGoBack?: boolean;
  onBack?: () => void;
  isFilterWizardOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  fileMeta
}) => {
  return (
    <header
      dir="ltr"
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-3 sm:px-4 py-2.5 transition-colors"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-left">
        {/* Left Side: App Icon + App Name + Opened File Name (Always Left-to-Right) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#0A3D62] via-[#0D4B75] to-[#122B3D] text-white flex items-center justify-center shadow-xs shrink-0 ring-1 ring-black/5">
            <BarChart3 className="w-5 h-5 text-sky-300" />
          </div>

          <div className="min-w-0 text-left">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 truncate leading-tight">
              Sheet Analyzer
            </h1>

            {/* Opened File Name directly under App Name */}
            {fileMeta ? (
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-700 font-semibold truncate mt-0.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0A3D62] shrink-0" />
                <span
                  dir="auto"
                  className="truncate max-w-[180px] sm:max-w-xs md:max-w-md text-slate-900 font-bold"
                  title={fileMeta.fileName}
                >
                  {fileMeta.fileName}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                Universal Sheet & Data Analyzer
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Language Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4 text-[#0A3D62]" />
            <span className="uppercase tracking-wider font-black text-xs text-[#0A3D62]">
              {lang === 'ar' ? 'EN' : 'عربي'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
