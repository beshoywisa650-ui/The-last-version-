import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  ArrowUpDown,
  Download,
  RotateCcw,
  Bookmark,
  ChevronRight,
  ChevronLeft,
  Filter,
  Check,
  Building2,
  Navigation as NavigationIcon,
  HelpCircle,
  BarChart3,
  Coins,
  Scale,
  Sparkles,
  Store,
  User,
  Users,
  Package,
  Tag,
  X,
  Calculator,
  Percent,
  Columns,
  Plus,
  Trash2,
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  Award,
  TrendingUp,
  AlignJustify,
  Zap,
  Copy,
  Pin,
  PinOff,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  Language,
  SalesRow,
  TerritoryFilter,
  ProductDimension,
  MetricType,
  AggregatedItem,
  SavedTerritory,
  SheetAnalysisResult,
  LoadedFileMeta,
  SheetMode,
  SavedSheetPreset,
  PercentageMode
} from '../types';
import { getTranslation } from '../utils/translations';
import { MultiSelectModal } from '../components/MultiSelectModal';
import { AddFilterColumnModal } from '../components/AddFilterColumnModal';
import { getSavedTableSettings, saveTableSettings } from '../utils/storage';
import {
  exportResultsToExcel,
  exportResultsToCsv,
  parseNumericValue
} from '../utils/excelParser';
import { useInPageDeckBack, useBackCard, useBackAction } from '../utils/backNavigation';

// Cached fast formatters for zero-stutter table rendering
const numFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const intFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Fast Arabic & Unicode normalization for smart tokenized substring search (e.g. "fa" or "fay" in "retail fayoum")
export const normalizeSearchText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[_\-/\\,.:;|()\[\]{}*+~`'"!؟?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const matchSearchTokens = (haystack: string, queryTokens: string[]): boolean => {
  if (queryTokens.length === 0) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  return queryTokens.every((token) => normalizedHaystack.includes(token));
};

interface AnalyzeViewProps {
  lang: Language;
  rows: SalesRow[];
  fileMeta?: LoadedFileMeta | null;
  activeDimensionColumns: string[];
  dynamicFilters: Record<string, string[]>;
  setDynamicFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  selectedAnalyzeColumn: string;
  setSelectedAnalyzeColumn: (col: string) => void;
  metric: MetricType;
  setMetric: (metric: MetricType) => void;
  primaryMetricCol?: string;
  secondaryMetricCol?: string;
  setPrimaryMetricCol?: (col: string) => void;
  setSecondaryMetricCol?: (col: string) => void;
  sheetAnalysis?: SheetAnalysisResult | null;
  showPercentage?: boolean;
  showKpiCards?: boolean;
  percentageMode?: PercentageMode;
  percentageNumeratorCol?: string;
  percentageDenominatorCol?: string;
  onTogglePercentage?: () => void;
  onOpenWizard: () => void;
  savedTerritory: SavedTerritory | null;
  onSaveTerritory: () => void;
  onApplySavedTerritory: () => void;
  onSaveAnalysis: (name: string) => void;
  onReset: () => void;
  onOpenAdmin?: () => void;
  presetAppliedBanner?: boolean;
  onDismissPresetBanner?: () => void;
  onAddDimensionColumn?: (col: string) => void;
  onRemoveDimensionColumn?: (col: string) => void;
  matchedPreset?: SavedSheetPreset | null;
  onApplySettings?: (config: {
    selectedColumns: string[];
    chosenMetric: MetricType;
    enableTarget: boolean;
    saveAsPreset: boolean;
    presetName?: string;
    primaryMetric?: string;
    secondaryMetric?: string;
    sheetType?: SheetMode;
    showPercentage?: boolean;
    showKpiCards?: boolean;
    percentageMode?: PercentageMode;
    percentageNumeratorCol?: string;
    percentageDenominatorCol?: string;
  }) => void;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({
  lang,
  rows,
  fileMeta,
  activeDimensionColumns,
  dynamicFilters,
  setDynamicFilters,
  selectedAnalyzeColumn,
  setSelectedAnalyzeColumn,
  metric,
  setMetric,
  primaryMetricCol,
  secondaryMetricCol,
  setPrimaryMetricCol,
  setSecondaryMetricCol,
  sheetAnalysis,
  showPercentage = true,
  showKpiCards = true,
  percentageMode = 'total_share',
  percentageNumeratorCol,
  percentageDenominatorCol,
  onTogglePercentage,
  onOpenWizard,
  savedTerritory,
  onSaveTerritory,
  onApplySavedTerritory,
  onSaveAnalysis,
  onReset,
  onOpenAdmin,
  presetAppliedBanner = false,
  onDismissPresetBanner,
  onAddDimensionColumn,
  onRemoveDimensionColumn,
  matchedPreset,
  onApplySettings
}) => {
  const t = getTranslation(lang);
  const isRtl = lang === 'ar';

  // Active column being edited in MultiSelectModal
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [isSaveAnalysisOpen, setIsSaveAnalysisOpen] = useState(false);
  const [analysisNameInput, setAnalysisNameInput] = useState('');

  // Lock body scroll whenever save analysis modal is open
  React.useEffect(() => {
    if (!isSaveAnalysisOpen) return;
    const originalScrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${originalScrollY}px`;
    return () => {
      document.body.classList.remove('modal-open');
      const top = document.body.style.top;
      document.body.style.top = '';
      if (top) window.scrollTo(0, -parseInt(top, 10));
    };
  }, [isSaveAnalysisOpen]);

  // Table search & sort
  const [tableSearch, setTableSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortColumn, setSortColumn] = useState<string>('metric');

  const handleTableSearchChange = (val?: string) => {
    setTableSearch(val || '');
  };

  // Stable key for file settings persistence (name + columns signature)
  const fileKey = useMemo(() => {
    if (!fileMeta) return '';
    return fileMeta.fileName + '_' + (fileMeta.columns ? fileMeta.columns.slice().sort().join('|') : '');
  }, [fileMeta]);

  // Export, Sort & Dimension menu toggles
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isDimensionPickerOpen, setIsDimensionPickerOpen] = useState(false);

  // Column pinning (freeze primary dimension column during horizontal scroll)
  const [isColumnPinned, setIsColumnPinned] = useState(true);

  // Floating dropdown anchor refs & positions (immune to horizontal overflow clipping)
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [sortMenuPos, setSortMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [exportMenuPos, setExportMenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  const handleToggleSortMenu = () => {
    if (!isSortMenuOpen && sortBtnRef.current) {
      const rect = sortBtnRef.current.getBoundingClientRect();
      const menuWidth = 200;
      let left: number | undefined = undefined;
      let right: number | undefined = undefined;

      if (isRtl) {
        if (rect.right - menuWidth < 12) {
          left = Math.max(12, rect.left);
        } else {
          right = Math.max(12, window.innerWidth - rect.right);
        }
      } else {
        if (rect.left + menuWidth > window.innerWidth - 12) {
          right = Math.max(12, window.innerWidth - rect.right);
        } else {
          left = Math.max(12, rect.left);
        }
      }

      setSortMenuPos({
        top: rect.bottom + 6,
        left,
        right
      });
      setIsSortMenuOpen(true);
      setShowExportMenu(false);
    } else {
      setIsSortMenuOpen(false);
    }
  };

  const handleToggleExportMenu = () => {
    if (!showExportMenu && exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect();
      const menuWidth = 230;
      let left: number | undefined = undefined;
      let right: number | undefined = undefined;

      if (isRtl) {
        if (rect.right - menuWidth < 12) {
          left = Math.max(12, rect.left);
        } else {
          right = Math.max(12, window.innerWidth - rect.right);
        }
      } else {
        if (rect.left + menuWidth > window.innerWidth - 12) {
          right = Math.max(12, window.innerWidth - rect.right);
        } else {
          left = Math.max(12, rect.left);
        }
      }

      setExportMenuPos({
        top: rect.bottom + 6,
        left,
        right
      });
      setShowExportMenu(true);
      setIsSortMenuOpen(false);
    } else {
      setShowExportMenu(false);
    }
  };

  // User-pinned/added columns for the dimension bar (persist across switches)
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);

  // Interactive row selection & drill-down states
  interface SelectedTableRowAction {
    column: string;
    name: string;
    qty: number;
    value: number;
    share: number;
  }
  interface DrillDownStep {
    parentColumn: string;
    parentItem: string;
    previousSelectedColumn: string;
    previousTableColumns?: string[];
  }
  interface IsolatedFilterStep {
    column: string;
    item: string;
  }
  const [activeRowAction, setActiveRowAction] = useState<SelectedTableRowAction | null>(null);
  const [showDrillDownOptions, setShowDrillDownOptions] = useState(false);
  const [drillDownHistory, setDrillDownHistory] = useState<DrillDownStep | null>(null);
  const [isolatedFilterHistory, setIsolatedFilterHistory] = useState<IsolatedFilterStep | null>(null);

  // Unified Connected Deck: 'columns' | 'filters' | null (collapsed by default)
  const [activeDeckTab, setActiveDeckTab] = useState<'columns' | 'filters' | null>(null);

  // Table Density: 'comfortable' (default 40px row) vs 'compact' (30px dense row)
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>(() => {
    try {
      return (localStorage.getItem('tsa_table_density') as 'comfortable' | 'compact') || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  const handleToggleDensity = () => {
    const next = tableDensity === 'comfortable' ? 'compact' : 'comfortable';
    setTableDensity(next);
    try {
      localStorage.setItem('tsa_table_density', next);
    } catch (_) {}
  };

  // Search Scope: 'table' (search in current grouped dimension) vs 'sheet' (search across all columns in raw sheet)
  const [searchScope, setSearchScope] = useState<'table' | 'sheet'>('table');

  // Copy table feedback state
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  // Default State = Closed (مغلق دائماً عند التنقل) for drawers
  useEffect(() => {
    setActiveDeckTab(null);
  }, [selectedAnalyzeColumn]);

  // Clean, lightning-fast tab switching
  const handleToggleColumnsTab = () => {
    setActiveDeckTab((prev) => (prev === 'columns' ? null : 'columns'));
  };

  const handleToggleFiltersTab = () => {
    setActiveDeckTab((prev) => (prev === 'filters' ? null : 'filters'));
  };

  // Handle device/browser back button to close open deck tab (filters or columns)
  const handleBackCloseDeck = useCallback(() => {
    setActiveDeckTab(null);
  }, []);

  useInPageDeckBack(activeDeckTab !== null, handleBackCloseDeck);

  // Fallback active columns if not initialized - dynamic to uploaded sheet headers
  const displayFilterColumns = useMemo(() => {
    let source: string[] = [];
    if (activeDimensionColumns && activeDimensionColumns.length > 0) {
      source = activeDimensionColumns;
    } else if (sheetAnalysis?.recommendedDimensions && sheetAnalysis.recommendedDimensions.length > 0) {
      source = sheetAnalysis.recommendedDimensions;
    } else if (fileMeta?.columns && fileMeta.columns.length > 0) {
      source = fileMeta.columns.slice(0, 4);
    }
    const seen = new Set<string>();
    const uniqueCols: string[] = [];
    source.forEach((c) => {
      const trimmed = c?.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        uniqueCols.push(trimmed);
      }
    });
    return uniqueCols;
  }, [activeDimensionColumns, sheetAnalysis, fileMeta]);

  // Quick dropdown state for adding unselected columns as filters
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);

  // Available sheet columns that are not currently in the filter deck
  const unselectedAvailableColumns = useMemo(() => {
    const cols = fileMeta?.columns || [];
    return cols.filter((col) => !displayFilterColumns.includes(col));
  }, [fileMeta, displayFilterColumns]);

  // Count of dimensions that actually have active filter selections applied
  const activeFiltersCount = useMemo(() => {
    return Object.keys(dynamicFilters).filter(
      (col) => dynamicFilters[col] && dynamicFilters[col].length > 0
    ).length;
  }, [dynamicFilters]);

  // State for quick metric columns customization popover
  const [isMetricColumnsMenuOpen, setIsMetricColumnsMenuOpen] = useState(false);

  // All detected candidate numeric columns in the sheet
  const candidateNumericCols = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addCol = (c?: string | null) => {
      if (c && typeof c === 'string' && c.trim()) {
        const key = c.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(c.trim());
        }
      }
    };

    if (primaryMetricCol) addCol(primaryMetricCol);
    if (secondaryMetricCol) addCol(secondaryMetricCol);
    if (sheetAnalysis?.detectedQtyCol) addCol(sheetAnalysis.detectedQtyCol);
    if (sheetAnalysis?.detectedValueCol) addCol(sheetAnalysis.detectedValueCol);

    if (sheetAnalysis?.metrics) {
      sheetAnalysis.metrics.forEach((m) => addCol(m.name));
    }

    // Inspect columns in rows for numeric content
    const allCols = fileMeta?.columns || (rows.length > 0 && rows[0]?.raw ? Object.keys(rows[0].raw) : []);
    allCols.forEach((col) => {
      if (seen.has(col)) return;
      let numericCount = 0;
      let nonZeroCount = 0;
      const sampleLimit = Math.min(rows.length, 30);
      for (let i = 0; i < sampleLimit; i++) {
        const val = rows[i]?.raw?.[col] ?? (rows[i] as any)?.[col];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const num = Number(String(val).replace(/[, %$£€EGPج.م]/g, '').trim());
          if (!isNaN(num)) {
            numericCount++;
            if (num !== 0) nonZeroCount++;
          }
        }
      }
      if (numericCount >= Math.min(sampleLimit, 5) * 0.6 && nonZeroCount > 0) {
        addCol(col);
      }
    });

    return list;
  }, [primaryMetricCol, secondaryMetricCol, sheetAnalysis, fileMeta, rows]);

  // Auto-Adaptive Metric Names & Dynamic Dual-Metric Detection
  const isCountOnlyMode = useMemo(() => {
    if (candidateNumericCols.length === 0 && !sheetAnalysis?.detectedQtyCol && !sheetAnalysis?.detectedValueCol) {
      return true;
    }
    return false;
  }, [sheetAnalysis, candidateNumericCols]);

  const effectivePrimaryCol = useMemo(() => {
    if (primaryMetricCol === '__NONE__') {
      return '';
    }
    if (isCountOnlyMode) {
      return isRtl ? 'عدد السجلات' : 'Record Count';
    }
    if (primaryMetricCol && primaryMetricCol.trim()) return primaryMetricCol.trim();
    if (sheetAnalysis?.detectedQtyCol) return sheetAnalysis.detectedQtyCol;
    if (candidateNumericCols.length > 0) return candidateNumericCols[0];
    if (sheetAnalysis?.metrics && sheetAnalysis.metrics.length > 0) return sheetAnalysis.metrics[0].name;
    return isRtl ? 'الكمية' : 'Units';
  }, [isCountOnlyMode, primaryMetricCol, sheetAnalysis, candidateNumericCols, isRtl]);

  const effectiveSecondaryCol = useMemo(() => {
    if (secondaryMetricCol === '__NONE__') {
      return '';
    }
    if (isCountOnlyMode) return '';

    // 1. Explicit secondaryMetricCol prop if non-empty and != primary
    if (secondaryMetricCol && secondaryMetricCol.trim() && secondaryMetricCol.trim() !== effectivePrimaryCol) {
      return secondaryMetricCol.trim();
    }
    // 2. Detected Value Col from sheet analysis if != primary and not explicitly disabled
    if (secondaryMetricCol === undefined || secondaryMetricCol === '') {
      if (sheetAnalysis?.detectedValueCol && sheetAnalysis.detectedValueCol !== effectivePrimaryCol) {
        return sheetAnalysis.detectedValueCol;
      }
      // 3. Fallback: Any detected metric from sheetAnalysis != primary
      if (sheetAnalysis?.metrics) {
        const found = sheetAnalysis.metrics.find((m) => m.name !== effectivePrimaryCol);
        if (found) return found.name;
      }
      // 4. Fallback: Any other candidate numeric column in the sheet != primary
      const otherCandidate = candidateNumericCols.find((col) => col !== effectivePrimaryCol);
      if (otherCandidate) return otherCandidate;
    }

    return '';
  }, [isCountOnlyMode, secondaryMetricCol, effectivePrimaryCol, sheetAnalysis, candidateNumericCols]);

  const hasPrimaryCol = Boolean(effectivePrimaryCol && effectivePrimaryCol.trim().length > 0);
  const hasSecondaryCol = Boolean(effectiveSecondaryCol && effectiveSecondaryCol.trim().length > 0);

  const hasDualMetrics = useMemo(() => {
    if (isCountOnlyMode) return false;
    if (!effectivePrimaryCol || !effectiveSecondaryCol) return false;
    return effectivePrimaryCol.trim() !== effectiveSecondaryCol.trim();
  }, [isCountOnlyMode, effectivePrimaryCol, effectiveSecondaryCol]);

  const isSecondaryCurrency = useMemo(() => {
    return /val|قيمة|مبلغ|صافي|net|egp|سعر|price|cost|تكلفة|مرتب|راتب|إجمالي|اجمالي|total|sales|revenue/i.test(effectiveSecondaryCol);
  }, [effectiveSecondaryCol]);

  // All purely categorical / dimension columns available in the uploaded sheet (EXCLUDING numeric metric columns)
  const allCandidateColumns = useMemo(() => {
    const rawCols =
      fileMeta?.columns && fileMeta.columns.length > 0
        ? fileMeta.columns
        : displayFilterColumns;

    // Identify all metric column names to exclude from grouping dimensions
    const metricCols = new Set<string>();
    if (effectivePrimaryCol) metricCols.add(effectivePrimaryCol);
    if (effectiveSecondaryCol) metricCols.add(effectiveSecondaryCol);
    if (primaryMetricCol) metricCols.add(primaryMetricCol);
    if (secondaryMetricCol) metricCols.add(secondaryMetricCol);
    if (sheetAnalysis?.detectedQtyCol) metricCols.add(sheetAnalysis.detectedQtyCol);
    if (sheetAnalysis?.detectedValueCol) metricCols.add(sheetAnalysis.detectedValueCol);
    if (sheetAnalysis?.detectedTargetCol) metricCols.add(sheetAnalysis.detectedTargetCol);

    if (sheetAnalysis?.metrics) {
      sheetAnalysis.metrics.forEach((m) => metricCols.add(m.name));
    }

    // Common numeric keywords in Arabic and English
    const numericRegex = /^(qty|quantity|units|volume|amount|val|value|sales|net|total|price|cost|target|goal|discount|كمية|كميه|عدد|قطع|مبلغ|قيمة|قيمه|إجمالي|اجمالي|صافي|سعر|تكلفة|تكلفه|تارجت|هدف|خصم|مبيعات)$/i;

    const filtered = rawCols.filter((col) => {
      if (metricCols.has(col)) return false;
      const cleanName = col.trim().toLowerCase();
      if (numericRegex.test(cleanName)) return false;
      return true;
    });

    const chosen = filtered.length > 0 ? filtered : rawCols;
    const seen = new Set<string>();
    const uniqueResult: string[] = [];
    chosen.forEach((c) => {
      const trimmed = c?.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        uniqueResult.push(trimmed);
      }
    });

    return uniqueResult;
  }, [
    fileMeta,
    displayFilterColumns,
    effectivePrimaryCol,
    effectiveSecondaryCol,
    primaryMetricCol,
    secondaryMetricCol,
    sheetAnalysis
  ]);

  // All raw sheet columns for complete freedom in choosing any dimension
  const allAvailableColumns = useMemo(() => {
    const raw = fileMeta?.columns || [];
    const seen = new Set<string>();
    const unique: string[] = [];
    raw.forEach((c) => {
      const trimmed = c?.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        unique.push(trimmed);
      }
    });
    return unique;
  }, [fileMeta]);

  // Smart Sales Perspectives (Top 3-4 key business dimensions like Rep, Product, Customer, Branch)
  const smartSalesPerspectives = useMemo(() => {
    if (allCandidateColumns.length === 0) return [];

    const scored = allCandidateColumns.map((col) => {
      const lower = col.toLowerCase();
      let priority = 100;
      let label = col;
      let iconType: 'rep' | 'product' | 'customer' | 'area' | 'other' = 'other';

      // 1. Sales Rep / Agent / Seller
      if (/مندوب|بائع|مسؤول|مسئول|سيلز|sales|rep|agent|seller|employee|موظف/i.test(lower)) {
        priority = 1;
        iconType = 'rep';
      }
      // 2. Product / Item / Category / SKU
      else if (/صنف|منتج|بضاعة|سلعة|مادة|item|product|sku|category|brand|ماركة/i.test(lower)) {
        priority = 2;
        iconType = 'product';
      }
      // 3. Customer / Client / Account / Doctor / Clinic
      else if (/عميل|زبون|شركة|صيدلية|دكتور|طبيب|مستشفى|محل|معرض|customer|client|account|doctor|clinic/i.test(lower)) {
        priority = 3;
        iconType = 'customer';
      }
      // 4. Territory / Region / Branch / City
      else if (/منطقة|فرع|محافظة|مدينة|قطاع|territory|region|branch|city|zone|governorate/i.test(lower)) {
        priority = 4;
        iconType = 'area';
      }

      return { col, priority, label, iconType };
    });

    // Sort by priority then original order
    scored.sort((a, b) => a.priority - b.priority);

    // Return the top 3 (or 4 if available) key dimensions
    return scored.slice(0, Math.min(3, scored.length));
  }, [allCandidateColumns]);

  // Active grouping columns for the Flat Table (with persistent restore)
  const [tableColumns, setTableColumns] = useState<string[]>(() => {
    if (fileKey) {
      const saved = getSavedTableSettings(fileKey);
      if (saved?.tableColumns && Array.isArray(saved.tableColumns) && saved.tableColumns.length > 0) {
        const valid = saved.tableColumns.filter((col: string) =>
          fileMeta?.columns ? fileMeta.columns.includes(col) : true
        );
        if (valid.length > 0) return valid;
      }
    }
    // Default to ONLY 1 primary dimension column so rows (e.g. Region) NEVER duplicate!
    if (selectedAnalyzeColumn && allCandidateColumns.includes(selectedAnalyzeColumn)) {
      return [selectedAnalyzeColumn];
    }
    if (activeDimensionColumns && activeDimensionColumns.length > 0) {
      const validFirst = activeDimensionColumns.find((c) => allCandidateColumns.includes(c));
      if (validFirst) return [validFirst];
    }
    if (allCandidateColumns.length > 0) {
      return [allCandidateColumns[0]];
    }
    return [];
  });

  // Remaining columns that can be added to the table dimensions
  const remainingAddableColumns = useMemo(() => {
    return allAvailableColumns.filter((c) => !tableColumns.includes(c));
  }, [allAvailableColumns, tableColumns]);

  // User-controlled display of numeric metrics in the Result Table (User decides whether to show them or not)
  const [tableShowQty, setTableShowQty] = useState<boolean>(() => {
    if (fileKey) {
      const saved = getSavedTableSettings(fileKey);
      if (saved && typeof saved.tableShowQty === 'boolean') {
        return saved.tableShowQty;
      }
    }
    if (isCountOnlyMode) return false;
    return metric === 'qty' || metric === 'both';
  });

  const [tableShowValue, setTableShowValue] = useState<boolean>(() => {
    if (fileKey) {
      const saved = getSavedTableSettings(fileKey);
      if (saved && typeof saved.tableShowValue === 'boolean') {
        return saved.tableShowValue;
      }
    }
    if (isCountOnlyMode) return false;
    return metric === 'value' || metric === 'both';
  });

  // Effective metric visibility flags (derived from column presence & user toggles)
  const canShowQty = hasPrimaryCol && tableShowQty;
  const canShowValue = hasSecondaryCol && tableShowValue;
  const canShowAnyMetric = canShowQty || canShowValue;

  // Pareto Principle (80/20) State & Action
  const [isParetoActive, setIsParetoActive] = useState<boolean>(false);

  // Fullscreen / Maximize Results Table State
  const [isTableFullscreen, setIsTableFullscreen] = useState<boolean>(false);

  // ESC key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableFullscreen) {
        setIsTableFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableFullscreen]);

  // Lock body scroll when table is in fullscreen
  useEffect(() => {
    if (isTableFullscreen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isTableFullscreen]);

  const handleTogglePareto = useCallback(() => {
    if (!isParetoActive) {
      setIsParetoActive(true);
      // Auto sort descending by dominant metric for optimal Pareto view
      if (canShowValue && metric === 'value') {
        setSortColumn('value');
        setSortOrder('desc');
      } else {
        setSortColumn('qty');
        setSortOrder('desc');
      }
    } else {
      setIsParetoActive(false);
    }
  }, [isParetoActive, canShowValue, metric]);

  // Helper to persist current table view settings
  const persistCurrentTableSettings = useCallback(
    (
      cols: string[],
      showQ: boolean,
      showV: boolean,
      primaryCol?: string
    ) => {
      if (!fileKey) return;
      saveTableSettings(fileKey, {
        tableColumns: cols,
        tableShowQty: showQ,
        tableShowValue: showV,
        selectedAnalyzeColumn: primaryCol
      });
    },
    [fileKey]
  );

  // Effective primary analyze grouping column (first column in tableColumns)
  const effectiveAnalyzeColumn = useMemo(() => {
    if (tableColumns.length > 0 && tableColumns[0]) {
      return tableColumns[0];
    }
    if (selectedAnalyzeColumn && allCandidateColumns.includes(selectedAnalyzeColumn)) {
      return selectedAnalyzeColumn;
    }
    return displayFilterColumns[0] || allCandidateColumns[0] || '';
  }, [tableColumns, selectedAnalyzeColumn, allCandidateColumns, displayFilterColumns]);

  // Current metric display mode for the table toolbar (qty | value | both)
  const currentMetricMode = useMemo<'qty' | 'value' | 'both'>(() => {
    if (tableShowQty && tableShowValue) return 'both';
    if (tableShowValue) return 'value';
    return 'qty';
  }, [tableShowQty, tableShowValue]);

  // Fast switch for metric display mode
  const handleSetMetricMode = useCallback(
    (mode: 'qty' | 'value' | 'both') => {
      let showQ = true;
      let showV = false;
      if (mode === 'value') {
        showQ = false;
        showV = true;
      } else if (mode === 'both') {
        showQ = true;
        showV = true;
      }
      setTableShowQty(showQ);
      setTableShowValue(showV);
      setMetric(mode);
      persistCurrentTableSettings(tableColumns, showQ, showV, effectiveAnalyzeColumn);
    },
    [tableColumns, effectiveAnalyzeColumn, persistCurrentTableSettings, setMetric]
  );

  // Handle table header sorting (asc / desc toggle directly on column click)
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(columnKey);
      if (tableColumns.includes(columnKey)) {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    }
  };

  // Quick sort selection helper for toolbar dropdown
  const currentSortKey = useMemo(() => {
    if (sortColumn === 'metric' || sortColumn === 'qty' || sortColumn === 'value') {
      return sortOrder === 'desc' ? 'metric_desc' : 'metric_asc';
    }
    if (sortColumn === tableColumns[0]) {
      return sortOrder === 'asc' ? 'alpha_asc' : 'alpha_desc';
    }
    if (sortColumn === 'share') {
      return sortOrder === 'desc' ? 'share_desc' : 'share_asc';
    }
    return sortOrder === 'desc' ? 'metric_desc' : 'metric_asc';
  }, [sortColumn, sortOrder, tableColumns]);

  const handleQuickSortChange = (key: string) => {
    if (key === 'metric_desc') {
      setSortColumn('metric');
      setSortOrder('desc');
    } else if (key === 'metric_asc') {
      setSortColumn('metric');
      setSortOrder('asc');
    } else if (key === 'alpha_asc') {
      setSortColumn(tableColumns[0] || 'dimension');
      setSortOrder('asc');
    } else if (key === 'alpha_desc') {
      setSortColumn(tableColumns[0] || 'dimension');
      setSortOrder('desc');
    } else if (key === 'share_desc') {
      setSortColumn('share');
      setSortOrder('desc');
    }
  };

  // Fast sample values for available columns in AnalyzeView
  const columnSamples = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (sheetAnalysis?.dimensions) {
      sheetAnalysis.dimensions.forEach((dim) => {
        if (dim.sampleValues && dim.sampleValues.length > 0) {
          map[dim.name] = dim.sampleValues.filter(Boolean).map(String).slice(0, 3);
        }
      });
    }
    if (rows && rows.length > 0) {
      allCandidateColumns.forEach((col) => {
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
  }, [sheetAnalysis, rows, allCandidateColumns]);

  // Synchronize table columns when candidate or active dimension columns change
  useEffect(() => {
    if (!activeDimensionColumns || activeDimensionColumns.length === 0) return;

    if (fileKey) {
      const saved = getSavedTableSettings(fileKey);
      if (saved?.tableColumns && saved.tableColumns.length > 0) {
        const savedValid = saved.tableColumns.filter((c: string) => allCandidateColumns.includes(c));
        if (savedValid.length > 0) {
          setTableColumns(savedValid);
          return;
        }
      }
    }

    setTableColumns((prev) => {
      // If user already has valid tableColumns chosen, preserve them!
      const valid = prev.filter((col) => allCandidateColumns.includes(col));
      if (valid.length > 0) {
        return valid;
      }

      // Initial fallback if no valid columns exist: always start with 1 primary dimension column
      const firstCol =
        selectedAnalyzeColumn && allCandidateColumns.includes(selectedAnalyzeColumn)
          ? selectedAnalyzeColumn
          : (activeDimensionColumns.find((c) => allCandidateColumns.includes(c)) || allCandidateColumns[0] || 'Unassigned');
      return [firstCol];
    });
  }, [activeDimensionColumns, allCandidateColumns, fileKey, selectedAnalyzeColumn]);

  // Synchronize table metric columns only when metric is explicitly switched
  const prevMetricRef = useRef<MetricType>(metric);
  useEffect(() => {
    if (prevMetricRef.current === metric) return;
    prevMetricRef.current = metric;

    if (isCountOnlyMode) {
      setTableShowQty(false);
      setTableShowValue(false);
    } else {
      let nextQty = tableShowQty;
      let nextVal = tableShowValue;
      if (metric === 'qty') {
        nextQty = true;
        nextVal = false;
      } else if (metric === 'value') {
        nextQty = false;
        nextVal = true;
      } else if (metric === 'both') {
        nextQty = true;
        nextVal = true;
      }
      setTableShowQty(nextQty);
      setTableShowValue(nextVal);
      persistCurrentTableSettings(tableColumns, nextQty, nextVal, tableColumns[0]);
    }
  }, [metric, isCountOnlyMode, tableColumns, persistCurrentTableSettings, tableShowQty, tableShowValue]);

  // Candidate columns not currently displayed in the table
  const availableToAddColumns = useMemo(() => {
    return allCandidateColumns.filter((col: string) => !tableColumns.includes(col));
  }, [allCandidateColumns, tableColumns]);

  // Columns Tab add dropdown state
  const [openAddDropdown, setOpenAddDropdown] = useState(false);
  const [openAddFilterDropdown, setOpenAddFilterDropdown] = useState(false);

  const handleRemoveTableColumn = (indexToRemove: number) => {
    setTableColumns((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      const nextPrimary = next[0];
      if (indexToRemove === 0 && nextPrimary) {
        setSelectedAnalyzeColumn(nextPrimary);
      }
      persistCurrentTableSettings(next, tableShowQty, tableShowValue, nextPrimary);
      return next;
    });
  };

  const handleSwitchTableColumn = (indexToSwitch: number, newCol: string) => {
    setTableColumns((prev) => {
      const next = [...prev];
      next[indexToSwitch] = newCol;
      const nextPrimary = next[0];
      persistCurrentTableSettings(next, tableShowQty, tableShowValue, nextPrimary);
      return next;
    });
    if (indexToSwitch === 0) {
      setSelectedAnalyzeColumn(newCol);
    }
  };

  const handleAddTableColumn = (newCol: string) => {
    if (!newCol) return;
    setTableColumns((prev) => {
      if (prev.includes(newCol)) return prev;
      const next = [...prev, newCol];
      persistCurrentTableSettings(next, tableShowQty, tableShowValue, next[0]);
      return next;
    });
    setOpenAddDropdown(false);
    if (onAddDimensionColumn && !activeDimensionColumns.includes(newCol)) {
      onAddDimensionColumn(newCol);
    }
  };

  // Handle changing analyze grouping column with instant reactivity
  const handleSelectAnalyzeColumn = (colName: string) => {
    setTableColumns((prev) => {
      let next: string[];
      if (prev.length > 0) {
        next = [...prev];
        next[0] = colName;
      } else {
        next = [colName];
      }
      persistCurrentTableSettings(next, tableShowQty, tableShowValue, colName);
      return next;
    });
    setSelectedAnalyzeColumn(colName);
  };

  // Add column permanently to the dimension bar and select it immediately
  const handleAddDimensionColumn = (colName: string) => {
    if (!colName) return;
    handleAddTableColumn(colName);
  };

  // 1. Filter entire screen by the selected row item
  const handleFilterByItem = (action: SelectedTableRowAction) => {
    setIsolatedFilterHistory({
      column: action.column,
      item: action.name
    });
    setDynamicFilters((prev) => {
      const existing = prev[action.column] || [];
      if (existing.includes(action.name)) return prev;
      return {
        ...prev,
        [action.column]: [...existing, action.name]
      };
    });
    setActiveRowAction(null);
    setShowDrillDownOptions(false);
  };

  // Undo filter isolation
  const handleResetIsolatedFilter = () => {
    if (!isolatedFilterHistory) return;
    const { column, item } = isolatedFilterHistory;
    setDynamicFilters((prev) => {
      const existing = prev[column] || [];
      const updated = existing.filter((val) => val !== item);
      const res = { ...prev };
      if (updated.length > 0) {
        res[column] = updated;
      } else {
        delete res[column];
      }
      return res;
    });
    setIsolatedFilterHistory(null);
  };

  // 2. Drill-down into the selected item broken down by targetColumn
  const handleDrillDownTo = (action: SelectedTableRowAction, targetColumn: string) => {
    setDrillDownHistory({
      parentColumn: action.column,
      parentItem: action.name,
      previousSelectedColumn: effectiveAnalyzeColumn,
      previousTableColumns: [...tableColumns]
    });
    // Filter rows by the parent item on the parent dimension
    setDynamicFilters((prev) => ({
      ...prev,
      [action.column]: [action.name]
    }));
    // Switch analyze column to targetColumn
    handleSelectAnalyzeColumn(targetColumn);
    if (onAddDimensionColumn && !activeDimensionColumns.includes(targetColumn)) {
      onAddDimensionColumn(targetColumn);
    }
    setActiveRowAction(null);
    setShowDrillDownOptions(false);
  };

  // Reset drill-down level back to previous level
  const handleResetDrillDown = () => {
    if (!drillDownHistory) return;
    if (drillDownHistory.previousTableColumns && drillDownHistory.previousTableColumns.length > 0) {
      setTableColumns(drillDownHistory.previousTableColumns);
      setSelectedAnalyzeColumn(drillDownHistory.previousTableColumns[0]);
      persistCurrentTableSettings(
        drillDownHistory.previousTableColumns,
        tableShowQty,
        tableShowValue,
        drillDownHistory.previousTableColumns[0]
      );
    } else {
      handleSelectAnalyzeColumn(drillDownHistory.previousSelectedColumn);
    }
    setDynamicFilters((prev) => {
      const updated = { ...prev };
      delete updated[drillDownHistory.parentColumn];
      return updated;
    });
    setDrillDownHistory(null);
  };

  // Comprehensive Back Button & Escape Key Navigation Integrations:
  // 1. Back button integration for Active Row Action Card (closes on device back / in-app back / Esc)
  useBackCard(
    activeRowAction !== null,
    () => {
      setActiveRowAction(null);
      setShowDrillDownOptions(false);
    },
    'active-row-action-card',
    35
  );

  // 2. Back button integration for "تفصيل حسب" Drill-Down Options inside the Card
  useBackAction(
    showDrillDownOptions,
    () => {
      setShowDrillDownOptions(false);
    },
    { id: 'drilldown-options-pills', priority: 36, pushHistory: false }
  );

  // 3. Back button integration for Active Drill-Down Dimension Step (e.g. Region -> Branch)
  useBackAction(
    drillDownHistory !== null,
    () => {
      handleResetDrillDown();
    },
    { id: 'drilldown-step-history', priority: 25, pushHistory: true }
  );

  // 4. Back button integration for Isolated Item Filter ("عزل العنصر")
  useBackAction(
    isolatedFilterHistory !== null && drillDownHistory === null,
    () => {
      handleResetIsolatedFilter();
    },
    { id: 'isolated-filter-history', priority: 24, pushHistory: true }
  );

  // 5. Back button integration for Metric Columns Customizer Popover
  useBackAction(
    isMetricColumnsMenuOpen,
    () => {
      setIsMetricColumnsMenuOpen(false);
    },
    { id: 'metric-columns-menu', priority: 38, pushHistory: false }
  );

  // 6. Back button integration for Export CSV/Excel Dropdown
  useBackAction(
    showExportMenu,
    () => {
      setShowExportMenu(false);
    },
    { id: 'export-menu', priority: 38, pushHistory: false }
  );

  // 6b. Back button integration for Sort Dropdown Menu
  useBackAction(
    isSortMenuOpen,
    () => {
      setIsSortMenuOpen(false);
    },
    { id: 'sort-menu', priority: 38, pushHistory: false }
  );

  // 6c. Back button integration for Dimension Picker Dropdown
  useBackAction(
    isDimensionPickerOpen,
    () => {
      setIsDimensionPickerOpen(false);
    },
    { id: 'dimension-picker', priority: 38, pushHistory: false }
  );

  // Global click & scroll listener to close dropdowns when clicking outside or scrolling
  useEffect(() => {
    if (!isSortMenuOpen && !showExportMenu && !isMetricColumnsMenuOpen && !isDimensionPickerOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setIsSortMenuOpen(false);
        setShowExportMenu(false);
        setIsMetricColumnsMenuOpen(false);
        setIsDimensionPickerOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      setIsSortMenuOpen(false);
      setShowExportMenu(false);
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isSortMenuOpen, showExportMenu, isMetricColumnsMenuOpen, isDimensionPickerOpen]);

  // 7. Back button / Escape to clear table search query when active
  useBackAction(
    tableSearch.trim().length > 0 && !activeRowAction && !showExportMenu && !isMetricColumnsMenuOpen,
    () => {
      setTableSearch('');
    },
    { id: 'table-search-query', priority: 15, pushHistory: false }
  );

  // Extract distinct options with counts for a given column
  const getOptionsForColumn = (colName: string) => {
    const counts = new Map<string, number>();

    // Calculate cascading frequency: respect other active filters!
    const activeFiltersList: { col: string; set: Set<string> }[] = [];
    Object.keys(dynamicFilters).forEach((k) => {
      if (k !== colName && dynamicFilters[k]?.length > 0) {
        activeFiltersList.push({ col: k, set: new Set(dynamicFilters[k]) });
      }
    });

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let matchesOtherFilters = true;

      for (let k = 0; k < activeFiltersList.length; k++) {
        const filterItem = activeFiltersList[k];
        const rawVal =
          r.raw?.[filterItem.col] !== undefined
            ? String(r.raw[filterItem.col]).trim()
            : String((r as any)[filterItem.col.toLowerCase()] || '').trim();
        if (!filterItem.set.has(rawVal)) {
          matchesOtherFilters = false;
          break;
        }
      }

      if (matchesOtherFilters) {
        const val =
          r.raw?.[colName] !== undefined
            ? String(r.raw[colName]).trim()
            : String((r as any)[colName.toLowerCase()] || '').trim();
        if (val) {
          counts.set(val, (counts.get(val) || 0) + 1);
        }
      }
    }

    return Array.from(counts.keys())
      .sort()
      .map((val) => ({ value: val, label: val, count: counts.get(val) }));
  };

  // Current active modal options
  const activeModalOptions = useMemo(() => {
    if (!activeFilterCol) return [];
    return getOptionsForColumn(activeFilterCol);
  }, [activeFilterCol, rows, dynamicFilters]);

  // Main Filter Engine: Filter rows by all active dynamic filters (+ sheet-wide search if searchScope === 'sheet')
  const filteredRows = useMemo(() => {
    const activeFiltersList: { col: string; set: Set<string> }[] = [];
    Object.keys(dynamicFilters).forEach((colName) => {
      const selectedVals = dynamicFilters[colName];
      if (selectedVals && selectedVals.length > 0) {
        activeFiltersList.push({ col: colName, set: new Set(selectedVals) });
      }
    });

    const hasSheetSearch = searchScope === 'sheet' && tableSearch && tableSearch.trim().length > 0;
    const searchTokens = (hasSheetSearch && tableSearch && tableSearch.trim().length > 0)
      ? normalizeSearchText(tableSearch).split(/\s+/).filter(Boolean)
      : [];

    if (activeFiltersList.length === 0 && !hasSheetSearch) {
      return rows;
    }

    return rows.filter((r) => {
      // 1. Dynamic filters matching
      for (let k = 0; k < activeFiltersList.length; k++) {
        const filterItem = activeFiltersList[k];
        const rawVal =
          r.raw?.[filterItem.col] !== undefined
            ? String(r.raw[filterItem.col]).trim()
            : String((r as any)[filterItem.col.toLowerCase()] || '').trim();
        if (!filterItem.set.has(rawVal)) {
          return false;
        }
      }

      // 2. Sheet-wide tokenized substring search across all cells of the row
      if (hasSheetSearch && searchTokens.length > 0) {
        const rawVals = r.raw ? Object.values(r.raw) : Object.values(r);
        const rowText = rawVals.filter((v) => v !== undefined && v !== null).map(String).join(' ');
        if (!matchSearchTokens(rowText, searchTokens)) {
          return false;
        }
      }

      return true;
    });
  }, [rows, dynamicFilters, searchScope, tableSearch]);

  // Total count of active filter items across all dimensions
  const totalActiveFiltersCount = useMemo(() => {
    let count = 0;
    Object.values(dynamicFilters).forEach((vals) => {
      if (Array.isArray(vals)) count += vals.length;
    });
    return count;
  }, [dynamicFilters]);

  // Flattened active filter tags for quick removal without opening deck
  const activeFilterTags = useMemo(() => {
    const tags: { col: string; val: string }[] = [];
    Object.entries(dynamicFilters).forEach(([col, vals]) => {
      if (Array.isArray(vals)) {
        vals.forEach((val) => {
          tags.push({ col, val });
        });
      }
    });
    return tags;
  }, [dynamicFilters]);

  const handleRemoveSingleFilter = (col: string, valToRemove: string) => {
    setDynamicFilters((prev) => {
      const currentList = prev[col] || [];
      const updatedList = currentList.filter((v) => v !== valToRemove);
      const next = { ...prev };
      if (updatedList.length > 0) {
        next[col] = updatedList;
      } else {
        delete next[col];
      }
      return next;
    });
  };

  // Aggregate by active table columns (Flat Table with multi-column support)
  const { aggregatedItems, totalQty, totalValue, totalCustomPercentage } = useMemo(() => {
    const groupingCols = tableColumns.length > 0 ? tableColumns : [effectiveAnalyzeColumn || 'Unassigned'];
    const map = new Map<
      string,
      { id: string; name: string; colValues: string[]; qty: number; value: number; count: number; numVal: number; denVal: number }
    >();
    let sumQ = 0;
    let sumV = 0;
    let sumNum = 0;
    let sumDen = 0;

    for (let i = 0; i < filteredRows.length; i++) {
      const row = filteredRows[i];

      const colValues = groupingCols.map((col) => {
        let val = '';
        if (row.raw && row.raw[col] !== undefined && row.raw[col] !== null) {
          val = String(row.raw[col]).trim();
        } else {
          val = String((row as any)[col.toLowerCase()] || '').trim();
        }
        return val || '—';
      });

      const key = colValues.join(' ⸺ ');
      const prev = map.get(key) || {
        id: key,
        name: colValues[0],
        colValues,
        qty: 0,
        value: 0,
        count: 0,
        numVal: 0,
        denVal: 0
      };

      let qInt = 0;
      let vInt = 0;

      if (isCountOnlyMode) {
        qInt = 1;
      } else {
        const pCol = effectivePrimaryCol;
        if (pCol && row.raw && row.raw[pCol] !== undefined) {
          qInt = parseNumericValue(row.raw[pCol]);
        } else if (primaryMetricCol && row.raw && row.raw[primaryMetricCol] !== undefined) {
          qInt = parseNumericValue(row.raw[primaryMetricCol]);
        } else if (row.qty !== undefined) {
          qInt = parseNumericValue(row.qty);
        } else {
          qInt = 0;
        }

        const sCol = effectiveSecondaryCol;
        if (sCol && row.raw && row.raw[sCol] !== undefined) {
          vInt = parseNumericValue(row.raw[sCol]);
        } else if (secondaryMetricCol && row.raw && row.raw[secondaryMetricCol] !== undefined) {
          vInt = parseNumericValue(row.raw[secondaryMetricCol]);
        } else if (row.value !== undefined) {
          vInt = parseNumericValue(row.value);
        } else {
          vInt = 0;
        }
      }

      let rowNum = 0;
      let rowDen = 0;
      if (percentageMode === 'col_vs_col') {
        if (percentageNumeratorCol && row.raw && row.raw[percentageNumeratorCol] !== undefined) {
          rowNum = parseNumericValue(row.raw[percentageNumeratorCol]);
        }
        if (percentageDenominatorCol && row.raw && row.raw[percentageDenominatorCol] !== undefined) {
          rowDen = parseNumericValue(row.raw[percentageDenominatorCol]);
        }
      }

      prev.qty += qInt;
      prev.value += vInt;
      prev.count += 1;
      prev.numVal += rowNum;
      prev.denVal += rowDen;
      map.set(key, prev);

      sumQ += qInt;
      sumV += vInt;
      sumNum += rowNum;
      sumDen += rowDen;
    }

    const items: AggregatedItem[] = [];
    map.forEach((data) => {
      const shareQty = sumQ !== 0 ? (data.qty / sumQ) * 100 : 0;
      const shareValue = sumV !== 0 ? (data.value / sumV) * 100 : 0;
      const customPct = data.denVal !== 0 ? (data.numVal / data.denVal) * 100 : 0;

      items.push({
        id: data.id,
        name: data.name,
        colValues: data.colValues,
        qty: isCountOnlyMode ? data.count : data.qty,
        value: data.value,
        shareQty: Math.max(0, shareQty),
        shareValue: Math.max(0, shareValue),
        customPercentage: customPct,
        rowCount: data.count
      });
    });

    const totalCustomPercentage = sumDen !== 0 ? (sumNum / sumDen) * 100 : 0;

    return {
      aggregatedItems: items,
      totalQty: sumQ,
      totalValue: sumV,
      totalCustomPercentage
    };
  }, [filteredRows, tableColumns, effectiveAnalyzeColumn, isCountOnlyMode, effectivePrimaryCol, effectiveSecondaryCol, primaryMetricCol, secondaryMetricCol, percentageMode, percentageNumeratorCol, percentageDenominatorCol]);

  // Quick executive insight: top contributor item
  const topContributor = useMemo(() => {
    if (!canShowAnyMetric) return null;
    if (!aggregatedItems || aggregatedItems.length === 0) return null;
    const metricKey = canShowValue && !canShowQty ? 'value' : (metric === 'value' && canShowValue ? 'value' : 'qty');
    let top = aggregatedItems[0];
    for (let i = 1; i < aggregatedItems.length; i++) {
      if (aggregatedItems[i][metricKey] > top[metricKey]) {
        top = aggregatedItems[i];
      }
    }
    if (!top || top[metricKey] <= 0) return null;
    const share = metricKey === 'value' ? top.shareValue : top.shareQty;
    return { name: top.name, share, qty: top.qty, value: top.value };
  }, [aggregatedItems, metric, canShowAnyMetric, canShowQty, canShowValue]);

  // Filter & Sort table items for display
  const displayItems = useMemo(() => {
    let list = [...aggregatedItems];

    // Only apply table-level text filtering if searchScope === 'table' (if 'sheet', it was already filtered in filteredRows)
    if (searchScope === 'table' && tableSearch && tableSearch.trim()) {
      const searchTokens = normalizeSearchText(tableSearch).split(/\s+/).filter(Boolean);
      if (searchTokens.length > 0) {
        list = list.filter((it) => {
          const itemText = [it.name || '', ...(it.colValues || [])].join(' ');
          return matchSearchTokens(itemText, searchTokens);
        });
      }
    }

    const sortedList = list.sort((a, b) => {
      let diff = 0;
      const colIdx = tableColumns.indexOf(sortColumn);

      if (colIdx !== -1) {
        const valA = a.colValues?.[colIdx] || (colIdx === 0 ? a.name : '') || '';
        const valB = b.colValues?.[colIdx] || (colIdx === 0 ? b.name : '') || '';
        diff = valA.localeCompare(valB, 'ar', { numeric: true, sensitivity: 'base' });
      } else if (sortColumn === 'qty') {
        diff = a.qty - b.qty;
      } else if (sortColumn === 'value') {
        diff = a.value - b.value;
      } else if (sortColumn === 'share') {
        const shareA =
          percentageMode === 'col_vs_col'
            ? (a.customPercentage ?? 0)
            : hasDualMetrics && metric === 'value'
            ? a.shareValue
            : a.shareQty;
        const shareB =
          percentageMode === 'col_vs_col'
            ? (b.customPercentage ?? 0)
            : hasDualMetrics && metric === 'value'
            ? b.shareValue
            : b.shareQty;
        diff = shareA - shareB;
      } else {
        const valA = hasDualMetrics && metric === 'value' ? a.value : a.qty;
        const valB = hasDualMetrics && metric === 'value' ? b.value : b.qty;
        diff = valA - valB;
      }

      return sortOrder === 'desc' ? -diff : diff;
    });

    if (!isParetoActive) {
      return sortedList;
    }

    // Apply Pareto Principle (80/20) - Filter to top contributors making up 80%
    const getMetricVal = (item: (typeof aggregatedItems)[0]) => {
      if (hasDualMetrics) {
        return metric === 'value' ? item.value : item.qty;
      }
      return canShowValue ? item.value : item.qty;
    };

    const totalSum = sortedList.reduce((acc, it) => acc + Math.max(0, getMetricVal(it)), 0);
    if (totalSum <= 0) return sortedList;

    const target80 = totalSum * 0.8;
    const descSorted = [...sortedList].sort((a, b) => getMetricVal(b) - getMetricVal(a));

    let accumulated = 0;
    const paretoKeys = new Set<string>();

    for (const it of descSorted) {
      paretoKeys.add(it.id || it.name);
      accumulated += Math.max(0, getMetricVal(it));
      if (accumulated >= target80) {
        break;
      }
    }

    return sortedList.filter((it) => paretoKeys.has(it.id || it.name));
  }, [aggregatedItems, tableSearch, sortColumn, sortOrder, metric, hasDualMetrics, tableColumns, percentageMode, isParetoActive, canShowValue]);

  // Pareto Statistics
  const paretoStats = useMemo(() => {
    if (!isParetoActive) return null;
    const getMetricVal = (item: (typeof aggregatedItems)[0]) => {
      if (hasDualMetrics) {
        return metric === 'value' ? item.value : item.qty;
      }
      return canShowValue ? item.value : item.qty;
    };

    const totalMetricSum = aggregatedItems.reduce((sum, item) => sum + Math.max(0, getMetricVal(item)), 0);
    if (totalMetricSum <= 0) return null;

    const displayMetricSum = displayItems.reduce((sum, item) => sum + Math.max(0, getMetricVal(item)), 0);
    const coveredShare = (displayMetricSum / totalMetricSum) * 100;
    const itemsShare = aggregatedItems.length > 0 ? (displayItems.length / aggregatedItems.length) * 100 : 0;

    return {
      totalCount: aggregatedItems.length,
      paretoCount: displayItems.length,
      coveredShare: coveredShare.toFixed(1),
      itemsShare: itemsShare.toFixed(0),
    };
  }, [isParetoActive, aggregatedItems, displayItems, hasDualMetrics, metric, canShowValue]);

  // Internal High-Performance Progressive Windowing (No external pagination UI)
  const [visibleRowsCount, setVisibleRowsCount] = useState<number>(80);

  // Reset windowing whenever search, filters, columns, or metrics change
  useEffect(() => {
    setVisibleRowsCount(80);
  }, [tableSearch, dynamicFilters, selectedAnalyzeColumn, sortOrder, tableColumns, metric, isParetoActive]);

  const renderedDisplayItems = useMemo(() => {
    return displayItems.slice(0, visibleRowsCount);
  }, [displayItems, visibleRowsCount]);

  // Copy table to clipboard in clean TSV format (ready to paste into Excel or WhatsApp)
  const handleCopyTable = useCallback(() => {
    if (displayItems.length === 0) return;
    try {
      const headers = [
        '#',
        ...tableColumns,
        ...(tableShowQty ? [effectivePrimaryCol] : []),
        ...(tableShowValue ? [effectiveSecondaryCol || 'Value'] : []),
        ...(showPercentage ? ['%'] : [])
      ];

      const rowsData = displayItems.map((item, idx) => {
        const row = [
          String(idx + 1),
          ...(item.colValues && item.colValues.length === tableColumns.length ? item.colValues : [item.name]),
          ...(tableShowQty ? [String(item.qty)] : []),
          ...(tableShowValue ? [String(item.value)] : []),
          ...(showPercentage ? [`${(percentageMode === 'col_vs_col' ? (item.customPercentage ?? 0) : (metric === 'value' ? item.shareValue : item.shareQty)).toFixed(1)}%`] : [])
        ];
        return row.join('\t');
      });

      const text = [headers.join('\t'), ...rowsData].join('\n');
      navigator.clipboard.writeText(text).then(() => {
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2200);
      });
    } catch (_) {}
  }, [displayItems, tableColumns, tableShowQty, tableShowValue, showPercentage, effectivePrimaryCol, effectiveSecondaryCol, percentageMode, metric]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 250) {
      setVisibleRowsCount((prev) => {
        if (prev >= displayItems.length) return prev;
        return Math.min(prev + 80, displayItems.length);
      });
    }
  };

  // Helper to get semantic icon for dimension with a unified, professional palette
  const getDimensionIcon = (colName: string, customColor?: string) => {
    const norm = colName.toLowerCase();
    const colorClass = customColor || 'text-slate-500 group-hover:text-[#0A3D62] transition-colors';
    if (/reg|منطقة|محافظة|اقليم/i.test(norm)) return <MapPin className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/branch|فرع/i.test(norm)) return <Building2 className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/cust|pharm|صيدلية|عميل|مستشفى/i.test(norm)) return <Store className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/rep|مندوب|ممثل/i.test(norm)) return <User className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/sup|مشرف|خط/i.test(norm)) return <Users className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/prod|منتج|مستحضر/i.test(norm)) return <Package className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    if (/item|brand|صنف|براند|عبوة/i.test(norm)) return <Tag className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
    return <Layers className={`w-3.5 h-3.5 ${colorClass} shrink-0`} />;
  };

  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="w-full mx-auto py-2.5 sm:py-3.5 space-y-3 sm:space-y-3.5 pb-24">
      {/* 💡 Suggestion 1: Preset Auto-Applied Banner */}
      {presetAppliedBanner && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-bold text-amber-950 truncate">
              {t.companyPresetBanner}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWizard}
              className="text-[11px] font-extrabold text-[#0A3D62] bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg shadow-2xs"
            >
              {t.modifyFilters}
            </button>
            {onDismissPresetBanner && (
              <button
                type="button"
                onClick={onDismissPresetBanner}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Unified Executive Command Bar (شريط القيادة والبحث والمقاييس المباشرة) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:px-4 space-y-2.5 transition-all">
        {/* السطر 1: سطر التجميع والأبعاد (مستقل بكامل راحته وعرضه) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar w-full">
          {/* Prominent Dimension Dropdown (Freedom to choose any column from the sheet) */}
          <div className="relative inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 shadow-2xs shrink-0 flex-nowrap">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1 shrink-0 whitespace-nowrap select-none">
              <Layers className="w-3.5 h-3.5 text-[#0A3D62]" />
              <span className="hidden sm:inline whitespace-nowrap">{isRtl ? 'التجميع حسب:' : 'Group by:'}</span>
            </span>
            <select
              value={effectiveAnalyzeColumn}
              onChange={(e) => handleSelectAnalyzeColumn(e.target.value)}
              className="bg-white text-slate-900 font-black text-xs py-1.5 ps-2.5 pe-7 rounded-lg border border-slate-200 shadow-xs cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-[#0A3D62] shrink-0"
              title={isRtl ? 'اختر أي عمود لتجميع وتقسيم الجدول' : 'Select any column to group table'}
            >
              <optgroup label={isRtl ? 'الأبعاد المقترحة' : 'Recommended Dimensions'}>
                {allCandidateColumns.map((col, idx) => (
                  <option key={`group-cand-${col}-${idx}`} value={col}>
                    {col}
                  </option>
                ))}
              </optgroup>
              {allAvailableColumns.filter((c) => !allCandidateColumns.includes(c)).length > 0 && (
                <optgroup label={isRtl ? 'باقي أعمدة الشيت' : 'Other Columns'}>
                  {allAvailableColumns
                    .filter((c) => !allCandidateColumns.includes(c))
                    .map((col, idx) => (
                      <option key={`group-avail-${col}-${idx}`} value={col}>
                        {col}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick 1-Click Business Perspectives Pills - Single Line, Never Stacking */}
          {smartSalesPerspectives.length > 0 && (
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs overflow-x-auto no-scrollbar shrink-0 flex-nowrap">
              {smartSalesPerspectives.map((item, idx) => {
                const isActive = effectiveAnalyzeColumn === item.col;
                return (
                  <button
                    key={`persp-${item.col}-${idx}`}
                    type="button"
                    onClick={() => handleSelectAnalyzeColumn(item.col)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex flex-row flex-nowrap items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap active:scale-95 select-none ${
                      isActive
                        ? 'bg-[#0A3D62] text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                    }`}
                    title={isRtl ? `عرض المبيعات مجمعة حسب ${item.col}` : `Group sales by ${item.col}`}
                  >
                    <span className="text-xs leading-none shrink-0 inline-flex items-center justify-center">
                      {item.iconType === 'rep' && '👤'}
                      {item.iconType === 'product' && '📦'}
                      {item.iconType === 'customer' && '🏢'}
                      {item.iconType === 'area' && '📍'}
                      {item.iconType === 'other' && '📊'}
                    </span>
                    <span className="whitespace-nowrap leading-none">{item.col}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* السطر 2: سطر البحث (مستقل بكامل العرض w-full) */}
        <div className="relative w-full flex items-center bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs focus-within:ring-2 focus-within:ring-[#0A3D62] focus-within:bg-white focus-within:border-transparent transition-all">
          <Search className="w-3.5 h-3.5 text-slate-400 ms-3 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => handleTableSearchChange(e.target.value)}
            placeholder={searchScope === 'sheet' ? (isRtl ? 'بحث في الشيت...' : 'Search sheet...') : (isRtl ? 'بحث في الجدول...' : 'Search table...')}
            className="w-full bg-transparent px-2.5 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {tableSearch && (
            <button
              type="button"
              onClick={() => handleTableSearchChange('')}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer me-1"
              title={isRtl ? 'مسح البحث' : 'Clear search'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Scope Switcher Dropdown (جدول أو شيت) */}
          <div className="border-s border-slate-200 px-1.5 py-0.5 shrink-0">
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value as 'table' | 'sheet')}
              className="bg-transparent text-[11px] font-bold text-slate-700 hover:text-[#0A3D62] py-1 ps-1 pe-3 cursor-pointer appearance-none focus:outline-none"
              title={isRtl ? 'نطاق البحث (جدول أو شيت)' : 'Search Scope'}
            >
              <option value="table">{isRtl ? 'جدول' : 'Table'}</option>
              <option value="sheet">{isRtl ? 'شيت' : 'Sheet'}</option>
            </select>
          </div>
        </div>

        {/* السطر 3: سطر الكمية والقيمة والمقاييس الرقمية (بعرض كامل متطابق w-full) */}
        {!isCountOnlyMode && (
          <div className="w-full">
            {hasDualMetrics ? (
              <div className="w-full flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs">
                {/* 1. Quantity Pill */}
                <button
                  type="button"
                  onClick={() => handleSetMetricMode('qty')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    currentMetricMode === 'qty'
                      ? 'bg-[#0A3D62] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  }`}
                  title={isRtl ? `عرض ${effectivePrimaryCol || 'الكمية'} فقط` : `Show ${effectivePrimaryCol || 'Quantity'} only`}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span>{effectivePrimaryCol || (isRtl ? 'الكمية' : 'Qty')}</span>
                </button>

                {/* 2. Value Pill */}
                <button
                  type="button"
                  onClick={() => handleSetMetricMode('value')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    currentMetricMode === 'value'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  }`}
                  title={isRtl ? `عرض ${effectiveSecondaryCol || 'القيمة'} فقط` : `Show ${effectiveSecondaryCol || 'Value'} only`}
                >
                  <Coins className="w-3.5 h-3.5 shrink-0" />
                  <span>{effectiveSecondaryCol || (isRtl ? 'القيمة' : 'Value')}</span>
                </button>

                {/* 3. Both Pill */}
                <button
                  type="button"
                  onClick={() => handleSetMetricMode('both')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    currentMetricMode === 'both'
                      ? 'bg-[#0A3D62] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                  }`}
                  title={isRtl ? 'عرض الكمية والقيمة معاً' : 'Show both metrics'}
                >
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRtl ? 'كلاهما' : 'Both'}</span>
                </button>

                {/* Metric Columns Customizer (SlidersHorizontal) */}
                {candidateNumericCols.length >= 1 && (
                  <div className="relative border-s border-slate-200 ps-1 ms-1 shrink-0" data-dropdown-container>
                    <button
                      type="button"
                      onClick={() => setIsMetricColumnsMenuOpen(!isMetricColumnsMenuOpen)}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                        isMetricColumnsMenuOpen
                          ? 'bg-[#0A3D62] text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-white/80'
                      }`}
                      title={isRtl ? 'تخصيص أعمدة الأرقام والمقاييس' : 'Customize numeric metric columns'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {isMetricColumnsMenuOpen && (
                      <div className={`absolute top-full mt-2 ${isRtl ? 'left-0 right-auto' : 'right-0 left-auto'} w-72 max-w-[calc(100vw-32px)] bg-white border border-[#D9E1E8] rounded-xl shadow-xl z-50 p-3 space-y-3 animate-fadeIn text-xs`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A3D62]" />
                            <span>{isRtl ? 'اختيار أعمدة المقاييس' : 'Metric Columns Setup'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الأول (الكمية / الأساسي):' : 'Primary Metric Column:'}
                          </label>
                          <select
                            value={primaryMetricCol === '__NONE__' ? '__NONE__' : (effectivePrimaryCol || '__NONE__')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setPrimaryMetricCol) setPrimaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowQty(false);
                              } else {
                                setTableShowQty(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود كمية)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols.map((col, cIdx) => (
                              <option key={`p1-col-${col}-${cIdx}`} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الثاني (القيمة / المالي):' : 'Secondary Metric Column:'}
                          </label>
                          <select
                            value={secondaryMetricCol === '__NONE__' || !effectiveSecondaryCol ? '__NONE__' : effectiveSecondaryCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setSecondaryMetricCol) setSecondaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowValue(false);
                              } else {
                                setTableShowValue(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود قيمة)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols
                              .filter((col) => col !== effectivePrimaryCol)
                              .map((col, cIdx) => (
                                <option key={`s1-col-${col}-${cIdx}`} value={col}>{col}</option>
                              ))}
                          </select>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="px-3 py-1.5 bg-[#0A3D62] text-white font-bold rounded-lg hover:bg-[#082f4d] transition-colors cursor-pointer"
                          >
                            {isRtl ? 'تم' : 'Done'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : hasPrimaryCol ? (
              <div className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/90 text-slate-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-[#0A3D62]" />
                  <span className="text-slate-700">{effectivePrimaryCol}</span>
                </div>
                {candidateNumericCols.length >= 1 && (
                  <div className="relative shrink-0" data-dropdown-container>
                    <button
                      type="button"
                      onClick={() => setIsMetricColumnsMenuOpen(!isMetricColumnsMenuOpen)}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                        isMetricColumnsMenuOpen
                          ? 'bg-[#0A3D62] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                      }`}
                      title={isRtl ? 'تخصيص أعمدة الأرقام والمقاييس' : 'Customize numeric metric columns'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {isMetricColumnsMenuOpen && (
                      <div className={`absolute top-full mt-2 ${isRtl ? 'left-0 right-auto' : 'right-0 left-auto'} w-72 max-w-[calc(100vw-32px)] bg-white border border-[#D9E1E8] rounded-xl shadow-xl z-50 p-3 space-y-3 animate-fadeIn text-xs`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A3D62]" />
                            <span>{isRtl ? 'اختيار أعمدة المقاييس' : 'Metric Columns Setup'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الأول (الكمية / الأساسي):' : 'Primary Metric Column:'}
                          </label>
                          <select
                            value={primaryMetricCol === '__NONE__' ? '__NONE__' : (effectivePrimaryCol || '__NONE__')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setPrimaryMetricCol) setPrimaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowQty(false);
                              } else {
                                setTableShowQty(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود كمية)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols.map((col, cIdx) => (
                              <option key={`p2-col-${col}-${cIdx}`} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الثاني (القيمة / المالي):' : 'Secondary Metric Column:'}
                          </label>
                          <select
                            value={secondaryMetricCol === '__NONE__' || !effectiveSecondaryCol ? '__NONE__' : effectiveSecondaryCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setSecondaryMetricCol) setSecondaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowValue(false);
                              } else {
                                setTableShowValue(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود قيمة)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols
                              .filter((col) => col !== effectivePrimaryCol)
                              .map((col, cIdx) => (
                                <option key={`s2-col-${col}-${cIdx}`} value={col}>{col}</option>
                              ))}
                          </select>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="px-3 py-1.5 bg-[#0A3D62] text-white font-bold rounded-lg hover:bg-[#082f4d] transition-colors cursor-pointer"
                          >
                            {isRtl ? 'تم' : 'Done'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : hasSecondaryCol ? (
              <div className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/90 text-slate-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-slate-700">{effectiveSecondaryCol}</span>
                </div>
                {candidateNumericCols.length >= 1 && (
                  <div className="relative shrink-0" data-dropdown-container>
                    <button
                      type="button"
                      onClick={() => setIsMetricColumnsMenuOpen(!isMetricColumnsMenuOpen)}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                        isMetricColumnsMenuOpen
                          ? 'bg-[#0A3D62] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                      }`}
                      title={isRtl ? 'تخصيص أعمدة الأرقام والمقاييس' : 'Customize numeric metric columns'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {isMetricColumnsMenuOpen && (
                      <div className={`absolute top-full mt-2 ${isRtl ? 'left-0 right-auto' : 'right-0 left-auto'} w-72 max-w-[calc(100vw-32px)] bg-white border border-[#D9E1E8] rounded-xl shadow-xl z-50 p-3 space-y-3 animate-fadeIn text-xs`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A3D62]" />
                            <span>{isRtl ? 'اختيار أعمدة المقاييس' : 'Metric Columns Setup'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الأول (الكمية / الأساسي):' : 'Primary Metric Column:'}
                          </label>
                          <select
                            value={primaryMetricCol === '__NONE__' ? '__NONE__' : (effectivePrimaryCol || '__NONE__')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setPrimaryMetricCol) setPrimaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowQty(false);
                              } else {
                                setTableShowQty(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود كمية)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols.map((col, cIdx) => (
                              <option key={`p3-col-${col}-${cIdx}`} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الثاني (القيمة / المالي):' : 'Secondary Metric Column:'}
                          </label>
                          <select
                            value={secondaryMetricCol === '__NONE__' || !effectiveSecondaryCol ? '__NONE__' : effectiveSecondaryCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setSecondaryMetricCol) setSecondaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowValue(false);
                              } else {
                                setTableShowValue(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود قيمة)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols
                              .filter((col) => col !== effectivePrimaryCol)
                              .map((col, cIdx) => (
                                <option key={`s3-col-${col}-${cIdx}`} value={col}>{col}</option>
                              ))}
                          </select>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="px-3 py-1.5 bg-[#0A3D62] text-white font-bold rounded-lg hover:bg-[#082f4d] transition-colors cursor-pointer"
                          >
                            {isRtl ? 'تم' : 'Done'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Both disabled: Clean category view indicator with metric picker */
              <div className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 text-xs font-semibold flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>📋</span>
                  <span>{isRtl ? 'بدون مقاييس رقمية' : 'No numeric metrics'}</span>
                </span>
                {candidateNumericCols.length >= 1 && (
                  <div className="relative shrink-0" data-dropdown-container>
                    <button
                      type="button"
                      onClick={() => setIsMetricColumnsMenuOpen(!isMetricColumnsMenuOpen)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap ${
                        isMetricColumnsMenuOpen
                          ? 'bg-[#0A3D62] text-white shadow-xs border-[#0A3D62]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={isRtl ? 'اختيار أعمدة كمية أو قيمة' : 'Select numeric metric columns'}
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[#0A3D62]" />
                      <span>{isRtl ? 'اختيار مقياس رقمي' : 'Add Metric'}</span>
                    </button>

                    {isMetricColumnsMenuOpen && (
                      <div className={`absolute top-full mt-2 ${isRtl ? 'left-0 right-auto' : 'right-0 left-auto'} w-72 max-w-[calc(100vw-32px)] bg-white border border-[#D9E1E8] rounded-xl shadow-xl z-50 p-3 space-y-3 animate-fadeIn text-xs`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0A3D62]" />
                            <span>{isRtl ? 'اختيار أعمدة المقاييس' : 'Metric Columns Setup'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الأول (الكمية / الأساسي):' : 'Primary Metric Column:'}
                          </label>
                          <select
                            value={primaryMetricCol === '__NONE__' ? '__NONE__' : (effectivePrimaryCol || '__NONE__')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setPrimaryMetricCol) setPrimaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowQty(false);
                              } else {
                                setTableShowQty(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود كمية)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols.map((col, cIdx) => (
                              <option key={`p4-col-${col}-${cIdx}`} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-600">
                            {isRtl ? 'العمود الرقمي الثاني (القيمة / المالي):' : 'Secondary Metric Column:'}
                          </label>
                          <select
                            value={secondaryMetricCol === '__NONE__' || !effectiveSecondaryCol ? '__NONE__' : effectiveSecondaryCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (setSecondaryMetricCol) setSecondaryMetricCol(val);
                              if (val === '__NONE__') {
                                setTableShowValue(false);
                              } else {
                                setTableShowValue(true);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A3D62]"
                          >
                            <option value="__NONE__">{isRtl ? '🚫 (بدون عمود قيمة)' : '🚫 (None / Disabled)'}</option>
                            {candidateNumericCols
                              .filter((col) => col !== effectivePrimaryCol)
                              .map((col, cIdx) => (
                                <option key={`s4-col-${col}-${cIdx}`} value={col}>{col}</option>
                              ))}
                          </select>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsMetricColumnsMenuOpen(false)}
                            className="px-3 py-1.5 bg-[#0A3D62] text-white font-bold rounded-lg hover:bg-[#082f4d] transition-colors cursor-pointer"
                          >
                            {isRtl ? 'تم' : 'Done'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* السطر 4: سطر النتيجة والإجماليات الرشيق (Slim Executive Ribbon) - يختفي تلقائياً عند تعطيل الأعمدة الرقمية */}
        {displayItems.length > 0 && canShowAnyMetric && (
          <div className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs animate-fadeIn">
            {/* Right / Start: Numbers only in single clean line */}
            <div className="flex items-center gap-3 flex-wrap font-mono">
              {canShowQty && (
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-sky-50 text-[#0A3D62] flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-slate-500 font-sans font-medium text-xs sm:text-sm">{isRtl ? 'إجمالي' : 'Total'} {effectivePrimaryCol}:</span>
                  <span className="font-black text-[#0A3D62] text-sm sm:text-base tabular-nums">
                    {totalQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                </div>
              )}

              {canShowQty && canShowValue && (
                <span className="text-slate-200 select-none hidden sm:inline">|</span>
              )}

              {canShowValue && (
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-slate-500 font-sans font-medium text-xs sm:text-sm">{isRtl ? 'إجمالي' : 'Total'} {effectiveSecondaryCol}:</span>
                  <span className="font-black text-emerald-800 text-sm sm:text-base tabular-nums">
                    {Math.round(totalValue).toLocaleString()}
                  </span>
                  <span className="font-sans text-xs text-emerald-700 font-bold">{t.egp}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. The Hero Data Table Canvas (يبدأ الجدول فوراً بدون أي تأخير رأسي) */}
      <div
        className={`bg-white transition-all ${
          isTableFullscreen
            ? 'fixed inset-0 z-50 flex flex-col w-screen h-screen overflow-hidden'
            : 'rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-visible'
        }`}
      >
        {/* Fullscreen Search Bar Strip (أعلى الصفحة مباشرة وبدون أي فوكس تلقائي أو فتح كيبورد) */}
        {isTableFullscreen && (
          <div className="px-3 sm:px-4 py-2 bg-slate-100/90 border-b border-slate-200/90 flex items-center gap-2.5 shrink-0 animate-fadeIn">
            <div className="relative flex-1 flex items-center bg-white border border-slate-200/90 rounded-xl shadow-2xs focus-within:ring-2 focus-within:ring-[#0A3D62] focus-within:border-transparent transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 ms-3 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => handleTableSearchChange(e.target.value)}
                placeholder={
                  searchScope === 'sheet'
                    ? (isRtl ? 'بحث في الشيت بالكامل (كافة الصفوف)...' : 'Search entire sheet (all rows)...')
                    : (isRtl ? 'بحث في عناصر الجدول الحالي...' : 'Search current table items...')
                }
                className="w-full bg-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => handleTableSearchChange('')}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer me-1"
                  title={isRtl ? 'مسح البحث' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Scope Switcher Dropdown (جدول أو شيت) */}
              <div className="border-s border-slate-200 px-1.5 py-0.5 shrink-0">
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value as 'table' | 'sheet')}
                  className="bg-transparent text-[11px] font-bold text-slate-700 hover:text-[#0A3D62] py-1 ps-1 pe-3 cursor-pointer appearance-none focus:outline-none"
                  title={isRtl ? 'نطاق البحث (جدول أو شيت)' : 'Search Scope'}
                >
                  <option value="table">{isRtl ? 'جدول' : 'Table'}</option>
                  <option value="sheet">{isRtl ? 'شيت' : 'Sheet'}</option>
                </select>
              </div>
            </div>

            {tableSearch && (
              <span className="text-[11px] font-bold text-[#0A3D62] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 font-mono">
                <span>{displayItems.length}</span>
                <span className="font-sans font-normal text-slate-500">{isRtl ? 'عنصر مطابق' : 'matched'}</span>
              </span>
            )}
          </div>
        )}
        {/* Breadcrumb 1: Drill-down Active Banner */}
        {drillDownHistory && (
          <div className="bg-gradient-to-r from-[#0A3D62] to-[#122A3F] text-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-sky-900/40 rounded-t-2xl animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold overflow-hidden">
              <span className="text-sky-300 font-bold">{drillDownHistory.parentColumn}:</span>
              <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded-md truncate max-w-[140px] sm:max-w-[200px]">
                {drillDownHistory.parentItem}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 text-sky-300 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
              <span className="text-emerald-300 font-extrabold">{effectiveAnalyzeColumn}</span>
            </div>
            <button
              type="button"
              onClick={handleResetDrillDown}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              title={isRtl ? `الرجوع إلى (${drillDownHistory.parentColumn})` : `Return to (${drillDownHistory.parentColumn})`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isRtl ? 'رجوع للكل' : 'Reset to All'}</span>
            </button>
          </div>
        )}

        {/* Breadcrumb 2: Isolated Filter Active Banner */}
        {isolatedFilterHistory && !drillDownHistory && (
          <div className="bg-gradient-to-r from-sky-900 to-[#0A3D62] text-white px-3.5 py-2 flex items-center justify-between gap-2 border-b border-sky-900/40 rounded-t-2xl animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold overflow-hidden">
              <span className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تم حصر الشاشة لـ:' : 'Filtered screen by:'}</span>
              </span>
              <span className="text-sky-300 font-bold shrink-0">{isolatedFilterHistory.column}:</span>
              <span className="font-extrabold bg-white/20 px-2 py-0.5 rounded-md truncate max-w-[180px] sm:max-w-[320px]">
                {isolatedFilterHistory.item}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetIsolatedFilter}
              className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white border border-amber-300/30 text-xs font-extrabold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              title={isRtl ? 'إلغاء التصفية والرجوع للوضع السابق' : 'Return to previous state'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isRtl ? 'إلغاء العزل' : 'Remove Isolation'}</span>
            </button>
          </div>
        )}

        {/* Search Notice if filtering isolated record */}
        {isolatedFilterHistory && !drillDownHistory && (
          <div className="p-2.5 px-3.5 border-b border-slate-200/80 bg-amber-50/60 flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>{isRtl ? `عرض تفصيلي خاص بـ [${isolatedFilterHistory.item}]` : `Viewing isolated record for [${isolatedFilterHistory.item}]`}</span>
          </div>
        )}

        {/* Active Dynamic Filters Quick-Pills Strip */}
        {activeFilterTags.length > 0 && (
          <div className="px-3 py-2 bg-sky-50/60 border-b border-sky-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0 no-scrollbar">
              <span className="font-bold text-[#0A3D62] shrink-0 flex items-center gap-1 text-[11px]">
                <Filter className="w-3 h-3 text-[#0A3D62]" />
                <span>{isRtl ? 'الفلاتر النشطة:' : 'Active:'}</span>
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {activeFilterTags.map(({ col, val }, tagIdx) => (
                  <span
                    key={`filter-tag-${col}-${val}-${tagIdx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-sky-200/80 text-slate-800 text-[11px] font-semibold shrink-0 shadow-2xs group"
                  >
                    <span className="text-slate-400 font-normal">{col}:</span>
                    <strong className="text-[#0A3D62]">{val}</strong>
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleFilter(col, val)}
                      className="p-0.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ms-0.5"
                      title={isRtl ? `إزالة فلتر ${val}` : `Remove ${val}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDynamicFilters({})}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200/70 px-2 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              {isRtl ? 'مسح الفلاتر' : 'Clear All'}
            </button>
          </div>
        )}

        {/* Interactive Row Action Hub (Filter or Drill-down) */}
        {activeRowAction && (
          <div className="relative border-b border-slate-200/80 bg-slate-50/90 py-2.5 px-3.5 pe-10 sm:pe-12 animate-fadeIn transition-all">
            {/* Cancel / Close button: top-left in Arabic (end-2.5 in RTL), top-right in English (end-2.5 in LTR) */}
            <button
              type="button"
              onClick={() => {
                setActiveRowAction(null);
                setShowDrillDownOptions(false);
              }}
              className="absolute top-2.5 end-2.5 p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title={isRtl ? 'إلغاء التحديد' : 'Cancel selection'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Item Info Box: Streamlined & Highly Legible */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#0A3D62] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Layers className="w-3.5 h-3.5 text-sky-300" />
                </div>
                <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                  <span className="text-xs text-slate-500 font-semibold">{activeRowAction.column}:</span>
                  <span className="text-sm font-black text-[#0A3D62] truncate max-w-[200px] sm:max-w-[340px]" title={activeRowAction.name}>
                    {activeRowAction.name}
                  </span>
                </div>
              </div>

              {/* The two action buttons side by side in a single line */}
              <div className="flex items-center gap-2 flex-nowrap shrink-0">
                {/* 1. Filter / Isolate button */}
                {isolatedFilterHistory?.item === activeRowAction.name && isolatedFilterHistory?.column === activeRowAction.column ? (
                  <button
                    type="button"
                    onClick={handleResetIsolatedFilter}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title={isRtl ? 'إلغاء عزل هذا العنصر والرجوع' : 'Return to full data view'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'رجوع' : 'Back'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFilterByItem(activeRowAction)}
                    className="px-3 py-1.5 rounded-xl bg-[#0A3D62] hover:bg-[#082f4d] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title={isRtl ? 'حصر وتصفية الشاشة بهذا العنصر فقط' : 'Isolate screen to this item'}
                  >
                    <Filter className="w-3.5 h-3.5 text-sky-300" />
                    <span>{isRtl ? 'عزل العنصر' : 'Isolate Item'}</span>
                  </button>
                )}

                {/* 2. Drill-down / Detail by button */}
                <button
                  type="button"
                  onClick={() => setShowDrillDownOptions(!showDrillDownOptions)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    showDrillDownOptions
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title={isRtl ? 'تفكيك هذا العنصر وتوزيعه حسب عمود آخر تختاره' : 'Break down this item by another column'}
                >
                  <Layers className={`w-3.5 h-3.5 ${showDrillDownOptions ? 'text-white' : 'text-[#0A3D62]'}`} />
                  <span>{isRtl ? 'تفصيل حسب' : 'Detail by'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDrillDownOptions ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Drill-down column pills */}
            {showDrillDownOptions && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 animate-fadeIn">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <span>{isRtl ? `تفكيك وتفصيل [${activeRowAction.name}] حسب:` : `Detail [${activeRowAction.name}] by:`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {allCandidateColumns
                    .filter((c: string) => c !== activeRowAction.column)
                    .map((colName: string, dIdx: number) => (
                      <button
                        key={`drill-${colName}-${dIdx}`}
                        type="button"
                        onClick={() => handleDrillDownTo(activeRowAction, colName)}
                        className="group px-2.5 py-1.5 bg-white hover:bg-[#0A3D62] hover:text-white text-slate-700 border border-slate-200 hover:border-[#0A3D62] rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        {getDimensionIcon(colName, 'text-slate-400 group-hover:text-white transition-colors')}
                        <span>{colName}</span>
                        <ChevronRight className={`w-3 h-3 opacity-50 group-hover:opacity-100 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contextual Table Header Toolbar (شريط أدوات الجدول المباشر أعلى رأس الجدول) */}
        <div className="px-3 sm:px-4 py-2 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {/* Right Side: Report Title & Count */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0 shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className="text-slate-400">📋</span>
              <span className="text-slate-500 font-semibold">{isRtl ? 'مبيعات:' : 'Sales of:'}</span>
              <span className="text-[#0A3D62] font-black">{effectiveAnalyzeColumn}</span>
              <span className="text-slate-600 font-mono text-xs bg-white border border-slate-200/90 px-2 py-0.5 rounded-lg shadow-2xs font-bold">
                {displayItems.length} {isRtl ? 'عنصر' : 'items'}
              </span>
              <span className="text-slate-400 font-normal text-xs hidden md:inline">
                ({filteredRows.length.toLocaleString()} {isRtl ? 'سجل مفحوص' : 'filtered rows'})
              </span>
            </div>

            {/* In Fullscreen mode, show live totals inline in toolbar */}
            {isTableFullscreen && canShowAnyMetric && (
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono shadow-2xs">
                {canShowQty && (
                  <span className="flex items-center gap-1 text-slate-700">
                    <span className="text-slate-400 font-sans text-[10.5px]">{isRtl ? 'الإجمالي' : 'Total'}:</span>
                    <strong className="text-[#0A3D62] font-black">{totalQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                  </span>
                )}
                {canShowQty && canShowValue && <span className="text-slate-200">|</span>}
                {canShowValue && (
                  <span className="flex items-center gap-1 text-emerald-800">
                    <strong className="font-black">{Math.round(totalValue).toLocaleString()} {t.egp}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Left Side: Single-Line Horizontally Scrollable Action Track (سطر واحد متحرك بسلاسة كاملة) */}
          {/* الترتيب: 1. فلاتر | 2. أعمدة | 3. تثبيت العمود | 4. ترتيب | 5. النسبة % | 6. كثافة | 7. نسخ | 8. تصدير */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth w-full sm:w-auto ms-auto shrink-0 max-w-full">
            {/* Group 1: Priority Navigation & Scope (ملء الشاشة، فلاتر، أعمدة، تثبيت) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 0. زر ملء الشاشة وتكبير النتيجة (Maximize / Fullscreen) - الأول قبل الفلاتر */}
              <button
                type="button"
                onClick={() => setIsTableFullscreen((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                  isTableFullscreen
                    ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={
                  isRtl
                    ? (isTableFullscreen ? 'تصغير واستعادة الحجم (Esc)' : 'ملء الشاشة وتكبير جدول النتيجة')
                    : (isTableFullscreen ? 'Exit Fullscreen (Esc)' : 'Maximize Results Table')
                }
              >
                {isTableFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
                <span className="hidden sm:inline">
                  {isTableFullscreen ? (isRtl ? 'تصغير' : 'Exit') : (isRtl ? 'ملء الشاشة' : 'Fullscreen')}
                </span>
              </button>

              {/* 1. الفلاتر (Priority #1) */}
              <button
                type="button"
                onClick={handleToggleFiltersTab}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                  activeDeckTab === 'filters' || activeFiltersCount > 0
                    ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={isRtl ? 'عرض / طي فلاتر البيانات' : 'Toggle Filters'}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{isRtl ? 'فلاتر' : 'Filters'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeFiltersCount > 0 ? 'bg-amber-400 text-slate-950 font-black' : activeDeckTab === 'filters' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeFiltersCount}
                </span>
              </button>

              {/* 3. الأعمدة (Priority #3) */}
              <button
                type="button"
                onClick={handleToggleColumnsTab}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                  activeDeckTab === 'columns'
                    ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={isRtl ? 'إدارة وتقسيم أعمدة الجدول' : 'Manage Columns & Sub-Groups'}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{isRtl ? 'أعمدة' : 'Columns'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeDeckTab === 'columns' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tableColumns.length}
                </span>
              </button>

              {/* 4. تثبيت العمود الأول أثناء التمرير الأفقي (Pin Column) */}
              <button
                type="button"
                onClick={() => setIsColumnPinned(!isColumnPinned)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                  isColumnPinned
                    ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={isRtl ? (isColumnPinned ? 'إلغاء تثبيت العمود (الرتبة والاسم)' : 'تثبيت العمود (الرتبة والاسم) عند التمرير الأفقي') : (isColumnPinned ? 'Unpin dimension column' : 'Pin dimension column')}
              >
                <Pin className={`w-3.5 h-3.5 ${isColumnPinned ? 'fill-current' : ''}`} />
                <span>{isRtl ? (isColumnPinned ? 'عمود مثبت' : 'تثبيت') : (isColumnPinned ? 'Pinned' : 'Pin')}</span>
              </button>
            </div>

            {/* Divider 1 */}
            <div className="h-5 w-px bg-slate-200/90 hidden sm:block shrink-0" />

            {/* Group 2: Display & Sort (ترتيب، نسبة، كثافة) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 5. فرز وترتيب الجدول (Quick Sort Trigger) */}
              <div className="relative inline-flex items-center shrink-0" data-dropdown-container>
                <button
                  ref={sortBtnRef}
                  type="button"
                  onClick={handleToggleSortMenu}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                    isSortMenuOpen
                      ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={isRtl ? 'فرز وترتيب بيانات الجدول' : 'Sort Table'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{isRtl ? 'ترتيب' : 'Sort'}</span>
                </button>

                {/* Floating portal dropdown (never clipped by horizontal scroll container) */}
                {isSortMenuOpen && sortMenuPos && createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      top: `${sortMenuPos.top}px`,
                      ...(sortMenuPos.right !== undefined ? { right: `${sortMenuPos.right}px` } : { left: `${sortMenuPos.left}px` }),
                      zIndex: 9999
                    }}
                    data-dropdown-container
                    className="w-48 bg-white border border-[#D9E1E8] rounded-xl shadow-2xl p-1 space-y-0.5 animate-fadeIn text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickSortChange('metric_desc');
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                        currentSortKey === 'metric_desc' ? 'bg-[#0A3D62] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isRtl ? 'الأعلى مبيعاً' : 'Top Sales'}</span>
                      <span>⬇</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleQuickSortChange('metric_asc');
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                        currentSortKey === 'metric_asc' ? 'bg-[#0A3D62] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isRtl ? 'الأقل مبيعاً' : 'Lowest Sales'}</span>
                      <span>⬆</span>
                    </button>

                    <div className="h-px bg-slate-100 my-0.5" />

                    <button
                      type="button"
                      onClick={() => {
                        handleQuickSortChange('alpha_asc');
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                        currentSortKey === 'alpha_asc' ? 'bg-[#0A3D62] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isRtl ? 'أبجدياً (أ - ي)' : 'Alphabetical (A - Z)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleQuickSortChange('alpha_desc');
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                        currentSortKey === 'alpha_desc' ? 'bg-[#0A3D62] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isRtl ? 'أبجدياً (ي - أ)' : 'Alphabetical (Z - A)'}</span>
                    </button>

                    <div className="h-px bg-slate-100 my-0.5" />

                    <button
                      type="button"
                      onClick={() => {
                        handleQuickSortChange('share_desc');
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full text-start px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                        currentSortKey === 'share_desc' ? 'bg-[#0A3D62] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isRtl ? 'حسب النسبة %' : 'By Share %'}</span>
                    </button>
                  </div>,
                  document.body
                )}
              </div>

              {/* 6. النسبة المئوية % Toggle */}
              {onTogglePercentage && canShowAnyMetric && (
                <button
                  type="button"
                  onClick={onTogglePercentage}
                  className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 text-xs font-bold whitespace-nowrap shrink-0 ${
                    showPercentage
                      ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={isRtl ? (showPercentage ? 'إخفاء عمود النسبة %' : 'إظهار عمود النسبة %') : (showPercentage ? 'Hide percentage %' : 'Show percentage %')}
                >
                  <Percent className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isRtl ? 'النسبة' : 'Share %'}</span>
                </button>
              )}

              {/* 7. زر قاعدة باريتو 80/20 (Pareto Principle) */}
              {canShowAnyMetric && (
                <button
                  type="button"
                  onClick={handleTogglePareto}
                  className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 text-xs font-bold whitespace-nowrap shrink-0 ${
                    isParetoActive
                      ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={
                    isRtl
                      ? (isParetoActive ? 'إلغاء تفعيل 80/20 (عرض كافة العناصر)' : 'تطبيق قاعدة باريتو 80/20 (عرض العناصر المحققة لأول 80% من الإجمالي)')
                      : (isParetoActive ? 'Disable 80/20 (Show all)' : 'Activate Pareto 80/20 Rule')
                  }
                >
                  <span className={`text-[10.5px] px-1.5 py-0.5 rounded-md font-black tracking-tight ${
                    isParetoActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>
                    80/20
                  </span>
                  {isParetoActive && paretoStats && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
                      {paretoStats.paretoCount}
                    </span>
                  )}
                </button>
              )}

              {/* 8. كثافة العرض (مريح / مضغوط) */}
              <button
                type="button"
                onClick={handleToggleDensity}
                className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 text-xs font-bold whitespace-nowrap shrink-0 ${
                  tableDensity === 'compact'
                    ? 'bg-[#0A3D62] border-[#0A3D62] text-white shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={isRtl ? (tableDensity === 'compact' ? 'الوضع المريح' : 'الوضع المكثف') : (tableDensity === 'compact' ? 'Comfortable Density' : 'Compact Density')}
              >
                <AlignJustify className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline">{tableDensity === 'compact' ? (isRtl ? 'مضغوط' : 'Compact') : (isRtl ? 'مريح' : 'Comfortable')}</span>
              </button>
            </div>

            {/* Divider 2 */}
            <div className="h-5 w-px bg-slate-200/90 hidden sm:block shrink-0" />

            {/* Group 3: Output & Export (نسخ وتصدير) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 8. نسخ الجدول للحافظة */}
              <button
                type="button"
                onClick={handleCopyTable}
                className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 text-xs font-bold whitespace-nowrap shrink-0 ${
                  copyStatus
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
                title={isRtl ? 'نسخ الجدول للحافظة (متوافق مع إكسيل وواتساب)' : 'Copy table to clipboard'}
              >
                {copyStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyStatus ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy')}</span>
              </button>

              {/* 8. تصدير إكسيل / CSV (Export Trigger) */}
              <div className="relative shrink-0" data-dropdown-container>
                <button
                  ref={exportBtnRef}
                  type="button"
                  onClick={handleToggleExportMenu}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap shrink-0 ${
                    showExportMenu
                      ? 'bg-slate-100 border-[#0A3D62] text-[#0A3D62]'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                  }`}
                  title={t.export}
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{isRtl ? 'تصدير' : 'Export'}</span>
                </button>

                {/* Floating portal dropdown (never clipped by horizontal scroll container) */}
                {showExportMenu && exportMenuPos && createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      top: `${exportMenuPos.top}px`,
                      ...(exportMenuPos.right !== undefined ? { right: `${exportMenuPos.right}px` } : { left: `${exportMenuPos.left}px` }),
                      zIndex: 99999
                    }}
                    data-dropdown-container
                    className="w-56 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 space-y-1 animate-fadeIn text-xs"
                  >
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-100 flex items-center gap-1.5">
                      <Download className="w-3 h-3 text-[#0A3D62]" />
                      <span>{isRtl ? 'تنسيق التصدير' : 'Export Format'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        exportResultsToExcel(
                          displayItems,
                          effectiveAnalyzeColumn,
                          hasDualMetrics && metric === 'value' ? effectiveSecondaryCol : effectivePrimaryCol,
                          effectiveAnalyzeColumn,
                          'Analysis_Report.xlsx',
                          effectivePrimaryCol,
                          hasDualMetrics ? effectiveSecondaryCol : undefined,
                          tableColumns
                        );
                      }}
                      className="w-full text-start p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 flex items-center gap-2.5 cursor-pointer transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 group-hover:text-emerald-950">{t.exportExcel}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Excel (.xlsx)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        exportResultsToCsv(
                          displayItems,
                          effectiveAnalyzeColumn,
                          'Analysis_Report.csv',
                          effectivePrimaryCol,
                          hasDualMetrics ? effectiveSecondaryCol : undefined,
                          tableColumns
                        );
                      }}
                      className="w-full text-start p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-950 flex items-center gap-2.5 cursor-pointer transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 group-hover:text-blue-950">{t.exportCsv}</span>
                        <span className="text-[10px] text-slate-400 font-normal">CSV (.csv)</span>
                      </div>
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel A: إدارة وتقسيم أعمدة الجدول (Columns Drawer) - مباشرة تحت شريط أدوات الجدول */}
        {activeDeckTab === 'columns' && (
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 animate-fadeIn space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-[#0A3D62]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isRtl ? 'أعمدة وتقسيمات الجدول' : 'Manage Table Columns & Sub-Groups'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDeckTab(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Primary Column */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    {isRtl ? 'العمود الرئيسي:' : 'Primary Column:'}
                  </label>
                  <select
                    value={tableColumns[0] || ''}
                    onChange={(e) => handleSwitchTableColumn(0, e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs font-bold py-2 px-3 pe-8 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <optgroup label={isRtl ? 'الأبعاد المقترحة' : 'Recommended Dimensions'}>
                      {allCandidateColumns.map((candidate, idx) => (
                        <option key={`drawer-cand-${candidate}-${idx}`} value={candidate}>{candidate}</option>
                      ))}
                    </optgroup>
                    {allAvailableColumns.filter((c) => !allCandidateColumns.includes(c)).length > 0 && (
                      <optgroup label={isRtl ? 'باقي أعمدة الشيت' : 'Other Columns'}>
                        {allAvailableColumns
                          .filter((c) => !allCandidateColumns.includes(c))
                          .map((candidate, idx) => (
                            <option key={`drawer-other-${candidate}-${idx}`} value={candidate}>{candidate}</option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Sub-Columns (Columns 2 to N) */}
                {tableColumns.slice(1).map((colVal, sIdx) => {
                  const actualColIndex = sIdx + 1;
                  return (
                    <div key={`sub-col-${actualColIndex}`} className="relative">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {isRtl ? `عمود فرعي ${actualColIndex}:` : `Sub-Column ${actualColIndex}:`}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={colVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              handleRemoveTableColumn(actualColIndex);
                            } else {
                              handleSwitchTableColumn(actualColIndex, val);
                            }
                          }}
                          className="w-full bg-slate-50 text-slate-900 text-xs font-bold py-2 px-3 pe-8 rounded-xl border border-slate-200 cursor-pointer"
                        >
                          {allAvailableColumns
                            .filter((c) => c === colVal || !tableColumns.includes(c))
                            .map((candidate, cIdx) => (
                              <option key={`sub-opt-${candidate}-${actualColIndex}-${cIdx}`} value={candidate}>{candidate}</option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveTableColumn(actualColIndex)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100 shrink-0"
                          title={isRtl ? 'حذف هذا العمود الفرعي' : 'Remove column'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Sub-Column Action Bar */}
              {remainingAddableColumns.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const nextCol = remainingAddableColumns[0];
                      if (nextCol) handleAddTableColumn(nextCol);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-[#0A3D62]/40 hover:border-[#0A3D62] bg-[#EAF3F8]/50 text-[#0A3D62] font-bold text-xs transition-all flex items-center justify-center cursor-pointer active:scale-98"
                  >
                    <span>{isRtl ? 'إضافة عمود' : 'Add Column'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Panel B: لوحة الفلاتر النشطة (Filters Drawer) - مباشرة تحت شريط أدوات الجدول */}
        {activeDeckTab === 'filters' && (
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 animate-fadeIn space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#0A3D62]" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {isRtl ? 'فلاتر البيانات' : 'Data Filters'}
                </h3>
                {activeFiltersCount > 0 && (
                  <span className="text-[11px] font-black text-[#0A3D62] bg-[#EAF3F8] px-2 py-0.5 rounded-full">
                    {isRtl ? `${activeFiltersCount} نشط` : `${activeFiltersCount} active`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedTerritory && (
                  <button
                    type="button"
                    onClick={onApplySavedTerritory}
                    className="px-2.5 py-1 rounded-lg bg-[#EAF3F8] hover:bg-sky-100 text-[#0A3D62] text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{savedTerritory.name || (isRtl ? 'منطقتي' : 'My Territory')}</span>
                  </button>
                )}
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrillDownHistory(null);
                      setIsolatedFilterHistory(null);
                      setActiveRowAction(null);
                      setShowDrillDownOptions(false);
                      onReset();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'مسح الكل' : 'Clear All'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDeckTab(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Cards List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayFilterColumns.map((colName: string, fIdx: number) => {
                const selectedVals = dynamicFilters[colName] || [];
                const hasSelection = selectedVals.length > 0;
                const samples = columnSamples[colName];

                return (
                  <div
                    key={`filter-card-${colName}-${fIdx}`}
                    onClick={() => setActiveFilterCol(colName)}
                    className={`p-2.5 rounded-xl border text-start transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                      hasSelection
                        ? 'bg-[#EAF3F8] border-[#0A3D62]/40 text-[#0A3D62] font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg shrink-0 ${hasSelection ? 'bg-[#0A3D62]/10 text-[#0A3D62]' : 'bg-slate-100 text-slate-500'}`}>
                        {getDimensionIcon(colName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold truncate text-slate-900">{colName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                            hasSelection ? 'bg-[#0A3D62] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {hasSelection
                              ? selectedVals.length === 1
                                ? selectedVals[0]
                                : `${selectedVals.length} ${isRtl ? 'محدد' : 'selected'}`
                              : (isRtl ? 'الكل' : 'All')}
                          </span>
                        </div>

                        {/* Removable chips for active selections right on the card */}
                        {hasSelection && (
                          <div className="flex items-center gap-1 flex-wrap mt-1.5" onClick={(e) => e.stopPropagation()}>
                            {selectedVals.slice(0, 3).map((val, vIdx) => (
                              <span
                                key={`chip-${colName}-${val}-${vIdx}`}
                                className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-white text-[#0A3D62] border border-[#0A3D62]/30 px-1.5 py-0.5 rounded-md shadow-2xs"
                              >
                                <span className="truncate max-w-[110px]">{val}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSingleFilter(colName, val)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                                  title={isRtl ? `إزالة فلتر ${val}` : `Remove ${val}`}
                                >
                                  <X className="w-2.5 h-2.5 stroke-[2.5]" />
                                </button>
                              </span>
                            ))}
                            {selectedVals.length > 3 && (
                              <span className="text-[10px] text-slate-500 font-bold px-1">
                                +{selectedVals.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {!hasSelection && samples && samples.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5" title={samples.join('، ')}>
                            <span className="text-slate-500 font-medium">{isRtl ? 'مثال: ' : 'e.g. '}</span>
                            {samples.join('، ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {hasSelection && (
                        <button
                          type="button"
                          onClick={() => {
                            setDynamicFilters((prev) => {
                              const next = { ...prev };
                              delete next[colName];
                              return next;
                            });
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-200/70 active:scale-95 shadow-2xs"
                          title={isRtl ? `حذف وتصفير فلتر ${colName}` : `Clear filter ${colName}`}
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isRtl ? 'حذف' : 'Clear'}</span>
                        </button>
                      )}
                      {!hasSelection && onRemoveDimensionColumn && displayFilterColumns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveDimensionColumn(colName)}
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={isRtl ? `إزالة عمود ${colName} من قائمة الفلاتر` : `Remove ${colName} from filter list`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {unselectedAvailableColumns.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAddFilterOpen(true)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-[#0A3D62]/40 hover:border-[#0A3D62] bg-[#EAF3F8]/50 text-[#0A3D62] font-bold text-xs transition-all flex items-center justify-center cursor-pointer active:scale-98"
              >
                <span>{isRtl ? 'إضافة فلتر' : 'Add Filter'}</span>
              </button>
            )}

            <AddFilterColumnModal
              isOpen={isAddFilterOpen}
              onClose={() => setIsAddFilterOpen(false)}
              availableColumns={unselectedAvailableColumns}
              onSelectColumn={(col) => onAddDimensionColumn && onAddDimensionColumn(col)}
              onSelectColumns={(cols) => cols.forEach((c) => onAddDimensionColumn && onAddDimensionColumn(c))}
              lang={lang}
              dimensions={sheetAnalysis?.dimensions}
              rows={rows}
            />
          </div>
        )}

        {/* Table Content (Displays comfortably, or fills screen in fullscreen mode) */}
        <div
          className={`overflow-auto transition-all duration-300 ${
            isTableFullscreen
              ? 'flex-1 h-full max-h-none'
              : displayItems.length >= 8
              ? 'h-[415px] max-h-[415px]'
              : 'h-auto'
          }`}
          onScroll={handleTableScroll}
        >
          {/* Sales Table */}
          <table className="w-full text-start text-xs sm:text-[13px] border-separate border-spacing-0 font-bold">
            <thead className="bg-[#EDF5FA] text-[#0A3D62] font-black sticky top-0 z-30 select-none shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <tr>
                {/* عمود الرتبة التنافسية نظيف وفارغ تماماً برأس رمادي هادئ */}
                <th className={`py-2 px-2 text-center whitespace-nowrap text-xs font-bold text-slate-400 w-11 min-w-[44px] max-w-[44px] border-b border-[#D4E3ED] border-e border-[#E2ECF3] sticky top-0 ${
                  isColumnPinned ? (isRtl ? 'right-0 z-50 bg-[#EDF5FA]' : 'left-0 z-50 bg-[#EDF5FA]') : 'z-30 bg-[#EDF5FA]'
                }`} aria-label={isRtl ? 'الرتبة والترتيب' : 'Rank'}>
                  &nbsp;
                </th>

                {/* أعمدة التصنيف (الاسم، المنطقة، المندوب، إلخ) في البداية */}
                {tableColumns.map((colName, cIndex) => {
                  const isSorted = sortColumn === colName;
                  const isPrimary = cIndex === 0;
                  return (
                    <th
                      key={`th-col-${colName}-${cIndex}`}
                      onClick={() => handleSort(colName)}
                      className={`py-2 px-3 text-start whitespace-nowrap cursor-pointer hover:bg-sky-100/60 transition-colors group border-b border-[#D4E3ED] sticky top-0 ${
                        cIndex < tableColumns.length - 1 || canShowQty || canShowValue || (showPercentage && canShowAnyMetric)
                          ? 'border-e border-[#E2ECF3]'
                          : ''
                      } ${
                        isColumnPinned && isPrimary
                          ? (isRtl ? 'right-[44px] z-50 bg-[#EDF5FA]' : 'left-[44px] z-50 bg-[#EDF5FA]')
                          : 'z-30 bg-[#EDF5FA]'
                      }`}
                      title={
                        isRtl
                          ? isSorted
                            ? sortOrder === 'asc'
                              ? `مرتب تصاعدياً حسب ${colName} - انقر للترتيب تنازلياً`
                              : `مرتب تنازلياً حسب ${colName} - انقر للترتيب تصاعدياً`
                            : `انقر للترتيب حسب ${colName}`
                          : `Click to sort by ${colName}`
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        {getDimensionIcon(colName, isSorted ? 'text-[#0A3D62]' : 'text-slate-500')}
                        <span className={isSorted ? 'text-[#0A3D62] font-black' : ''}>{colName}</span>
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTableColumn(cIndex);
                            }}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer ms-0.5"
                            title={isRtl ? `حذف عمود ${colName}` : `Remove column ${colName}`}
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* عمود الكمية */}
                {canShowQty && (
                  <th
                    onClick={() => handleSort('qty')}
                    className={`py-2 px-3 text-end whitespace-nowrap hover:bg-sky-100/60 transition-colors cursor-pointer group border-b border-[#D4E3ED] sticky top-0 z-30 bg-[#EDF5FA] ${
                      canShowValue || (showPercentage && canShowAnyMetric) ? 'border-e border-[#E2ECF3]' : ''
                    }`}
                    title={
                      isRtl
                        ? (sortColumn === 'qty' || (sortColumn === 'metric' && !(hasDualMetrics && metric === 'value')))
                          ? sortOrder === 'desc'
                            ? `مرتب تنازلياً حسب ${effectivePrimaryCol} - انقر للترتيب تصاعدياً`
                            : `مرتب تصاعدياً حسب ${effectivePrimaryCol} - انقر للترتيب تنازلياً`
                          : `انقر للترتيب حسب ${effectivePrimaryCol}`
                        : `Click to sort by ${effectivePrimaryCol}`
                    }
                  >
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <Package className="w-3.5 h-3.5 text-[#0A3D62] shrink-0" />
                      <span className="font-bold text-[#0A3D62]">{effectivePrimaryCol}</span>
                      {(sortColumn === 'qty' || (sortColumn === 'metric' && !(hasDualMetrics && metric === 'value'))) ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableShowQty(false);
                          persistCurrentTableSettings(tableColumns, false, tableShowValue, effectiveAnalyzeColumn);
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer ms-0.5"
                        title={isRtl ? 'إخفاء هذا العمود من الجدول' : 'Hide column'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}

                {/* عمود القيمة */}
                {canShowValue && (
                  <th
                    onClick={() => handleSort('value')}
                    className={`py-2 px-3 text-end whitespace-nowrap hover:bg-emerald-100/60 transition-colors cursor-pointer group border-b border-[#D4E3ED] sticky top-0 z-30 bg-[#EDF5FA] ${
                      showPercentage && canShowAnyMetric ? 'border-e border-[#E2ECF3]' : ''
                    }`}
                    title={
                      isRtl
                        ? (sortColumn === 'value' || (sortColumn === 'metric' && hasDualMetrics && metric === 'value'))
                          ? sortOrder === 'desc'
                            ? `مرتب تنازلياً حسب ${effectiveSecondaryCol} - انقر للترتيب تصاعدياً`
                            : `مرتب تصاعدياً حسب ${effectiveSecondaryCol} - انقر للترتيب تنازلياً`
                          : `انقر للترتيب حسب ${effectiveSecondaryCol}`
                        : `Click to sort by ${effectiveSecondaryCol}`
                    }
                  >
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <Coins className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                      <span className="font-bold text-emerald-900">{effectiveSecondaryCol}</span>
                      {(sortColumn === 'value' || (sortColumn === 'metric' && hasDualMetrics && metric === 'value')) ? (
                        sortOrder === 'asc' ? (
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-800 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableShowValue(false);
                          persistCurrentTableSettings(tableColumns, tableShowQty, false, effectiveAnalyzeColumn);
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer ms-0.5"
                        title={isRtl ? 'إخفاء هذا العمود من الجدول' : 'Hide column'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}

                  {/* عمود النسبة % */}
                  {showPercentage && canShowAnyMetric && (
                    <th
                      onClick={() => handleSort('share')}
                      className="py-2 px-3 text-center whitespace-nowrap cursor-pointer hover:bg-sky-100/60 transition-colors group border-b border-[#D4E3ED] sticky top-0 z-30 bg-[#EDF5FA]"
                      title={isRtl ? 'انقر للترتيب حسب النسبة' : 'Click to sort by share'}
                    >
                      <div className="inline-flex items-center gap-1 justify-center">
                        {sortColumn === 'share' ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#0A3D62] stroke-[2.5]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        <span>
                          {percentageMode === 'col_vs_col' && percentageNumeratorCol && percentageDenominatorCol
                            ? `${percentageNumeratorCol} ÷ ${percentageDenominatorCol} %`
                            : isRtl ? 'النسبة %' : 'Share %'}
                        </span>
                      </div>
                    </th>
                  )}

                  {/* عمود إجراء التفكيك السريع */}
                  <th className="py-2 px-2 text-center whitespace-nowrap text-xs font-bold text-slate-500 w-24 border-b border-[#D4E3ED] sticky top-0 z-30 bg-[#EDF5FA]">
                    {isRtl ? 'تفكيك' : 'Breakdown'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF0F6] font-medium">
                {displayItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        1 +
                        tableColumns.length +
                        (canShowQty ? 1 : 0) +
                        (canShowValue ? 1 : 0) +
                        (showPercentage && canShowAnyMetric ? 1 : 0) +
                        1
                      }
                      className="text-center py-12 px-4 text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          {tableSearch ? (isRtl ? `لا توجد نتائج مطابقة لـ "${tableSearch}"` : `No results matching "${tableSearch}"`) : t.noSalesFound}
                        </p>
                        {tableSearch && (
                          <button
                            type="button"
                            onClick={() => setTableSearch('')}
                            className="mt-1 px-3 py-1.5 rounded-lg bg-[#0A3D62] text-white text-xs font-bold hover:bg-[#082f4d] transition-all cursor-pointer shadow-2xs"
                          >
                            {isRtl ? 'مسح نص البحث' : 'Clear search'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  renderedDisplayItems.map((item, rowIdx) => {
                    const share = metric === 'value' ? item.shareValue : item.shareQty;
                    const isSelected = activeRowAction?.name === item.name && activeRowAction?.column === effectiveAnalyzeColumn;

                    return (
                      <tr
                        key={`tbl-row-${item.id}-${rowIdx}`}
                        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 38px' }}
                        onClick={() => {
                          if (isSelected) {
                            setActiveRowAction(null);
                            setShowDrillDownOptions(false);
                          } else {
                            setActiveRowAction({
                              column: effectiveAnalyzeColumn,
                              name: item.name,
                              qty: item.qty,
                              value: item.value,
                              share
                            });
                            setShowDrillDownOptions(false);
                          }
                        }}
                        className={`transition-colors cursor-pointer select-none group border-b border-[#EDF2F7] ${
                          isSelected
                            ? 'bg-[#EBF3FA] text-[#0A3D62] font-bold'
                            : rowIdx % 2 === 1
                            ? 'bg-[#FAFCFE] hover:bg-[#F0F7FD]'
                            : 'bg-white hover:bg-[#F0F7FD]'
                        }`}
                        title={isRtl ? 'انقر لتصفية الشاشة بهذا العنصر أو التعمق فيه' : 'Click to filter or drill-down'}
                      >
                        {/* عمود الرتبة التنافسية #1 #2 #3 */}
                        <td className={`text-center font-mono text-xs ${tableDensity === 'compact' ? 'py-1.5 px-1' : 'py-2 px-1.5'} border-e border-[#EDF2F7] w-11 min-w-[44px] max-w-[44px] ${
                          isColumnPinned
                            ? `${isRtl ? 'sticky right-0' : 'sticky left-0'} z-20 ${
                                isSelected
                                  ? 'bg-[#EBF3FA]'
                                  : rowIdx % 2 === 1
                                  ? 'bg-[#FAFCFE] group-hover:bg-[#F0F7FD]'
                                  : 'bg-white group-hover:bg-[#F0F7FD]'
                              }`
                            : ''
                        }`}>
                          <span className="text-[11.5px] font-semibold font-mono text-slate-500 tabular-nums">
                            {rowIdx + 1}
                          </span>
                        </td>

                        {/* أعمدة التصنيف (الاسم، المنطقة، المندوب) في البداية */}
                        {(item.colValues && item.colValues.length === tableColumns.length
                          ? item.colValues
                          : [item.name]
                        ).map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`text-start ${
                              tableDensity === 'compact' ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-xs sm:text-[13px]'
                            } ${
                              cIdx === 0 ? 'font-bold text-slate-900' : 'text-slate-700 font-semibold'
                            } ${
                              cIdx < tableColumns.length - 1 || canShowQty || canShowValue || (showPercentage && canShowAnyMetric)
                                ? 'border-e border-[#EDF2F7]'
                                : ''
                            } ${
                              isColumnPinned && cIdx === 0
                                ? `${isRtl ? 'sticky right-[44px]' : 'sticky left-[44px]'} z-20 ${
                                    isSelected
                                      ? 'bg-[#EBF3FA]'
                                      : rowIdx % 2 === 1
                                      ? 'bg-[#FAFCFE] group-hover:bg-[#F0F7FD]'
                                      : 'bg-white group-hover:bg-[#F0F7FD]'
                                  }`
                                : ''
                            }`}
                          >
                            <div className="truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1.5" title={val}>
                              {cIdx === 0 && isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A3D62] shrink-0" />
                              )}
                              <span className="truncate">{val}</span>
                            </div>
                          </td>
                        ))}

                        {/* عمود الكمية مع بار بياني نسبي داخلي رقيق */}
                        {canShowQty && (
                          <td className={`relative overflow-hidden text-end font-mono font-bold tabular-nums text-slate-800 ${
                            tableDensity === 'compact' ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-[13px]'
                          } ${
                            canShowValue || (showPercentage && canShowAnyMetric) ? 'border-e border-[#EDF2F7]' : ''
                          }`}>
                            {/* Subtle in-cell performance bar */}
                            <div
                              className="absolute inset-y-0.5 end-0 bg-[#0A3D62]/8 rounded-s-md pointer-events-none transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, item.shareQty))}%` }}
                            />
                            <span className="relative z-1">{numFormatter.format(item.qty)}</span>
                          </td>
                        )}

                        {/* عمود القيمة مع بار بياني نسبي داخلي رقيق */}
                        {canShowValue && (
                          <td className={`relative overflow-hidden text-end font-mono font-bold tabular-nums text-emerald-950 ${
                            tableDensity === 'compact' ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-[13px]'
                          } ${
                            showPercentage && canShowAnyMetric ? 'border-e border-[#EDF2F7]' : ''
                          }`}>
                            {/* Subtle in-cell performance bar */}
                            <div
                              className="absolute inset-y-0.5 end-0 bg-emerald-500/10 rounded-s-md pointer-events-none transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, item.shareValue))}%` }}
                            />
                            <span className="relative z-1">{numFormatter.format(item.value)}</span>
                          </td>
                        )}

                        {/* عمود النسبة % بأرقام مجدولة نظيفة */}
                        {showPercentage && canShowAnyMetric && (
                          <td className={`text-center ${tableDensity === 'compact' ? 'py-1.5 px-2.5' : 'py-2 px-3'} border-e border-[#EDF2F7]`}>
                            <span className="font-mono font-black tabular-nums text-xs text-[#0A3D62]">
                              {(percentageMode === 'col_vs_col'
                                ? (item.customPercentage ?? 0)
                                : share
                              ).toFixed(1)}%
                            </span>
                          </td>
                        )}

                        {/* عمود زر التفكيك السريع */}
                        <td className={`text-center ${tableDensity === 'compact' ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRowAction({
                                column: effectiveAnalyzeColumn,
                                name: item.name,
                                qty: item.qty,
                                value: item.value,
                                share: metric === 'value' ? item.shareValue : item.shareQty
                              });
                              setShowDrillDownOptions(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-[#0A3D62] text-[#0A3D62] hover:text-white border border-sky-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                            title={isRtl ? `تفكيك وتفصيل [${item.name}]` : `Breakdown [${item.name}]`}
                          >
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{isRtl ? 'تفكيك' : 'Breakdown'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {canShowAnyMetric && displayItems.length > 0 && (
                <tfoot className="bg-[#EDF5FA] border-t-2 border-[#B9D5E8] text-[#0A3D62] font-black sticky bottom-0 z-20 select-none shadow-[0_-2px_8px_rgba(10,61,98,0.08)]">
                  <tr>
                    {/* كلمة الإجمالي تحت الأعمدة في البداية */}
                    <td
                      colSpan={isColumnPinned ? 2 : (1 + tableColumns.length)}
                      className={`font-black text-[#0A3D62] text-start ${
                        tableDensity === 'compact' ? 'py-2 px-3 text-xs' : 'py-3 px-3.5 text-sm'
                      } ${
                        canShowQty || canShowValue || (showPercentage && canShowAnyMetric) || (isColumnPinned && tableColumns.length > 1) ? 'border-e border-[#D4E3ED]' : ''
                      } ${
                        isColumnPinned ? `${isRtl ? 'sticky right-0' : 'sticky left-0'} z-30 bg-[#EDF5FA]` : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                        <span className="tracking-wide font-black text-[#0A3D62]">{isRtl ? 'الإجمالي العام' : 'Grand Total'}</span>
                        <span className="text-xs font-bold text-slate-500 font-sans hidden sm:inline">
                          ({displayItems.length} {isRtl ? 'بند' : 'items'})
                        </span>
                      </div>
                    </td>

                    {/* في حالة تثبيت العمود ووجود أعمدة تصنيف إضافية تمر تحت التثبيت */}
                    {isColumnPinned && tableColumns.length > 1 && (
                      <td
                        colSpan={tableColumns.length - 1}
                        className={`bg-[#EDF5FA] ${canShowQty || canShowValue || (showPercentage && canShowAnyMetric) ? 'border-e border-[#D4E3ED]' : ''}`}
                      />
                    )}

                    {/* إجمالي الكمية */}
                    {canShowQty && (
                      <td className={`text-end font-mono font-black tabular-nums text-[#0A3D62] ${
                        tableDensity === 'compact' ? 'py-2 px-3 text-xs' : 'py-3 px-3.5 text-sm'
                      } ${
                        canShowValue || (showPercentage && canShowAnyMetric) ? 'border-e border-[#D4E3ED]' : ''
                      }`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[#0A3D62] font-black">{totalQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                          <span className="text-xs font-sans font-bold text-slate-500">{effectivePrimaryCol}</span>
                        </div>
                      </td>
                    )}

                    {/* إجمالي القيمة */}
                    {canShowValue && (
                      <td className={`text-end font-mono font-black tabular-nums ${
                        tableDensity === 'compact' ? 'py-2 px-3 text-xs' : 'py-3 px-3.5 text-sm'
                      } ${
                        showPercentage && canShowAnyMetric ? 'border-e border-[#D4E3ED]' : ''
                      }`}>
                        <div className="inline-flex items-center gap-1.5 bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 px-2.5 py-1 rounded-lg shadow-2xs">
                          <Coins className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="font-black text-emerald-900">{Math.round(totalValue).toLocaleString()}</span>
                          <span className="text-xs font-sans font-bold text-emerald-700">{t.egp}</span>
                        </div>
                      </td>
                    )}

                    {/* إجمالي النسبة */}
                    {showPercentage && canShowAnyMetric && (
                      <td className={`text-center font-mono font-black tabular-nums text-[#0A3D62] ${
                        tableDensity === 'compact' ? 'py-2 px-2.5 text-xs' : 'py-3 px-3 text-sm'
                      } border-e border-[#D4E3ED]`}>
                        <span className="bg-sky-100/90 text-[#0A3D62] border border-sky-200/90 px-2 py-0.5 rounded-md">
                          {percentageMode === 'col_vs_col'
                            ? `${totalCustomPercentage.toFixed(1)}%`
                            : '100%'}
                        </span>
                      </td>
                    )}

                    {/* عمود فارغ يقابل زر التفكيك في الفوتر */}
                    <td className={`text-center ${tableDensity === 'compact' ? 'py-2 px-1.5' : 'py-3 px-2'}`} />
                  </tr>
                </tfoot>
              )}
            </table>
        </div>
      </div>

      {/* MULTI-SELECT MODAL (Handles any active dynamic column filter!) */}
      {activeFilterCol && (
        <MultiSelectModal
          isOpen={Boolean(activeFilterCol)}
          onClose={() => setActiveFilterCol(null)}
          title={`${t.filterByLabel} ${activeFilterCol}`}
          options={activeModalOptions}
          selectedValues={dynamicFilters[activeFilterCol] || []}
          onChange={(newVals) => {
            setDynamicFilters((prev) => ({
              ...prev,
              [activeFilterCol]: newVals
            }));
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
