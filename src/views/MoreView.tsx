import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Copy,
  Check,
  ShieldCheck,
  RotateCcw,
  Database
} from 'lucide-react';
import { Language } from '../types';
import { getRecentFilesMetaList } from '../utils/storage';

interface MoreViewProps {
  lang: Language;
  onToggleLang?: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  lang
}) => {
  const isRtl = lang === 'ar';
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const recentFilesCount = getRecentFilesMetaList().length;

  const phoneNumber = '01203730493';
  const whatsappPreFilledText = isRtl
    ? 'مرحباً د. بيشوي، أتواصل معك بخصوص تطبيق Sheet Analyzer، ولدي استفسار / استشارة بخصوص...'
    : 'Hello Dr. Beshoy, I am reaching out regarding Sheet Analyzer app...';
  const whatsappUrl = `https://wa.me/201203730493?text=${encodeURIComponent(whatsappPreFilledText)}`;

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleClearCache = () => {
    try {
      const keysToPreserve = ['lang'];
      const preserved: Record<string, string | null> = {};
      keysToPreserve.forEach((k) => {
        preserved[k] = localStorage.getItem(k);
      });
      localStorage.clear();
      keysToPreserve.forEach((k) => {
        if (preserved[k]) localStorage.setItem(k, preserved[k]!);
      });
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-3.5 sm:py-5 space-y-3 sm:space-y-3.5 pb-20 font-sans select-none">
      
      {/* 1. Developer Contact Card (First, Compact & Executive) */}
      <div className="bg-gradient-to-r from-[#0A3D62] to-[#0d4f7c] rounded-2xl p-3.5 sm:p-4.5 text-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Identity & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 font-black text-sm shrink-0">
              BW
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-wide text-white truncate">
                  {isRtl ? 'د. بيشوي ويصا كامل' : 'Dr. Beshoy Wisa Kamel'}
                </span>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded shrink-0">
                  {isRtl ? 'المطور' : 'Dev'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-sky-200 mt-0.5">
                <span dir="ltr" className="font-mono font-bold text-white">{phoneNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer text-sky-200 hover:text-white"
                  title={isRtl ? 'نسخ الرقم' : 'Copy'}
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-slate-950 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>واتساب</span>
            </a>

            {/* Direct Call Button */}
            <a
              href={`tel:${phoneNumber}`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs border border-white/20 shadow-2xs transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-amber-300" />
              <span>اتصال</span>
            </a>
          </div>

        </div>
      </div>

      {/* 2. Storage & Temporary Cache Card (Second) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">
              {isRtl ? 'الذاكرة المؤقتة' : 'Temporary Cache'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {recentFilesCount} {isRtl ? 'ملف محفوظ' : 'files stored'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearCache}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          {cacheCleared ? (
            <span className="text-emerald-700 flex items-center gap-1 font-bold">
              <Check className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تم التنظيف' : 'Cleared'}</span>
            </span>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>{isRtl ? 'تنظيف' : 'Clear'}</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Privacy & Offline Guarantee Footer Badge */}
      <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between gap-2 text-slate-500 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isRtl
              ? 'البيانات محلية 100% داخل جهازك وتعمل بأقصى سرية بدون إنترنت'
              : '100% Client-side. Private & Offline safe'}
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400 shrink-0">
          v1.0 Pro
        </span>
      </div>

    </div>
  );
};
