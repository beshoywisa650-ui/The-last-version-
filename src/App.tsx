import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Language,
  SalesRow,
  LoadedFileMeta,
  ColumnMapping,
  MetricType,
  SavedTerritory,
  SavedAnalysis,
  SheetAnalysisResult,
  SavedSheetPreset,
  RecentFileItem,
  SheetMode,
  PercentageMode
} from './types';
import { getTranslation } from './utils/translations';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { HomeView } from './views/HomeView';
import { AnalyzeView } from './views/AnalyzeView';
import { MoreView } from './views/MoreView';
import { SavedTerritoryModal } from './components/SavedTerritoryModal';
import { AnalysisSettingsView } from './views/AnalysisSettingsView';
import { parseExcelFile } from './utils/excelParser';
import { generateSampleSalesData } from './utils/sampleData';
import {
  saveDatasetLocally,
  loadDatasetLocally,
  clearDatasetLocally,
  getSavedTerritory,
  saveTerritoryConfig,
  getSavedAnalyses,
  saveAnalysisConfig,
  deleteSavedAnalysis,
  getStoredLanguage,
  setStoredLanguage,
  saveSheetPreset,
  getSavedActiveSessionState,
  saveActiveSessionState,
  clearActiveSessionState,
  saveRecentFileRecord,
  getRecentFilesMetaList,
  loadRecentFileRecord,
  deleteRecentFileRecord,
  getSavedTableSettings,
  saveTableSettings
} from './utils/storage';
import { getHeadersSignature, smartClassifySheet } from './utils/smartClassifier';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CheckCircle2, AlertCircle, ChevronUp, LogOut } from 'lucide-react';
import {
  useBackModal,
  setGlobalTabBackHandler,
  setGlobalExitHandler,
  pushNavigationState,
  triggerBackAction,
  exitApp
} from './utils/backNavigation';

export default function App() {
  // Scroll to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Language & Direction
  const [lang, setLang] = useState<Language>('ar');
  const t = getTranslation(lang);

  // Active Navigation Tab
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // Loaded Dataset State
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [fileMeta, setFileMeta] = useState<LoadedFileMeta | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);

  // Recent Files List (Last 3 files max)
  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>(() => getRecentFilesMetaList());

  // Dynamic Dimensions & Filters
  const [activeDimensionColumns, setActiveDimensionColumns] = useState<string[]>([]);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string[]>>({});
  const [selectedAnalyzeColumn, setSelectedAnalyzeColumn] = useState<string>('');
  const [metric, setMetric] = useState<MetricType>('qty');
  const [primaryMetricCol, setPrimaryMetricCol] = useState<string>('');
  const [secondaryMetricCol, setSecondaryMetricCol] = useState<string>('');
  const [targetComparisonEnabled, setTargetComparisonEnabled] = useState(false);
  const [sheetType, setSheetType] = useState<SheetMode>('sales');
  const [showPercentage, setShowPercentage] = useState<boolean>(true);
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);
  const [percentageMode, setPercentageMode] = useState<PercentageMode>('total_share');
  const [percentageNumeratorCol, setPercentageNumeratorCol] = useState<string>('');
  const [percentageDenominatorCol, setPercentageDenominatorCol] = useState<string>('');

  // Sheet Analysis & Presets
  const [sheetAnalysis, setSheetAnalysis] = useState<SheetAnalysisResult | null>(null);
  const [currentMatchedPreset, setCurrentMatchedPreset] = useState<SavedSheetPreset | null>(null);
  const [isFilterWizardOpen, setIsFilterWizardOpen] = useState(false);
  const [presetAppliedBanner, setPresetAppliedBanner] = useState(false);
  const [pendingUploadedResult, setPendingUploadedResult] = useState<any>(null);

  // Saved Territory & Analyses
  const [savedTerritory, setSavedTerritory] = useState<SavedTerritory | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  // Modals & UI States
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Hook exit confirmation modal with device back button (highest priority)
  useBackModal(showExitConfirmModal, () => setShowExitConfirmModal(false), 'exit-confirm-modal', 60);

  // Loading indicator
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Notifications / Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Micro-toast for quick disabled-action feedback (1 second)
  const [microToast, setMicroToast] = useState<string | null>(null);
  const microToastTimeoutRef = useRef<any>(null);

  const triggerMicroToast = useCallback((text: string) => {
    if (microToastTimeoutRef.current) {
      clearTimeout(microToastTimeoutRef.current);
    }
    setMicroToast(text);
    microToastTimeoutRef.current = setTimeout(() => {
      setMicroToast(null);
    }, 1000);
  }, []);

  const lastBackPressTimeRef = useRef<number>(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Route guard: keep user on Home if no sheet is loaded
  useEffect(() => {
    if (currentTab === 'analyze' && (!fileMeta || rows.length === 0)) {
      setCurrentTab('home');
    }
  }, [currentTab, fileMeta, rows.length]);

  // Switch tabs and push history entry
  const handleNavigateTab = (tab: NavTab) => {
    if (tab === currentTab) return;
    if (tab === 'analyze' && (!fileMeta || rows.length === 0)) {
      triggerMicroToast(
        lang === 'ar' ? 'يرجى رفع شيت بيانات أولاً' : 'Please upload a data sheet first'
      );
      return;
    }
    if (tab !== 'home') {
      pushNavigationState(tab);
    }
    setCurrentTab(tab);
  };

  // Initialize root history state with a guard entry so first back press is always trapped
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (!window.history.state) {
          window.history.replaceState({ tab: 'home', _root: true }, '');
        }
        window.history.pushState({ tab: 'home', _homeGuard: true }, '');
      } catch (_) {}
    }
  }, []);

  // Register global back tab handler and double-tap exit guardian
  useEffect(() => {
    setGlobalTabBackHandler(() => {
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }
      return false;
    });

    setGlobalExitHandler(() => {
      if (currentTab === 'home') {
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2500) {
          // Confirmed double press within 2.5 seconds: trigger exit & modal
          exitApp();
          setShowExitConfirmModal(true);
        } else {
          lastBackPressTimeRef.current = now;
          try {
            window.history.pushState({ tab: 'home', _homeGuard: true }, '');
          } catch (_) {}
          showToast(
            lang === 'ar' ? 'اضغط رجوع مرة أخرى لتأكيد الخروج من التطبيق' : 'Press back again to exit the app',
            'success'
          );
        }
      }
    });

    return () => {
      setGlobalTabBackHandler(null);
      setGlobalExitHandler(null);
    };
  }, [currentTab, lang]);

  // Sync RTL/LTR with document element and restore session
  useEffect(() => {
    const savedLang = getStoredLanguage();
    setLang(savedLang);
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;

    // Load saved territory and analyses
    const st = getSavedTerritory();
    if (st) setSavedTerritory(st);
    setSavedAnalyses(getSavedAnalyses());

    // Refresh recent files list
    setRecentFiles(getRecentFilesMetaList());

    // Auto-restore previous sales dataset and analysis session
    loadDatasetLocally()
      .then((dataset) => {
        if (dataset && dataset.rows && dataset.rows.length > 0 && dataset.meta && dataset.mapping) {
          setRows(dataset.rows);
          setFileMeta(dataset.meta);
          setColumnMapping(dataset.mapping);

          const sessionState = getSavedActiveSessionState();
          if (sessionState) {
            if (sessionState.activeDimensionColumns && sessionState.activeDimensionColumns.length > 0) {
              setActiveDimensionColumns(sessionState.activeDimensionColumns);
            }
            if (sessionState.dynamicFilters) {
              setDynamicFilters(sessionState.dynamicFilters);
            }
            if (sessionState.selectedAnalyzeColumn) {
              setSelectedAnalyzeColumn(sessionState.selectedAnalyzeColumn);
            }
            if (sessionState.metric) {
              setMetric(sessionState.metric);
            }
            if (sessionState.targetComparisonEnabled !== undefined) {
              setTargetComparisonEnabled(sessionState.targetComparisonEnabled);
            }
            if (sessionState.currentMatchedPreset) {
              setCurrentMatchedPreset(sessionState.currentMatchedPreset);
            }
            if (sessionState.primaryMetricColumn !== undefined) {
              setPrimaryMetricCol(sessionState.primaryMetricColumn);
            } else if (dataset.mapping?.qty) {
              setPrimaryMetricCol(dataset.mapping.qty);
            }
            if (sessionState.secondaryMetricColumn !== undefined) {
              setSecondaryMetricCol(sessionState.secondaryMetricColumn);
            } else if (dataset.mapping?.value && dataset.mapping.value !== dataset.mapping.qty) {
              setSecondaryMetricCol(dataset.mapping.value);
            }
            if (sessionState.sheetType) {
              setSheetType(sessionState.sheetType);
            }
            if (sessionState.showPercentage !== undefined) {
              setShowPercentage(sessionState.showPercentage);
            }
            if (sessionState.showKpiCards !== undefined) {
              setShowKpiCards(sessionState.showKpiCards);
            }
          } else {
            // Setup dynamic default dimensions from restored columns
            const nonMetricCols = dataset.meta.columns.filter(
              c => c !== dataset.mapping?.qty && c !== dataset.mapping?.value
            );
            const initialCols = nonMetricCols.slice(0, 4);
            setActiveDimensionColumns(initialCols);
            setSelectedAnalyzeColumn(initialCols[0] || 'Product');
            if (dataset.mapping?.qty) {
              setPrimaryMetricCol(dataset.mapping.qty);
            }
            if (dataset.mapping?.value && dataset.mapping.value !== dataset.mapping.qty) {
              setSecondaryMetricCol(dataset.mapping.value);
            }
          }

          if (dataset.meta.columns) {
            try {
              const sampleRecords = dataset.rows.slice(0, 100).map(r => r.raw || {});
              const classified = smartClassifySheet(dataset.meta.columns, sampleRecords);
              setSheetAnalysis(classified);
            } catch (_) {}
          }
        }
      })
      .catch((err) => {
        console.warn('Could not restore previous dataset:', err);
      });

    // Scroll listener for floating Scroll-To-Top button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Persist working session state automatically across reloads
  useEffect(() => {
    if (rows.length > 0) {
      saveActiveSessionState({
        activeDimensionColumns,
        dynamicFilters,
        selectedAnalyzeColumn,
        metric,
        primaryMetricColumn: primaryMetricCol,
        secondaryMetricColumn: secondaryMetricCol,
        targetComparisonEnabled,
        sheetType,
        showPercentage,
        showKpiCards,
        currentMatchedPreset,
        lastUpdated: Date.now()
      });
    }
  }, [
    rows.length,
    activeDimensionColumns,
    dynamicFilters,
    selectedAnalyzeColumn,
    metric,
    primaryMetricCol,
    secondaryMetricCol,
    targetComparisonEnabled,
    sheetType,
    showPercentage,
    showKpiCards,
    currentMatchedPreset
  ]);

  const handleToggleLang = () => {
    const nextLang: Language = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    setStoredLanguage(nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  // Upload and parse an Excel or CSV file
  const handleUploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      showToast(
        lang === 'ar'
          ? 'صيغة الملف غير مدعومة. يرجى اختيار ملف Excel (.xlsx, .xls) أو CSV (.csv).'
          : 'Unsupported file format. Please choose an Excel (.xlsx, .xls) or CSV (.csv) file.',
        'error'
      );
      return;
    }

    if (file.size === 0) {
      showToast(
        lang === 'ar' ? 'الملف فارغ ولا يحتوي على بيانات.' : 'The selected file is empty.',
        'error'
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast(
        lang === 'ar'
          ? 'حجم الملف كبير جداً (الحد الأقصى 100 ميجابايت).'
          : 'File size too large (maximum 100 MB).',
        'error'
      );
      return;
    }

    setIsLoading(true);
    setLoadingMessage(t.readingFile);

    try {
      const result = await parseExcelFile(file);

      // Save to recent files vault (stores metadata + encrypted data for instant 1-click reload)
      await saveRecentFileRecord(result.meta, result.rows, result.mapping, result.analysisResult);
      setRecentFiles(getRecentFilesMetaList());

      if (result.matchedPreset) {
        setRows(result.rows);
        setFileMeta(result.meta);
        setColumnMapping(result.mapping);
        setActiveDimensionColumns(result.matchedPreset.activeDimensionColumns);
        setMetric(result.matchedPreset.defaultMetric);
        setTargetComparisonEnabled(Boolean(result.matchedPreset.enableTargetComparison));
        setSelectedAnalyzeColumn(
          result.matchedPreset.activeDimensionColumns[0] || 'Product'
        );
        setDynamicFilters({});
        setSheetAnalysis(result.analysisResult || null);
        setCurrentMatchedPreset(result.matchedPreset);
        setPresetAppliedBanner(true);

        if (result.matchedPreset.sheetType) {
          setSheetType(result.matchedPreset.sheetType);
        }
        if (result.matchedPreset.showPercentage !== undefined) {
          setShowPercentage(result.matchedPreset.showPercentage);
        }
        if (result.matchedPreset.percentageMode) {
          setPercentageMode(result.matchedPreset.percentageMode);
        }
        if (result.matchedPreset.percentageNumeratorCol) {
          setPercentageNumeratorCol(result.matchedPreset.percentageNumeratorCol);
        }
        if (result.matchedPreset.percentageDenominatorCol) {
          setPercentageDenominatorCol(result.matchedPreset.percentageDenominatorCol);
        }
        if (result.matchedPreset.showKpiCards !== undefined) {
          setShowKpiCards(result.matchedPreset.showKpiCards);
        } else {
          setShowKpiCards(result.matchedPreset.sheetType !== 'general');
        }

        const pCol =
          result.matchedPreset.primaryMetricColumn ||
          result.matchedPreset.qtyColumn ||
          result.mapping.qty ||
          '';
        const sCol =
          (result.matchedPreset.secondaryMetricColumn || result.matchedPreset.valueColumn) !== pCol
            ? (result.matchedPreset.secondaryMetricColumn || result.matchedPreset.valueColumn || '')
            : '';
        setPrimaryMetricCol(pCol);
        setSecondaryMetricCol(sCol);

        await saveDatasetLocally(result.rows, result.meta, result.mapping);

        setIsLoading(false);
        pushNavigationState('analyze');
        setCurrentTab('analyze');
        showToast(
          lang === 'ar'
            ? `⚡ تم تطبيق قالب الشيت (${result.matchedPreset.name}) بنجاح`
            : `⚡ Sheet preset (${result.matchedPreset.name}) applied`
        );
      } else {
        // Adapt dynamically to this sheet's columns
        const recommended = result.analysisResult?.recommendedDimensions || [];
        const nonMetricCols = result.meta.columns.filter(
          c => c !== result.mapping.qty && c !== result.mapping.value
        );
        const dynamicInitialCols = recommended.length > 0 ? recommended : nonMetricCols.slice(0, 4);

        const pCol =
          result.analysisResult?.detectedQtyCol ||
          result.mapping.qty ||
          (result.analysisResult?.metrics && result.analysisResult.metrics[0]?.name) ||
          '';
        const sCol =
          result.analysisResult?.detectedValueCol && result.analysisResult.detectedValueCol !== pCol
            ? result.analysisResult.detectedValueCol
            : (result.analysisResult?.metrics &&
               result.analysisResult.metrics.length > 1 &&
               result.analysisResult.metrics[1].name !== pCol
                ? result.analysisResult.metrics[1].name
                : '');
        setPrimaryMetricCol(pCol);
        setSecondaryMetricCol(sCol);
        if (!sCol) {
          setMetric('qty');
        }

        setRows(result.rows);
        setFileMeta(result.meta);
        setColumnMapping(result.mapping);
        setActiveDimensionColumns(dynamicInitialCols);
        setSelectedAnalyzeColumn(dynamicInitialCols[0] || nonMetricCols[0] || '');
        setDynamicFilters({});
        setSheetAnalysis(result.analysisResult || null);
        setCurrentMatchedPreset(null);

        await saveDatasetLocally(result.rows, result.meta, result.mapping);

        setIsLoading(false);
        pushNavigationState('analyze');
        setCurrentTab('analyze');
        showToast(
          lang === 'ar'
            ? 'تم تحميل وتحليل الملف بنجاح'
            : 'File loaded & analyzed successfully',
          'success'
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || t.couldNotReadFile, 'error');
    }
  };

  // Open Recent File by ID (Instant offline retrieval from IndexedDB)
  const handleOpenRecentFile = async (id: string) => {
    setIsLoading(true);
    setLoadingMessage(t.readingFile);

    try {
      const record = await loadRecentFileRecord(id);
      if (!record) {
        throw new Error(lang === 'ar' ? 'تعذر العثور على الملف المحفوظ' : 'File record not found');
      }

      setRows(record.rows);
      setFileMeta(record.meta);
      setColumnMapping(record.mapping);
      setSheetAnalysis(record.sheetAnalysis || null);

      const pCol =
        record.mapping?.qty ||
        record.sheetAnalysis?.detectedQtyCol ||
        (record.sheetAnalysis?.metrics && record.sheetAnalysis.metrics[0]?.name) ||
        '';
      const sCol =
        record.mapping?.value && record.mapping.value !== pCol
          ? record.mapping.value
          : (record.sheetAnalysis?.detectedValueCol && record.sheetAnalysis.detectedValueCol !== pCol
              ? record.sheetAnalysis.detectedValueCol
              : (record.sheetAnalysis?.metrics &&
                 record.sheetAnalysis.metrics.length > 1 &&
                 record.sheetAnalysis.metrics[1].name !== pCol
                  ? record.sheetAnalysis.metrics[1].name
                  : ''));
      setPrimaryMetricCol(pCol);
      setSecondaryMetricCol(sCol);
      if (!sCol) {
        setMetric('qty');
      }

      // Derive dynamic dimensions
      const recommended = record.sheetAnalysis?.recommendedDimensions || [];
      const nonMetricCols = record.meta.columns.filter(
        (c: string) => c !== record.mapping.qty && c !== record.mapping.value
      );
      const initialCols = recommended.length > 0 ? recommended : nonMetricCols.slice(0, 4);
      setActiveDimensionColumns(initialCols);
      setSelectedAnalyzeColumn(initialCols[0] || nonMetricCols[0] || '');
      setDynamicFilters({});

      await saveDatasetLocally(record.rows, record.meta, record.mapping);
      // Refresh recents to update loadedAt timestamp
      await saveRecentFileRecord(record.meta, record.rows, record.mapping, record.sheetAnalysis);
      setRecentFiles(getRecentFilesMetaList());

      setIsLoading(false);
      pushNavigationState('analyze');
      setCurrentTab('analyze');
      showToast(
        lang === 'ar' ? `تم فتح الملف: ${record.meta.fileName}` : `Opened: ${record.meta.fileName}`,
        'success'
      );
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Error opening file', 'error');
    }
  };

  // Delete Recent File Record
  const handleDeleteRecentFile = async (id: string) => {
    try {
      await deleteRecentFileRecord(id);
      setRecentFiles(getRecentFilesMetaList());
      showToast(lang === 'ar' ? 'تم حذف الملف من القائمة' : 'File removed from recent list', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error deleting file', 'error');
    }
  };

  // External File Bridge (Android Intent & Web File Handling)
  useEffect(() => {
    // 1. Android Native WebView Bridge: window.__handleIncomingFileFromAndroid(fileName, base64Data)
    (window as any).__handleIncomingFileFromAndroid = async (fileName: string, base64Data: string) => {
      try {
        setIsLoading(true);
        setLoadingMessage(lang === 'ar' ? `جاري فتح ${fileName}...` : `Opening ${fileName}...`);

        // Convert base64 string to Uint8Array
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], {
          type: fileName.endsWith('.csv')
            ? 'text/csv'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const file = new File([blob], fileName, { type: blob.type, lastModified: Date.now() });

        await handleUploadFile(file);
      } catch (err: any) {
        setIsLoading(false);
        showToast(err?.message || (lang === 'ar' ? 'تعذر فتح الملف المستلم' : 'Failed to open incoming file'), 'error');
      }
    };

    // 2. Web File Handling API (PWA LaunchQueue)
    if ('launchQueue' in window && typeof (window as any).launchQueue.setConsumer === 'function') {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        try {
          const fileHandle = launchParams.files[0];
          const file = await fileHandle.getFile();
          if (file) {
            await handleUploadFile(file);
          }
        } catch (err) {
          console.warn('PWA launchQueue file error:', err);
        }
      });
    }

    return () => {
      delete (window as any).__handleIncomingFileFromAndroid;
    };
  }, [lang]);

  // Handle Quick Setup Sheet submission
  const handleApplyFilterWizard = async (config: {
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
    tableColumns?: string[];
  }) => {
    setIsFilterWizardOpen(false);

    let currentMapping = columnMapping;
    let currentMeta = fileMeta;

    if (pendingUploadedResult) {
      const res = pendingUploadedResult;
      setRows(res.rows);
      setFileMeta(res.meta);
      setColumnMapping(res.mapping);
      currentMapping = res.mapping;
      currentMeta = res.meta;
      await saveDatasetLocally(res.rows, res.meta, res.mapping);
      setPendingUploadedResult(null);
    }

    setPrimaryMetricCol(config.primaryMetric || '');
    setSecondaryMetricCol(config.secondaryMetric || '');

    if (config.sheetType) {
      setSheetType(config.sheetType);
    }
    if (config.showPercentage !== undefined) {
      setShowPercentage(config.showPercentage);
    }
    if (config.showKpiCards !== undefined) {
      setShowKpiCards(config.showKpiCards);
    }
    if (config.percentageMode !== undefined) {
      setPercentageMode(config.percentageMode);
    }
    if (config.percentageNumeratorCol !== undefined) {
      setPercentageNumeratorCol(config.percentageNumeratorCol);
    }
    if (config.percentageDenominatorCol !== undefined) {
      setPercentageDenominatorCol(config.percentageDenominatorCol);
    }

    setActiveDimensionColumns(config.selectedColumns);
    setMetric(config.chosenMetric);
    setTargetComparisonEnabled(config.enableTarget);

    if (config.tableColumns && config.tableColumns.length > 0) {
      const curFKey = currentMeta ? `${currentMeta.fileName}_${currentMeta.fileSize}` : '';
      if (curFKey) {
        const existing = getSavedTableSettings(curFKey) || {};
        saveTableSettings(curFKey, {
          ...existing,
          tableColumns: config.tableColumns,
          selectedAnalyzeColumn: config.tableColumns[0]
        });
      }
      setSelectedAnalyzeColumn(config.tableColumns[0]);
    } else if (config.selectedColumns && config.selectedColumns.length > 0) {
      if (!selectedAnalyzeColumn || !config.selectedColumns.includes(selectedAnalyzeColumn)) {
        setSelectedAnalyzeColumn(config.selectedColumns[0]);
      }
    }

    setDynamicFilters((prevFilters) => {
      const nextFilters: Record<string, string[]> = {};
      const newSelectedColsSet = new Set(config.selectedColumns);

      Object.keys(prevFilters).forEach((colKey) => {
        if (newSelectedColsSet.has(colKey) && prevFilters[colKey]?.length > 0) {
          nextFilters[colKey] = prevFilters[colKey];
        }
      });

      return nextFilters;
    });

    if (config.saveAsPreset && currentMeta?.columns) {
      const preset: SavedSheetPreset = {
        id: Date.now().toString(),
        name: config.presetName || (lang === 'ar' ? (config.sheetType === 'general' ? 'قالب شيت عام' : 'قالب شيت مبيعات') : (config.sheetType === 'general' ? 'General Sheet Preset' : 'Sales Sheet Preset')),
        headersSignature: getHeadersSignature(currentMeta.columns),
        activeDimensionColumns: config.selectedColumns,
        sheetType: config.sheetType || 'sales',
        showPercentage: config.showPercentage !== undefined ? config.showPercentage : true,
        showKpiCards: config.showKpiCards !== undefined ? config.showKpiCards : true,
        percentageMode: config.percentageMode || 'total_share',
        percentageNumeratorCol: config.percentageNumeratorCol,
        percentageDenominatorCol: config.percentageDenominatorCol,
        qtyColumn: config.primaryMetric || currentMapping?.qty || 'QTY',
        valueColumn: config.secondaryMetric || currentMapping?.value,
        primaryMetricColumn: config.primaryMetric || currentMapping?.qty,
        secondaryMetricColumn: config.secondaryMetric || currentMapping?.value,
        targetColumn: currentMapping?.target,
        defaultMetric: config.chosenMetric,
        enableTargetComparison: config.enableTarget,
        updatedAt: Date.now()
      };
      saveSheetPreset(preset);
      setCurrentMatchedPreset(preset);
    }

    pushNavigationState('analyze');
    setCurrentTab('analyze');
    showToast(
      lang === 'ar' ? 'تم ضبط التحليل' : 'Analysis configured'
    );
  };

  // Handle demo dataset loading
  const handleLoadDemo = async () => {
    setIsLoading(true);
    setLoadingMessage(t.loadingDemo);

    try {
      const demo = generateSampleSalesData();

      setRows(demo.rows);
      setFileMeta(demo.meta);
      setColumnMapping(demo.mapping);
      setActiveDimensionColumns(['Region', 'Branch', 'Product', 'Item']);
      setSelectedAnalyzeColumn('Product');
      setDynamicFilters({ Branch: ['Fayoum'] });
      setMetric('qty');
      setTargetComparisonEnabled(false);
      setPresetAppliedBanner(false);

      await saveDatasetLocally(demo.rows, demo.meta, demo.mapping);
      await saveRecentFileRecord(demo.meta, demo.rows, demo.mapping);
      setRecentFiles(getRecentFilesMetaList());

      setIsLoading(false);
      pushNavigationState('analyze');
      setCurrentTab('analyze');
      showToast(lang === 'ar' ? 'تم تحميل البيانات التجريبية بنجاح' : 'Demo data loaded', 'success');
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Error loading demo data', 'error');
    }
  };

  // Remove active file
  const handleRemoveCurrentFile = async () => {
    try {
      await clearDatasetLocally();
      await clearActiveSessionState();
      setRows([]);
      setFileMeta(null);
      setColumnMapping(null);
      setActiveDimensionColumns([]);
      setDynamicFilters({});
      setSheetAnalysis(null);
      setCurrentMatchedPreset(null);
      setCurrentTab('home');
      showToast(lang === 'ar' ? 'تم إزالة الملف النشط' : 'Active file removed', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Apply Saved Territory
  const handleApplyMyTerritory = () => {
    if (!savedTerritory) return;

    setDynamicFilters((prev) => {
      const next = { ...prev };
      if (savedTerritory.regions.length > 0) next['Region'] = savedTerritory.regions;
      else delete next['Region'];

      if (savedTerritory.branches.length > 0) next['Branch'] = savedTerritory.branches;
      else delete next['Branch'];

      if (savedTerritory.addresses.length > 0) next['Address'] = savedTerritory.addresses;
      else delete next['Address'];

      if (savedTerritory.bricks.length > 0) next['Brick'] = savedTerritory.bricks;
      else delete next['Brick'];

      return next;
    });

    setIsTerritoryModalOpen(false);
    pushNavigationState('analyze');
    setCurrentTab('analyze');
    showToast(lang === 'ar' ? 'تم تطبيق فلاتر المنطقة' : 'Territory filters applied', 'success');
  };

  // Save Territory Config
  const handleSaveTerritoryName = (name: string) => {
    const config: SavedTerritory = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      regions: dynamicFilters['Region'] || [],
      branches: dynamicFilters['Branch'] || [],
      addresses: dynamicFilters['Address'] || [],
      bricks: dynamicFilters['Brick'] || []
    };
    saveTerritoryConfig(config);
    setSavedTerritory(config);
    setIsTerritoryModalOpen(false);
    showToast(lang === 'ar' ? 'تم حفظ المنطقة بنجاح' : 'Territory saved', 'success');
  };

  // Clear Saved Territory
  const handleClearSavedTerritory = () => {
    localStorage.removeItem('tsa_my_territory_v1');
    setSavedTerritory(null);
    showToast(lang === 'ar' ? 'تم حذف المنطقة' : 'Territory deleted', 'success');
  };

  // Save Analysis Snapshot
  const handleSaveAnalysis = (name: string) => {
    const newAnalysis: SavedAnalysis = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      territory: {
        regions: dynamicFilters['Region'] || [],
        branches: dynamicFilters['Branch'] || [],
        addresses: dynamicFilters['Address'] || [],
        bricks: dynamicFilters['Brick'] || []
      },
      dimension: (selectedAnalyzeColumn as any) || 'item',
      focus: 'all',
      metric
    };

    saveAnalysisConfig(newAnalysis);
    setSavedAnalyses(getSavedAnalyses());
    showToast(lang === 'ar' ? 'تم حفظ التحليل' : 'Analysis saved', 'success');
  };

  // Open Analysis Snapshot
  const handleOpenAnalysis = (analysis: SavedAnalysis) => {
    if (analysis.territory) {
      setDynamicFilters({
        ...(analysis.territory.regions?.length ? { Region: analysis.territory.regions } : {}),
        ...(analysis.territory.branches?.length ? { Branch: analysis.territory.branches } : {}),
        ...(analysis.territory.addresses?.length ? { Address: analysis.territory.addresses } : {}),
        ...(analysis.territory.bricks?.length ? { Brick: analysis.territory.bricks } : {})
      });
    }
    if (analysis.dimension) {
      setSelectedAnalyzeColumn(analysis.dimension);
    }
    if (analysis.metric) {
      setMetric(analysis.metric);
    }
    pushNavigationState('analyze');
    setCurrentTab('analyze');
    showToast(lang === 'ar' ? `تم فتح: ${analysis.name}` : `Opened: ${analysis.name}`, 'success');
  };

  // Delete Analysis Snapshot
  const handleDeleteAnalysis = (id: string) => {
    deleteSavedAnalysis(id);
    setSavedAnalyses(getSavedAnalyses());
    showToast(lang === 'ar' ? 'تم حذف التحليل' : 'Analysis deleted', 'success');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#17212B] flex flex-col font-sans selection:bg-[#0A3D62] selection:text-white">
      {/* Offline Status Toast Indicator */}
      <OfflineIndicator lang={lang} />

      {/* Main Top Header - App Icon, Name, Opened File Name & Language Switcher */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        fileMeta={fileMeta}
        currentTab={currentTab}
        canGoBack={currentTab !== 'home' || isFilterWizardOpen}
        onBack={triggerBackAction}
        isFilterWizardOpen={isFilterWizardOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden pb-20 max-w-4xl mx-auto w-full px-2.5 sm:px-4">
        {isFilterWizardOpen && fileMeta && (
          <AnalysisSettingsView
            availableColumns={fileMeta.columns || []}
            dimensions={sheetAnalysis?.dimensions}
            metrics={sheetAnalysis?.metrics}
            recommendedDimensions={sheetAnalysis?.recommendedDimensions}
            detectedQtyCol={sheetAnalysis?.detectedQtyCol}
            detectedValueCol={sheetAnalysis?.detectedValueCol}
            detectedTargetCol={sheetAnalysis?.detectedTargetCol}
            initialSelectedColumns={
              activeDimensionColumns.length > 0
                ? activeDimensionColumns
                : sheetAnalysis?.recommendedDimensions || []
            }
            initialMetric={metric}
            initialPrimaryMetricCol={primaryMetricCol}
            initialSecondaryMetricCol={secondaryMetricCol}
            initialEnableTarget={targetComparisonEnabled}
            initialSheetType={sheetType}
            initialShowPercentage={showPercentage}
            initialShowKpiCards={showKpiCards}
            initialPercentageMode={percentageMode}
            initialPercentageNumeratorCol={percentageNumeratorCol}
            initialPercentageDenominatorCol={percentageDenominatorCol}
            initialTableColumns={
              fileMeta
                ? getSavedTableSettings(`${fileMeta.fileName}_${fileMeta.fileSize}`)?.tableColumns
                : undefined
            }
            matchedPreset={currentMatchedPreset}
            rows={rows}
            onApply={(selectedCols, chosenMetric, enableTarget, saveAsPreset, presetName, pMetric, sMetric, sType, sPct, sKpis, pMode, pNumCol, pDenCol, tblCols) => {
              handleApplyFilterWizard({
                selectedColumns: selectedCols,
                chosenMetric,
                enableTarget,
                saveAsPreset,
                presetName,
                primaryMetric: pMetric,
                secondaryMetric: sMetric,
                sheetType: sType,
                showPercentage: sPct,
                showKpiCards: sKpis,
                percentageMode: pMode,
                percentageNumeratorCol: pNumCol,
                percentageDenominatorCol: pDenCol,
                tableColumns: tblCols
              });
            }}
            onCancel={() => {
              setIsFilterWizardOpen(false);
              setPendingUploadedResult(null);
              pushNavigationState('analyze');
              setCurrentTab('analyze');
            }}
            lang={lang}
          />
        )}

        <div className={!isFilterWizardOpen && currentTab === 'home' ? 'block' : 'hidden'}>
          <HomeView
            lang={lang}
            fileMeta={fileMeta}
            recentFiles={recentFiles}
            onUploadFile={handleUploadFile}
            onOpenRecentFile={handleOpenRecentFile}
            onDeleteRecentFile={handleDeleteRecentFile}
            onOpenCurrentFile={() => handleNavigateTab('analyze')}
            onRemoveCurrentFile={handleRemoveCurrentFile}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            onLoadDemoData={handleLoadDemo}
          />
        </div>

        {fileMeta && rows.length > 0 && (
          <div className={!isFilterWizardOpen && currentTab === 'analyze' ? 'block' : 'hidden'}>
            <AnalyzeView
              lang={lang}
              rows={rows}
              fileMeta={fileMeta}
              activeDimensionColumns={activeDimensionColumns}
              dynamicFilters={dynamicFilters}
              setDynamicFilters={setDynamicFilters}
              selectedAnalyzeColumn={selectedAnalyzeColumn}
              setSelectedAnalyzeColumn={setSelectedAnalyzeColumn}
              metric={metric}
              setMetric={setMetric}
              primaryMetricCol={primaryMetricCol}
              secondaryMetricCol={secondaryMetricCol}
              setPrimaryMetricCol={setPrimaryMetricCol}
              setSecondaryMetricCol={setSecondaryMetricCol}
              sheetAnalysis={sheetAnalysis}
              showPercentage={showPercentage}
              showKpiCards={showKpiCards}
              percentageMode={percentageMode}
              percentageNumeratorCol={percentageNumeratorCol}
              percentageDenominatorCol={percentageDenominatorCol}
              onTogglePercentage={() => setShowPercentage((prev) => !prev)}
              onOpenWizard={() => setIsFilterWizardOpen(true)}
              savedTerritory={savedTerritory}
              onSaveTerritory={() => setIsTerritoryModalOpen(true)}
              onApplySavedTerritory={handleApplyMyTerritory}
              onSaveAnalysis={handleSaveAnalysis}
              onReset={() => setDynamicFilters({})}
              presetAppliedBanner={presetAppliedBanner}
              onDismissPresetBanner={() => setPresetAppliedBanner(false)}
              onAddDimensionColumn={(col) => {
                setActiveDimensionColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
              }}
              onRemoveDimensionColumn={(col) => {
                setActiveDimensionColumns((prev) => prev.filter((c) => c !== col));
                setDynamicFilters((prev) => {
                  const next = { ...prev };
                  delete next[col];
                  return next;
                });
              }}
              onApplySettings={(config) => {
                handleApplyFilterWizard(config);
              }}
              matchedPreset={currentMatchedPreset}
            />
          </div>
        )}

        <div className={!isFilterWizardOpen && currentTab === 'more' ? 'block' : 'hidden'}>
          <MoreView
            lang={lang}
            onToggleLang={handleToggleLang}
          />
        </div>
      </main>

      {/* Persistent Bottom Tab Navigation (الرئيسية / التحليل / المزيد) */}
      <Navigation
        currentTab={isFilterWizardOpen ? 'analyze' : currentTab}
        onSelectTab={(tab) => {
          if (isFilterWizardOpen) {
            setIsFilterWizardOpen(false);
          }
          handleNavigateTab(tab);
        }}
        lang={lang}
        hasFile={Boolean(fileMeta && rows.length > 0)}
        onDisabledTabClick={() => {
          triggerMicroToast(
            lang === 'ar' ? 'يرجى رفع شيت بيانات أولاً' : 'Please upload a data sheet first'
          );
        }}
      />

      {/* Saved Territory Modal */}
      <SavedTerritoryModal
        isOpen={isTerritoryModalOpen}
        onClose={() => setIsTerritoryModalOpen(false)}
        currentFilter={{
          regions: dynamicFilters['Region'] || [],
          branches: dynamicFilters['Branch'] || [],
          addresses: dynamicFilters['Address'] || [],
          bricks: dynamicFilters['Brick'] || []
        }}
        savedTerritory={savedTerritory}
        onSave={handleSaveTerritoryName}
        onApply={handleApplyMyTerritory}
        lang={lang}
      />

      {/* Micro-toast Feedback for Quick Disabled Feedback (1s auto-fade) */}
      {microToast && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-[#17212B]/95 text-white text-xs font-semibold shadow-lg backdrop-blur-sm animate-in fade-in duration-100 flex items-center gap-1.5 border border-slate-700/50">
            <span>{microToast}</span>
          </div>
        </div>
      )}

      {/* Global Toast Notification (Executive Dark Slate / Navy Palette) */}
      {toastMessage && (
        <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              toastMessage.type === 'success'
                ? 'bg-[#17212B] text-white border-slate-700/60 shadow-slate-950/20'
                : 'bg-rose-950 text-rose-100 border-rose-800/80 shadow-rose-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="tracking-tight">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog (Mobile & PWA Exit Guardian) */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 space-y-4 animate-in zoom-in-95 duration-150 text-start">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'ar' ? 'الخروج من التطبيق' : 'Exit Application'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {lang === 'ar' ? 'تأكيد إغلاق الجلسة' : 'Confirm leaving application'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? 'بياناتك وملفاتك محفوظة بأمان على جهازك. هل تريد الخروج من التطبيق الآن؟'
                : 'Your data and sheets are safely stored on your device. Do you want to exit now?'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all cursor-pointer bg-white"
              >
                {lang === 'ar' ? 'البقاء في التطبيق' : 'Stay in App'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  exitApp();
                  showToast(lang === 'ar' ? 'يمكنك الآن إغلاق الصفحة بأمان' : 'You can now safely close the tab', 'success');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تأكيد الخروج' : 'Exit Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll To Top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 end-4 z-40 w-10 h-10 rounded-full bg-[#0A3D62] text-white shadow-xl flex items-center justify-center hover:bg-[#1F6F9F] active:scale-90 transition-all cursor-pointer border border-white/20"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
