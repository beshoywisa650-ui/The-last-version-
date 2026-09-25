import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Layers,
  MapPin,
  Building2,
  Navigation,
  User,
  Users,
  Store,
  Tag,
  Package,
  Hash,
  Check
} from 'lucide-react';
import { Language, ColumnClassification, SalesRow } from '../types';
import { useBodyScrollLock } from '../utils/scrollLock';
import { useBackModal } from '../utils/backNavigation';

interface AddFilterColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: string[];
  onSelectColumn?: (column: string) => void;
  onSelectColumns?: (columns: string[]) => void;
  lang: Language;
  dimensions?: ColumnClassification[];
  rows?: SalesRow[];
}

export const AddFilterColumnModal: React.FC<AddFilterColumnModalProps> = ({
  isOpen,
  onClose,
  availableColumns,
  onSelectColumn,
  onSelectColumns,
  lang,
  dimensions = [],
  rows = []
}) => {
  const isRtl = lang === 'ar';
  const [search, setSearch] = useState('');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);

  // Reset selection when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCols([]);
      setSearch('');
    }
  }, [isOpen]);

  useBodyScrollLock(isOpen);
  useBackModal(isOpen, onClose, 'add-filter-column-modal', 45);

  // Extract sample values for each column to give helpful visual context
  const samplesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    dimensions.forEach((d) => {
      if (d.sampleValues && d.sampleValues.length > 0) {
        map[d.name] = d.sampleValues.filter(Boolean).map(String).slice(0, 3);
      }
    });

    if (rows && rows.length > 0) {
      availableColumns.forEach((col) => {
        if (!map[col] || map[col].length === 0) {
          const samples = new Set<string>();
          for (const r of rows) {
            const val = r.raw?.[col] ?? (r as any)[col];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              samples.add(String(val).trim());
              if (samples.size >= 3) break;
            }
          }
          if (samples.size > 0) {
            map[col] = Array.from(samples);
          }
        }
      });
    }

    return map;
  }, [dimensions, rows, availableColumns]);

  // Helper icon detector based on column name with app theme colors
  const getColIcon = (colName: string, isSelected: boolean = false) => {
    const n = colName.toLowerCase();
    const iconClass = `w-4 h-4 transition-colors ${
      isSelected ? 'text-[#0A3D62]' : 'text-slate-600 group-hover:text-[#0A3D62]'
    }`;

    if (/منطق|محافظ|region|governorate|territory|zone/i.test(n)) {
      return <MapPin className={iconClass} />;
    }
    if (/فرع|branch|office|store/i.test(n)) {
      return <Store className={iconClass} />;
    }
    if (/عميل|صيدل|مستشف|طبيب|customer|pharmacy|client|doctor|hospital/i.test(n)) {
      return <Building2 className={iconClass} />;
    }
    if (/مندوب|مشرف|بائع|rep|supervisor|agent|seller|user/i.test(n)) {
      return <User className={iconClass} />;
    }
    if (/صنف|منتج|براند|item|product|brand|sku/i.test(n)) {
      return <Package className={iconClass} />;
    }
    if (/نوع|تصنيف|category|class|type/i.test(n)) {
      return <Tag className={iconClass} />;
    }
    return <Hash className={iconClass} />;
  };

  const filteredColumns = useMemo(() => {
    const seen = new Set<string>();
    const uniqueCols: string[] = [];
    availableColumns.forEach((c) => {
      const trimmed = c?.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        uniqueCols.push(trimmed);
      }
    });
    const q = search.trim().toLowerCase();
    if (!q) return uniqueCols;
    return uniqueCols.filter((col) => col.toLowerCase().includes(q));
  }, [availableColumns, search]);

  if (!isOpen) return null;

  const handleToggleCol = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleConfirm = () => {
    if (selectedCols.length === 0) return;
    if (onSelectColumns) {
      onSelectColumns(selectedCols);
    } else if (onSelectColumn) {
      selectedCols.forEach((c) => onSelectColumn(c));
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0A3D62]/10 text-[#0A3D62] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {isRtl ? 'إضافة أعمدة إلى الفلاتر' : 'Add Columns to Filters'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isRtl
                  ? `${availableColumns.length} عمود متاح للإضافة`
                  : `${availableColumns.length} available columns`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input & Quick Select Actions */}
        <div className="p-3 border-b border-slate-100 bg-white space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? 'ابحث عن اسم العمود...' : 'Search column name...'}
              className="w-full ps-9 pe-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0A3D62] focus:border-transparent bg-slate-50 focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Columns List with Multi-Select Checkboxes */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredColumns.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">
                {isRtl ? 'لا توجد أعمدة مطابقة للبحث' : 'No matching columns found'}
              </p>
            </div>
          ) : (
            filteredColumns.map((col, idx) => {
              const samples = samplesMap[col] || [];
              const isSelected = selectedCols.includes(col);

              return (
                <div
                  key={`modal-col-${col}-${idx}`}
                  onClick={() => handleToggleCol(col)}
                  className={`w-full text-start p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#EAF3F8] border-[#0A3D62]/40 text-[#0A3D62] shadow-2xs ring-1 ring-[#0A3D62]/20'
                      : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg transition-colors mt-0.5 ${
                      isSelected ? 'bg-[#0A3D62]/10 text-[#0A3D62]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {getColIcon(col, isSelected)}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-black block truncate ${
                        isSelected ? 'text-[#0A3D62]' : 'text-slate-800'
                      }`}>
                        {col}
                      </span>
                      {samples.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">
                          {samples.join(' • ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#0A3D62] text-white'
                      : 'border-2 border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Multi-Select Actions */}
        <div className="p-3 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={selectedCols.length === 0}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              selectedCols.length > 0
                ? 'bg-[#0A3D62] hover:bg-[#082F4D] text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {isRtl
                ? selectedCols.length > 0
                  ? `إضافة المحدد (${selectedCols.length})`
                  : 'حدد أعمدة للإضافة'
                : selectedCols.length > 0
                  ? `Add Selected (${selectedCols.length})`
                  : 'Select columns to add'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
