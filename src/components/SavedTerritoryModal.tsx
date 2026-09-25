import React, { useState } from 'react';
import { X, MapPin, Check, Bookmark, ArrowRight, ArrowLeft } from 'lucide-react';
import { Language, SavedTerritory, TerritoryFilter } from '../types';
import { useBodyScrollLock } from '../utils/scrollLock';
import { useBackModal } from '../utils/backNavigation';

interface SavedTerritoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: TerritoryFilter;
  savedTerritory: SavedTerritory | null;
  onSave: (name: string) => void;
  onApply: () => void;
  lang: Language;
}

export const SavedTerritoryModal: React.FC<SavedTerritoryModalProps> = ({
  isOpen,
  onClose,
  currentFilter,
  savedTerritory,
  onSave,
  onApply,
  lang
}) => {
  const isRtl = lang === 'ar';
  const [territoryName, setTerritoryName] = useState(savedTerritory?.name || '');

  useBodyScrollLock(isOpen);
  useBackModal(isOpen, onClose, 'saved-territory-modal', 30);

  if (!isOpen) return null;

  const hasCurrentFilters =
    (currentFilter.regions?.length || 0) > 0 ||
    (currentFilter.branches?.length || 0) > 0 ||
    (currentFilter.addresses?.length || 0) > 0 ||
    (currentFilter.bricks?.length || 0) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!territoryName.trim()) return;
    onSave(territoryName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#D9E1E8] flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D9E1E8] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-[#0A3D62]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#17212B]">
                {isRtl ? 'منطقتي المحفوظة (My Territory)' : 'My Saved Territory'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl ? 'تثبيت فلاتر الفروع والمناطق بضغطة واحدة' : 'Pin your territory filters for 1-click access'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Saved Territory Info */}
          {savedTerritory && (
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sky-900 uppercase">
                  {isRtl ? 'المنطقة المحفوظة حالياً' : 'Current Saved Territory'}
                </span>
                <span className="text-[10px] font-mono text-sky-700">
                  {new Date(savedTerritory.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 className="text-sm font-black text-[#0A3D62]">{savedTerritory.name}</h4>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                {savedTerritory.regions?.length > 0 && (
                  <p>
                    <span className="font-semibold text-slate-700">{isRtl ? 'المناطق:' : 'Regions:'}</span>{' '}
                    {savedTerritory.regions.join(', ')}
                  </p>
                )}
                {savedTerritory.branches?.length > 0 && (
                  <p>
                    <span className="font-semibold text-slate-700">{isRtl ? 'الفروع:' : 'Branches:'}</span>{' '}
                    {savedTerritory.branches.join(', ')}
                  </p>
                )}
                {savedTerritory.bricks?.length > 0 && (
                  <p>
                    <span className="font-semibold text-slate-700">{isRtl ? 'المربعات:' : 'Bricks:'}</span>{' '}
                    {savedTerritory.bricks.join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onApply}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-[#0A3D62] text-white text-xs font-bold hover:bg-[#082d49] transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{isRtl ? 'تطبيق هذه الفلاتر الآن' : 'Apply These Filters Now'}</span>
              </button>
            </div>
          )}

          {/* Form to Save Current Filters */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700">
              {isRtl ? 'حفظ الفلاتر النشطة الحالية باسم جديد:' : 'Save currently active filters:'}
            </label>
            <input
              type="text"
              value={territoryName}
              onChange={(e) => setTerritoryName(e.target.value)}
              placeholder={isRtl ? 'مثال: فرع الفيوم + بني سويف' : 'e.g. Heliopolis & Nasr City'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9E1E8] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent"
              required
            />

            {!hasCurrentFilters && (
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                {isRtl
                  ? 'ملاحظة: لا توجد فلاتر جغرافية محددة حالياً، سيتم حفظ تحديد "الكل".'
                  : 'Notice: No geographic filters are currently selected; "All" will be saved.'}
              </p>
            )}

            <button
              type="submit"
              disabled={!territoryName.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#17212B] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Bookmark className="w-4 h-4 text-sky-400" />
              <span>{isRtl ? 'حفظ كمنطقتي المفضلة' : 'Save As My Territory'}</span>
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#D9E1E8] bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
