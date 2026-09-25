import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Language } from '../types';

interface OfflineIndicatorProps {
  lang: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showToast && isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 border ${
        isOnline
          ? 'bg-[#17212B] text-white border-slate-700/60'
          : 'bg-amber-600 text-white border-amber-500 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-sky-400" />
          <span>{lang === 'ar' ? 'تمت استعادة الاتصال' : 'Back online'}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'أنت في وضع عدم الاتصال - التطبيق يعمل 100% بدون إنترنت' : 'Offline mode - 100% functional offline'}</span>
        </>
      )}
    </div>
  );
};
