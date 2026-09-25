import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Language,
  MetricType,
  ColumnClassification,
  SavedSheetPreset,
  SheetMode,
  PercentageMode,
  SalesRow
} from '../types';
import {
  Percent,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
  Box,
  Layers,
  Zap,
  ListFilter,
  MapPin,
  Building2,
  Store,
  User,
  Users,
  Package,
  Tag,
  Columns,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useBackModal } from '../utils/backNavigation';

export interface AnalysisSettingsViewProps {
  availableColumns: string[];
  dimensions?: ColumnClassification[];
  metrics?: ColumnClassification[];
  recommendedDimensions?: string[];
  detectedQtyCol?: string;
  detectedValueCol?: string;
  detectedTargetCol?: string;
  initialSelectedColumns: string[];
  initialMetric: MetricType;
  initialPrimaryMetricCol?: string;
  initialSecondaryMetricCol?: string;
  initialEnableTarget?: boolean;
  initialSheetType?: SheetMode;
  initialShowPercentage?: boolean;
  initialPercentageMode?: PercentageMode;
  initialPercentageNumeratorCol?: string;
  initialPercentageDenominatorCol?: string;
  initialShowKpiCards?: boolean;
  initialTableColumns?: string[];
  matchedPreset?: SavedSheetPreset | null;
  rows?: SalesRow[];
  onApply: (
    selectedColumns: string[],
    chosenMetric: MetricType,
    enableTarget: boolean,
    saveAsPreset: boolean,
    presetName?: string,
    primaryMetricCol?: string,
    secondaryMetricCol?: string,
    sheetType?: SheetMode,
    showPercentage?: boolean,
    showKpiCards?: boolean,
    percentageMode?: PercentageMode,
    percentageNumeratorCol?: string,
    percentageDenominatorCol?: string,
    tableColumns?: string[]
  ) => void;
  onCancel: () => void;
  lang: Language;
  isEmbedded?: boolean;
  onConfigChange?: (config: AnalysisSettingsConfig) => void;
}

export interface AnalysisSettingsConfig {
  selectedColumns: string[];
  chosenMetric: MetricType;
  enableTarget: boolean;
  saveAsPreset: boolean;
  presetName?: string;
  primaryMetricCol?: string;
  secondaryMetricCol?: string;
  sheetType?: SheetMode;
  showPercentage?: boolean;
  percentageMode?: PercentageMode;
  percentageNumeratorCol?: string;
  percentageDenominatorCol?: string;
  showKpiCards?: boolean;
  tableColumns?: string[];
}

export const AnalysisSettingsView: React.FC<AnalysisSettingsViewProps> = ({
  availableColumns,
  dimensions = [],
  metrics = [],
  recommendedDimensions = [],
  detectedQtyCol,
  detectedValueCol,
  detectedTargetCol,
  initialSelectedColumns,
  initialMetric,
  initialPrimaryMetricCol,
  initialSecondaryMetricCol,
  initialEnableTarget = false,
  initialSheetType,
  initialShowPercentage,
  initialPercentageMode,
  initialPercentageNumeratorCol,
  initialPercentageDenominatorCol,
  initialShowKpiCards,
  initialTableColumns,
  matchedPreset,
  rows = [],
  onApply,
  onCancel,
  lang,
  isEmbedded = false,
  onConfigChange
}) => {
  const isRtl = lang === 'ar';

  // Quick memoized map of sample values for every available column
  const columnSampleValues = useMemo(() => {
    const map: Record<string, string[]> = {};

    // 1. Populate from dimensions analysis if available
    dimensions.forEach((dim) => {
      if (dim.sampleValues && dim.sampleValues.length > 0) {
        map[dim.name] = dim.sampleValues.filter(Boolean).map(String).slice(0, 3);
      }
    });

    // 2. For any columns missing samples, extract from first 50 rows
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

  // Helper to get semantic icon for dimension with a unified, professional app palette
  const getDimensionIcon = (colName: string, isSelected?: boolean) => {
    const norm = colName.toLowerCase();
    const colorClass = isSelected ? 'text-[#0A3D62]' : 'text-slate-500 group-hover:text-[#0A3D62] transition-colors';
    if (/reg|منطقة|محافظة|اقليم/i.test(norm)) return <MapPin className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/branch|فرع/i.test(norm)) return <Building2 className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/cust|pharm|صيدلية|عميل|مستشفى/i.test(norm)) return <Store className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/rep|مندوب|ممثل/i.test(norm)) return <User className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/sup|مشرف|خط/i.test(norm)) return <Users className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/prod|منتج|مستحضر/i.test(norm)) return <Package className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/item|brand|صنف|براند|عبوة/i.test(norm)) return <Tag className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    return <Layers className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
  };

  // Hook back navigation to exit settings safely (only if not embedded)
  useBackModal(!isEmbedded, onCancel, 'analysis-settings-view', 30);

  // 1. Sheet Type: 'sales' vs 'general'
  const [sheetType, setSheetType] = useState<SheetMode>(() => {
    if (initialSheetType) return initialSheetType;
    if (matchedPreset?.sheetType) return matchedPreset.sheetType;
    return 'sales';
  });

  // Candidate numeric columns
  const numericCandidateCols = useMemo(() => {
    const list: string[] = [];
    if (metrics.length > 0) {
      metrics.forEach((m) => {
        if (!list.includes(m.name)) list.push(m.name);
      });
    }
    if (detectedQtyCol && !list.includes(detectedQtyCol)) list.push(detectedQtyCol);
    if (detectedValueCol && !list.includes(detectedValueCol)) list.push(detectedValueCol);
    if (detectedTargetCol && !list.includes(detectedTargetCol)) list.push(detectedTargetCol);

    if (list.length === 0) {
      availableColumns.forEach((c) => {
        if (/qty|val|amount|total|صافي|مبلغ|قيمة|كمية|سعر|مرتب|درجة|رصيد/i.test(c)) {
          if (!list.includes(c)) list.push(c);
        }
      });
    }
    return list;
  }, [metrics, detectedQtyCol, detectedValueCol, detectedTargetCol, availableColumns]);

  // Accordion 1: KPI Cards Switch (خاص بكروت المقاييس العلوية فقط)
  const [showKpiCards, setShowKpiCards] = useState<boolean>(() => {
    if (initialSheetType === 'general') return false;
    if (initialShowKpiCards !== undefined) return initialShowKpiCards;
    if (matchedPreset?.showKpiCards !== undefined) return matchedPreset.showKpiCards;
    return true;
  });
  const [isQtyValueOpen, setIsQtyValueOpen] = useState<boolean>(false);

  const [primaryMetricCol, setPrimaryMetricCol] = useState<string>(() => {
    if (initialPrimaryMetricCol !== undefined && initialPrimaryMetricCol.trim().length > 0) return initialPrimaryMetricCol;
    return detectedQtyCol || numericCandidateCols[0] || '';
  });
  const [secondaryMetricCol, setSecondaryMetricCol] = useState<string>(() => {
    if (initialSecondaryMetricCol !== undefined && initialSecondaryMetricCol.trim().length > 0) return initialSecondaryMetricCol;
    return (
      detectedValueCol ||
      (numericCandidateCols.length > 1 ? numericCandidateCols[1] : '')
    );
  });

  // Accordion 2: Target Comparison
  const [enableTarget, setEnableTarget] = useState<boolean>(() => {
    if (typeof initialEnableTarget === 'boolean') return initialEnableTarget;
    return Boolean(detectedTargetCol);
  });
  const [isTargetOpen, setIsTargetOpen] = useState<boolean>(false);
  const [targetCol, setTargetCol] = useState<string>(() => {
    return detectedTargetCol || (numericCandidateCols.length > 2 ? numericCandidateCols[2] : '');
  });

  // Accordion 3: Percentage Share
  const [showPercentage, setShowPercentage] = useState<boolean>(() => {
    if (typeof initialShowPercentage === 'boolean') return initialShowPercentage;
    if (typeof matchedPreset?.showPercentage === 'boolean') return matchedPreset.showPercentage;
    return true;
  });
  const [isPercentageOpen, setIsPercentageOpen] = useState<boolean>(false);
  const [percentageMode, setPercentageMode] = useState<PercentageMode>(() => {
    if (initialPercentageMode) return initialPercentageMode;
    if (matchedPreset?.percentageMode) return matchedPreset.percentageMode;
    return 'total_share';
  });
  const [percentageNumeratorCol, setPercentageNumeratorCol] = useState<string>(() => {
    if (initialPercentageNumeratorCol) return initialPercentageNumeratorCol;
    if (matchedPreset?.percentageNumeratorCol) return matchedPreset.percentageNumeratorCol;
    return primaryMetricCol || numericCandidateCols[0] || availableColumns[0] || '';
  });
  const [percentageDenominatorCol, setPercentageDenominatorCol] = useState<string>(() => {
    if (initialPercentageDenominatorCol) return initialPercentageDenominatorCol;
    if (matchedPreset?.percentageDenominatorCol) return matchedPreset.percentageDenominatorCol;
    return secondaryMetricCol || targetCol || (numericCandidateCols.length > 1 ? numericCandidateCols[1] : availableColumns[1]) || '';
  });

  // Filter Columns (Dynamic from uploaded sheet)
  const [selectedFilterCols, setSelectedFilterCols] = useState<string[]>(() => {
    if (initialSelectedColumns.length > 0) return initialSelectedColumns;
    if (recommendedDimensions.length > 0) return recommendedDimensions;
    return availableColumns.slice(0, 5);
  });

  // Candidate dimension columns (for table columns and grouping)
  const candidateDimensionCols = useMemo(() => {
    const metricCols = new Set(
      [
        primaryMetricCol,
        secondaryMetricCol,
        detectedQtyCol,
        detectedValueCol,
        detectedTargetCol,
        ...numericCandidateCols
      ].filter(Boolean)
    );
    const nonMetric = availableColumns.filter((c) => !metricCols.has(c));
    return nonMetric.length > 0 ? nonMetric : availableColumns;
  }, [
    availableColumns,
    primaryMetricCol,
    secondaryMetricCol,
    detectedQtyCol,
    detectedValueCol,
    detectedTargetCol,
    numericCandidateCols
  ]);

  // Grouping Columns state (العمود الرئيسي، عمود ٢، عمود ۳...)
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    if (initialTableColumns && initialTableColumns.length > 0) {
      return initialTableColumns;
    }
    if (recommendedDimensions && recommendedDimensions.length > 0) {
      const validRec = recommendedDimensions.find((c) => candidateDimensionCols.includes(c));
      if (validRec) return [validRec];
    }
    if (initialSelectedColumns && initialSelectedColumns.length > 0) {
      const validInit = initialSelectedColumns.find((c) => candidateDimensionCols.includes(c));
      if (validInit) return [validInit];
    }
    if (candidateDimensionCols.length > 0) {
      return [candidateDimensionCols[0]];
    }
    return availableColumns.length > 0 ? [availableColumns[0]] : [];
  });

  const [openAddDropdown, setOpenAddDropdown] = useState<boolean>(false);

  const handleSwitchTableColumn = (index: number, newCol: string) => {
    setTableColumns((prev) => {
      const next = [...prev];
      next[index] = newCol;
      return next;
    });
  };

  const handleRemoveTableColumn = (index: number) => {
    setTableColumns((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : prev;
    });
  };

  const handleAddTableColumn = (newCol: string) => {
    if (!newCol || tableColumns.includes(newCol)) return;
    setTableColumns((prev) => [...prev, newCol]);
  };

  const availableToAddColumns = useMemo(() => {
    return candidateDimensionCols.filter((col) => !tableColumns.includes(col));
  }, [candidateDimensionCols, tableColumns]);

  // Quick Action Buttons for Filters
  const handleSelectRecommendedOnly = () => {
    if (recommendedDimensions.length > 0) {
      setSelectedFilterCols(recommendedDimensions);
    } else {
      setSelectedFilterCols(availableColumns.slice(0, 5));
    }
  };

  const handleSelectAll = () => {
    setSelectedFilterCols([...availableColumns]);
  };

  const handleDeselectAll = () => {
    setSelectedFilterCols([]);
  };

  const toggleFilterCol = (colName: string) => {
    setSelectedFilterCols((prev) => {
      if (prev.includes(colName)) {
        return prev.filter((c) => c !== colName);
      } else {
        return [...prev, colName];
      }
    });
  };

  // On Apply and return to analysis
  const handleApply = () => {
    const finalCols = selectedFilterCols.length > 0 ? selectedFilterCols : (availableColumns.slice(0, 4) || []);

    let finalPrimary = '';
    let finalSecondary: string | undefined = undefined;
    let finalMetric: MetricType = initialMetric || 'qty';

    if (sheetType === 'sales') {
      finalMetric = initialMetric || 'qty';
      finalPrimary = primaryMetricCol || detectedQtyCol || numericCandidateCols[0] || '';
      finalSecondary = secondaryMetricCol || detectedValueCol || (numericCandidateCols.length > 1 ? numericCandidateCols[1] : undefined);
    } else {
      // General sheet
      finalPrimary = '';
      finalSecondary = undefined;
      finalMetric = 'qty';
    }

    onApply(
      finalCols,
      finalMetric,
      sheetType === 'sales' ? enableTarget : false,
      true,
      matchedPreset?.name || (sheetType === 'sales' ? 'شيت مبيعات' : 'شيت بيانات عامة'),
      finalPrimary,
      finalSecondary,
      sheetType,
      showPercentage,
      sheetType === 'sales' ? showKpiCards : false,
      percentageMode,
      percentageNumeratorCol,
      percentageDenominatorCol,
      tableColumns
    );
  };

  // Real-time synchronization of working configuration for auto-save
  const currentWorkingConfig = useMemo<AnalysisSettingsConfig>(() => {
    const finalCols = selectedFilterCols.length > 0 ? selectedFilterCols : (availableColumns.slice(0, 4) || []);

    let finalPrimary = '';
    let finalSecondary: string | undefined = undefined;
    let finalMetric: MetricType = initialMetric || 'qty';

    if (sheetType === 'sales') {
      finalMetric = initialMetric || 'qty';
      finalPrimary = primaryMetricCol || detectedQtyCol || numericCandidateCols[0] || '';
      finalSecondary = secondaryMetricCol || detectedValueCol || (numericCandidateCols.length > 1 ? numericCandidateCols[1] : undefined);
    } else {
      finalPrimary = '';
      finalSecondary = undefined;
      finalMetric = 'qty';
    }

    return {
      selectedColumns: finalCols,
      chosenMetric: finalMetric,
      enableTarget: sheetType === 'sales' ? enableTarget : false,
      saveAsPreset: false,
      primaryMetricCol: finalPrimary,
      secondaryMetricCol: finalSecondary,
      sheetType,
      showPercentage,
      percentageMode,
      percentageNumeratorCol,
      percentageDenominatorCol,
      showKpiCards: sheetType === 'sales' ? showKpiCards : false,
      tableColumns
    };
  }, [
    selectedFilterCols,
    availableColumns,
    initialMetric,
    sheetType,
    primaryMetricCol,
    detectedQtyCol,
    numericCandidateCols,
    secondaryMetricCol,
    detectedValueCol,
    enableTarget,
    showPercentage,
    percentageMode,
    percentageNumeratorCol,
    percentageDenominatorCol,
    showKpiCards,
    tableColumns
  ]);

  // Report changes upward whenever any setting changes
  const prevConfigJsonRef = useRef<string>('');
  useEffect(() => {
    if (onConfigChange) {
      const serialized = JSON.stringify(currentWorkingConfig);
      if (prevConfigJsonRef.current !== serialized) {
        prevConfigJsonRef.current = serialized;
        onConfigChange(currentWorkingConfig);
      }
    }
  }, [currentWorkingConfig, onConfigChange]);

  return (
    <div
      className={
        isEmbedded
          ? "w-full bg-[#F8FAFC]/50 text-slate-800 flex flex-col antialiased selection:bg-[#EAF3F8] selection:text-[#0A3D62]"
          : "min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col antialiased selection:bg-[#EAF3F8] selection:text-[#0A3D62]"
      }
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Scrollable Container */}
      <div className={isEmbedded ? "w-full p-2.5 sm:p-3.5 space-y-3.5" : "w-full max-w-2xl mx-auto py-3 sm:py-4 space-y-3.5 pb-8"}>
        {/* PAGE TITLE: يظهر فقط عند الفتح في صفحة كاملة منفصلة */}
        {!isEmbedded && (
          <div className="pt-1 pb-1 px-1 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {isRtl ? 'إعدادات وتخصيص الشيت' : 'Sheet Setup & Analysis'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isRtl ? 'حدد الأعمدة والفلاتر والإعدادات للبدء في التحليل فوراً' : 'Configure columns, filters, and settings to start analyzing'}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 bg-white transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              title={isRtl ? 'رجوع للتحليل' : 'Return to analysis'}
            >
              {isRtl ? <ArrowRight className="w-3.5 h-3.5 text-[#0A3D62]" /> : <ArrowLeft className="w-3.5 h-3.5 text-[#0A3D62]" />}
              <span>{isRtl ? 'رجوع' : 'Back'}</span>
            </button>
          </div>
        )}

        {/* 1️⃣ CARD 1: COLUMNS (الأعمدة وتقسيم الجدول) - تظهر في صفحة الإعدادات الأولية */}
        {!isEmbedded && (
          <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A3D62] text-white text-xs font-black flex items-center justify-center">
                  {tableColumns.length}
                </span>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Columns className="w-4 h-4 text-[#0A3D62] shrink-0" />
                  <span>{isRtl ? 'الأعمدة وتقسيم الجدول' : 'Table Columns & Grouping'}</span>
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {/* Primary & Secondary Columns: سطر واحد مشترك مقسوم بين الرئيسي وعمود ٢ */}
              <div className="w-full p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50/60 shadow-2xs grid grid-cols-2 gap-2 sm:gap-2.5 items-center">
                {/* المستطيل الأيمن: الرئيسي */}
                <div className="relative min-w-0">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block text-start truncate">
                    {isRtl ? 'العمود الرئيسي (أساس الجدول)' : 'Primary Column'}
                  </label>
                  <div className="relative">
                    <select
                      value={tableColumns[0] || ''}
                      onChange={(e) => handleSwitchTableColumn(0, e.target.value)}
                      className="w-full bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-bold py-1.5 sm:py-2 px-2.5 sm:px-3 pe-8 rounded-lg border border-slate-300 transition-all cursor-pointer truncate appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#0A3D62]"
                      title={isRtl ? 'العمود الرئيسي' : 'Primary Column'}
                    >
                      {!tableColumns[0] && (
                        <option value="" disabled>
                          {isRtl ? 'اختر العمود الرئيسي' : 'Select Primary Column'}
                        </option>
                      )}
                      {candidateDimensionCols
                        .filter((c) => c === tableColumns[0] || !tableColumns.includes(c))
                        .map((candidate, idx) => (
                          <option key={`c1-${candidate}-${idx}`} value={candidate}>
                            {candidate}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* المستطيل الأيسر: عمود ٢ مع إمكانية إلغائه بسهولة */}
                <div className="relative min-w-0">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block text-start truncate">
                    {isRtl ? 'عمود ٢ (تقسيم فرعي اختياري)' : 'Sub-Column 2'}
                  </label>
                  <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <select
                        value={tableColumns[1] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            if (tableColumns.length >= 2) {
                              handleRemoveTableColumn(1);
                            }
                            return;
                          }
                          if (tableColumns.length >= 2) {
                            handleSwitchTableColumn(1, val);
                          } else {
                            handleAddTableColumn(val);
                          }
                        }}
                        className="w-full bg-white hover:bg-slate-50 text-slate-900 text-xs sm:text-sm font-bold py-1.5 sm:py-2 px-2.5 sm:px-3 pe-8 rounded-lg border border-slate-300 transition-all cursor-pointer truncate appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#0A3D62]"
                      >
                        <option value="">
                          {isRtl ? '(بدون عمود إضافي)' : '(None - Single Row)'}
                        </option>
                        {candidateDimensionCols
                          .filter((c) => c === tableColumns[1] || !tableColumns.includes(c))
                          .map((candidate, idx) => (
                            <option key={`c2-${candidate}-${idx}`} value={candidate}>
                              {candidate}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2.5 pointer-events-none" />
                    </div>
                    {tableColumns.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTableColumn(1)}
                        className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-90 shrink-0"
                        title={isRtl ? 'إلغاء عمود ٢' : 'Remove Column 2'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Columns (عمود ۳، عمود ٤، عمود ٥) */}
              {tableColumns.length > 2 && (
                <div className="space-y-2">
                  {tableColumns.slice(2).map((colName, sliceIdx) => {
                    const actualIndex = sliceIdx + 2;
                    const colNumber = actualIndex + 1;
                    const candidatesForThisSlot = candidateDimensionCols.filter(
                      (c) => c === colName || !tableColumns.includes(c)
                    );

                    return (
                      <div
                        key={`sub-col-row-${colName}-${actualIndex}`}
                        className="w-full p-2.5 sm:px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-[#F8FAFC] shadow-2xs flex items-center justify-between gap-2.5 transition-all"
                      >
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                          <span className="text-xs font-black px-2.5 py-1.5 rounded-lg shrink-0 bg-slate-100 text-slate-700 whitespace-nowrap">
                            {isRtl ? `عمود ${colNumber}` : `Column ${colNumber}`}
                          </span>

                          <div className="relative min-w-0 flex-1">
                            <select
                              value={colName}
                              onChange={(e) => handleSwitchTableColumn(actualIndex, e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-bold py-1.5 sm:py-2 px-2.5 sm:px-3 pe-8 rounded-lg border border-slate-300 transition-all cursor-pointer truncate appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#0A3D62]"
                            >
                              {candidatesForThisSlot.map((candidate, idx) => (
                                <option key={`cN-${candidate}-${actualIndex}-${idx}`} value={candidate}>
                                  {candidate}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 end-2.5 pointer-events-none" />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTableColumn(actualIndex)}
                          className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-90 shrink-0"
                          title={isRtl ? `حذف عمود ${colNumber}` : `Remove Column ${colNumber}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Column Button */}
              {availableToAddColumns.length > 0 && tableColumns.length < 5 && (
                <div className="pt-0.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenAddDropdown(!openAddDropdown)}
                      className="w-full py-2 px-4 rounded-xl border border-dashed border-[#0A3D62]/40 hover:border-[#0A3D62] bg-[#EAF3F8]/60 hover:bg-[#EAF3F8] text-[#0A3D62] font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {isRtl
                          ? `إضافة عمود تقسيم إضافي (${tableColumns.length + 1})`
                          : `Add Sub-Column (${tableColumns.length + 1})`}
                      </span>
                    </button>

                    {openAddDropdown && (
                      <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 max-h-56 overflow-y-auto space-y-1 animate-fadeIn">
                        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {isRtl ? 'اختر العمود المراد إضافته:' : 'Select column to add:'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {availableToAddColumns.map((col, idx) => (
                            <button
                              key={`add-col-${col}-${idx}`}
                              type="button"
                              onClick={() => {
                                handleAddTableColumn(col);
                                setOpenAddDropdown(false);
                              }}
                              className="text-start p-2 rounded-lg hover:bg-sky-50 text-xs font-bold text-slate-800 flex items-center justify-between gap-2 cursor-pointer border border-transparent hover:border-sky-200 transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {getDimensionIcon(col)}
                                <span className="truncate">{col}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 2️⃣ CARD 2: FILTER DIMENSIONS (الفلاتر) - شبكة ثنائية أنيقة ومضغوطة */}
        {!isEmbedded && (
          <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0A3D62] text-white text-xs font-black flex items-center justify-center">
                  {selectedFilterCols.length}
                </span>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-[#0A3D62] shrink-0" />
                  <span>{isRtl ? 'أعمدة الفلاتر السريعة' : 'Filter Columns'}</span>
                </h2>
              </div>

              {/* Action Buttons: [الفلتر الذكي ✨] [الكل] [تفريغ] */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectRecommendedOnly}
                  className="text-[11px] font-bold text-[#0A3D62] bg-[#EAF3F8] hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#0A3D62]/10"
                >
                  {isRtl ? 'الفلتر الذكي ✨' : 'Smart Filter ✨'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-white bg-[#0A3D62] hover:bg-[#082f4d] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isRtl ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isRtl ? 'تفريغ' : 'Clear'}
                </button>
              </div>
            </div>

            {/* كروت الفلاتر بحجم منسق ومضغوط بشبكة ثنائية أنيقة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {availableColumns.map((colName, idx) => {
                const isSelected = selectedFilterCols.includes(colName);

                return (
                  <div
                    key={`filter-setting-${colName}-${idx}`}
                    onClick={() => toggleFilterCol(colName)}
                    className={`p-2.5 px-3 rounded-xl border text-start transition-all flex items-center justify-between gap-2 cursor-pointer select-none group shadow-2xs ${
                      isSelected
                        ? "bg-[#EAF3F8] border-[#0A3D62]/40 text-[#0A3D62] ring-1 ring-[#0A3D62]/20"
                        : "bg-white hover:bg-[#F8FAFC] border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#0A3D62]/10 text-[#0A3D62]"
                            : "bg-slate-100 text-[#0A3D62]/80 group-hover:bg-slate-200/70"
                        }`}
                      >
                        {getDimensionIcon(colName, isSelected)}
                      </div>

                      <span
                        className={`text-xs font-black truncate block transition-colors ${
                          isSelected ? "text-[#0A3D62]" : "text-slate-800 group-hover:text-[#0A3D62]"
                        }`}
                        title={colName}
                      >
                        {colName}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#0A3D62] text-white shadow-xs"
                          : "border border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3️⃣ CARD 3: GENERAL SETTINGS & METRICS (الإعدادات والمؤشرات العامة) */}
        {sheetType === 'sales' && (
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700 shrink-0" />
              <h2 className="text-sm font-black text-slate-900">
                {isRtl ? 'الإعدادات والمؤشرات العامة' : 'General Settings & Indicators'}
              </h2>
            </div>

            <div className="space-y-2.5">
              {/* 1. Top Metric Cards Switch (كروت الملخص الإجمالي) */}
              <div className="border border-slate-200/90 rounded-xl overflow-hidden transition-all bg-white">
                <div className="p-3 flex items-center justify-between gap-2">
                  {/* Switch button on the Left */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showKpiCards}
                    onClick={() => {
                      const next = !showKpiCards;
                      setShowKpiCards(next);
                      if (!next) {
                        setIsQtyValueOpen(false);
                      }
                    }}
                    className={`order-2 w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-hidden shrink-0 ${
                      showKpiCards ? 'bg-[#0A3D62]' : 'bg-slate-300'
                    }`}
                    title={showKpiCards ? (isRtl ? 'مفعّل' : 'Enabled') : (isRtl ? 'مغلق' : 'Disabled')}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform absolute top-0.5 ${
                        showKpiCards
                          ? isRtl
                            ? '-translate-x-5.5'
                            : 'translate-x-5.5'
                          : isRtl
                          ? '-translate-x-0.5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Right side title & icon & accordion toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!showKpiCards) {
                        setShowKpiCards(true);
                        setIsQtyValueOpen(true);
                      } else {
                        setIsQtyValueOpen((prev) => !prev);
                      }
                    }}
                    className="order-1 flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer flex-1 justify-start select-none"
                  >
                    <Box className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>{isRtl ? 'كروت الملخص الإجمالي' : 'Summary KPI Cards'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isQtyValueOpen && showKpiCards ? 'rotate-180 text-[#0A3D62]' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Accordion Content when open */}
                {isQtyValueOpen && showKpiCards && (
                  <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 space-y-2.5">
                    <p className="text-[11px] text-slate-500 leading-relaxed text-start">
                      {isRtl
                        ? 'تحديد أعمدة الشيت التي تمثل الكمية والقيمة لحسابات الجدول والإجماليات:'
                        : 'Specify columns representing quantity and value for calculations:'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Quantity Col Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block text-start">
                          {isRtl ? 'عمود الكمية' : 'Quantity Col'}
                        </label>
                        <div className="relative">
                          <select
                            value={primaryMetricCol}
                            onChange={(e) => setPrimaryMetricCol(e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-[#0A3D62] outline-hidden cursor-pointer appearance-none text-start truncate pe-7"
                          >
                            <option value="">{isRtl ? 'اختر عمود الكمية' : 'Select Column'}</option>
                            {availableColumns.map((c, idx) => (
                              <option key={`qty-col-${c}-${idx}`} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Value Col Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block text-start">
                          {isRtl ? 'عمود القيمة' : 'Value Col'}
                        </label>
                        <div className="relative">
                          <select
                            value={secondaryMetricCol}
                            onChange={(e) => setSecondaryMetricCol(e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-[#0A3D62] outline-hidden cursor-pointer appearance-none text-start truncate pe-7"
                          >
                            <option value="">{isRtl ? 'اختر عمود القيمة' : 'Select Column'}</option>
                            {availableColumns.map((c, idx) => (
                              <option key={`val-col-${c}-${idx}`} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Percentage Share Switch (النسبة المئوية %) */}
              <div className="border border-slate-200/90 rounded-xl overflow-hidden transition-all bg-white">
                <div className="p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showPercentage}
                    onClick={() => {
                      const next = !showPercentage;
                      setShowPercentage(next);
                      if (!next) {
                        setIsPercentageOpen(false);
                      }
                    }}
                    className={`order-2 w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-hidden shrink-0 ${
                      showPercentage ? 'bg-[#0A3D62]' : 'bg-slate-300'
                    }`}
                    title={showPercentage ? (isRtl ? 'مفعّل' : 'Enabled') : (isRtl ? 'مغلق' : 'Disabled')}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform absolute top-0.5 ${
                        showPercentage
                          ? isRtl
                            ? '-translate-x-5.5'
                            : 'translate-x-5.5'
                          : isRtl
                          ? '-translate-x-0.5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!showPercentage) {
                        setShowPercentage(true);
                        setIsPercentageOpen(true);
                      } else {
                        setIsPercentageOpen((prev) => !prev);
                      }
                    }}
                    className="order-1 flex items-center gap-2 text-xs font-black text-slate-800 cursor-pointer flex-1 justify-start select-none"
                  >
                    <Percent className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>{isRtl ? 'النسبة المئوية %' : 'Percentage %'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isPercentageOpen && showPercentage ? 'rotate-180 text-[#0A3D62]' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Percentage options when open */}
                {isPercentageOpen && showPercentage && (
                  <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 block text-start">
                        {isRtl ? 'طريقة حساب النسبة المئوية:' : 'Percentage Mode:'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPercentageMode('total_share')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                            percentageMode === 'total_share'
                              ? 'bg-[#0A3D62] text-white border-[#0A3D62] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isRtl ? 'من الإجمالي العام' : 'Total Share %'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPercentageMode('col_vs_col')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer ${
                            percentageMode === 'col_vs_col'
                              ? 'bg-[#0A3D62] text-white border-[#0A3D62] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isRtl ? 'عمود مقابل عمود' : 'Column vs Column'}
                        </button>
                      </div>
                    </div>

                    {percentageMode === 'total_share' ? (
                      <p className="text-[10.5px] text-slate-600 leading-relaxed text-start bg-sky-50/70 p-2.5 rounded-lg border border-sky-100">
                        {isRtl
                          ? '💡 يتم حساب نسبة كل صف مقارنة بالإجمالي الكلي للعمود (تمثل 100%).'
                          : '💡 Calculates each row’s share relative to the total sum of the column.'}
                      </p>
                    ) : (
                      <div className="space-y-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Numerator Col */}
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-600 block text-start">
                              {isRtl ? 'البسط (العمود الأول)' : 'Numerator'}
                            </label>
                            <div className="relative">
                              <select
                                value={percentageNumeratorCol}
                                onChange={(e) => setPercentageNumeratorCol(e.target.value)}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#0A3D62] outline-hidden cursor-pointer appearance-none text-start truncate pe-6"
                              >
                                {availableColumns.map((c, idx) => (
                                  <option key={`num-col-${c}-${idx}`} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {/* Denominator Col */}
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-600 block text-start">
                              {isRtl ? 'المقام (العمود الثاني)' : 'Denominator'}
                            </label>
                            <div className="relative">
                              <select
                                value={percentageDenominatorCol}
                                onChange={(e) => setPercentageDenominatorCol(e.target.value)}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:ring-2 focus:ring-[#0A3D62] outline-hidden cursor-pointer appearance-none text-start truncate pe-6"
                              >
                                {availableColumns.map((c, idx) => (
                                  <option key={`den-col-${c}-${idx}`} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <p className="text-[10.5px] text-sky-800 font-semibold text-start bg-sky-50 px-2.5 py-1.5 rounded-lg">
                          {isRtl
                            ? `المعادلة: (${percentageNumeratorCol || '...'} ÷ ${percentageDenominatorCol || '...'}) × 100`
                            : `Formula: (${percentageNumeratorCol || '...'} ÷ ${percentageDenominatorCol || '...'}) × 100`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ACTION BUTTONS: [إلغاء] و [حفظ والبدء في التحليل مباشرة] */}
        {!isEmbedded ? (
          <div className="sticky bottom-0 z-30 pt-3 pb-3 bg-white/95 backdrop-blur-sm border-t border-slate-200/90 -mx-4 px-4 shadow-lg flex items-center gap-2.5">
            {/* Cancel Button (يمين في RTL) */}
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-black transition-all cursor-pointer bg-white shadow-2xs active:scale-95"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            {/* Apply & Return directly to Analysis */}
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0A3D62] hover:bg-[#082f4d] active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0A3D62]/20"
            >
              <Zap className="w-4 h-4 text-sky-200" />
              <span>{isRtl ? 'حفظ والبدء في التحليل مباشرة 🚀' : 'Save & Start Analysis 🚀'}</span>
            </button>
          </div>
        ) : (
          <div className="pt-2 pb-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0A3D62] hover:bg-[#082f4d] active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#0A3D62]/20"
            >
              <Zap className="w-4 h-4 text-sky-200" />
              <span>{isRtl ? 'حفظ وتطبيق الإعدادات' : 'Save & Apply Settings'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
