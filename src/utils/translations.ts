import { Language } from '../types';

export interface Translations {
  home: string;
  analyze: string;
  more: string;
  readingFile: string;
  loadingDemo: string;
  couldNotReadFile: string;
  cancel: string;
  delete: string;
  confirmMapping: string;
  columnMappingTitle: string;
  columnMappingSubtitle: string;
  companyPresetBanner: string;
  modifyFilters: string;
  applyMyTerritory: string;
  reset: string;
  all: string;
  selectedCount: string;
  salesAnalysis: string;
  targetComparison: string;
  showingRows: string;
  egp: string;
  achievement: string;
  editTarget: string;
  achievedTarget: string;
  underTarget: string;
  actual: string;
  target: string;
  filterAllTargets: string;
  export: string;
  exportExcel: string;
  exportCsv: string;
  share: string;
  noSalesFound: string;
  filterByLabel: string;
  [key: string]: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    home: 'الرئيسية',
    analyze: 'التحليل',
    more: 'المزيد',
    readingFile: 'جاري قراءة الملف وتجهيز البيانات...',
    loadingDemo: 'جاري تحميل البيانات التجريبية...',
    couldNotReadFile: 'تعذر قراءة الملف. يرجى التأكد من صحة الملف وصيغته.',
    cancel: 'إلغاء',
    delete: 'حذف',
    confirmMapping: 'تأكيد الربط والمتابعة',
    columnMappingTitle: 'تحديد ومطابقة الأعمدة',
    columnMappingSubtitle: 'تأكد من مطابقة أعمدة ملفك للحصول على أدق تحليل وسرعة استجابة',
    companyPresetBanner: '⚡ تم تطبيق إعدادات وقالب الشيت تلقائياً',
    modifyFilters: 'تعديل الفلاتر',
    applyMyTerritory: 'تطبيق منطقتي المحفوظة',
    reset: 'إعادة ضبط الكل',
    all: 'الكل',
    selectedCount: 'تم تحديد ({n})',
    salesAnalysis: 'التحليل العام',
    targetComparison: 'التارجت والتحقيق',
    showingRows: 'سجل',
    egp: 'ج.م',
    achievement: 'نسبة التحقيق',
    editTarget: 'تعديل التارجت',
    achievedTarget: 'مُحقق للهدف 👍',
    underTarget: 'أقل من الهدف',
    actual: 'الفعلي',
    target: 'الهدف',
    filterAllTargets: 'جميع الأهداف',
    export: 'تصدير البيانات',
    exportExcel: 'تصدير إكسيل (Excel)',
    exportCsv: 'تصدير ملف (CSV)',
    share: 'النسبة %',
    noSalesFound: 'لا توجد بيانات مطابقة لخيارات الفلترة المحددة',
    filterByLabel: 'فلترة حسب',
  },
  en: {
    home: 'Home',
    analyze: 'Analyze',
    more: 'More',
    readingFile: 'Reading file and preparing data...',
    loadingDemo: 'Loading demo data...',
    couldNotReadFile: 'Could not read file. Please check file format.',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmMapping: 'Confirm Mapping',
    columnMappingTitle: 'Column Mapping',
    columnMappingSubtitle: 'Match your file columns for accurate data analysis',
    companyPresetBanner: '⚡ Sheet preset applied automatically',
    modifyFilters: 'Modify Filters',
    applyMyTerritory: 'Apply My Territory',
    reset: 'Reset All',
    all: 'All',
    selectedCount: 'Selected ({n})',
    salesAnalysis: 'General Analysis',
    targetComparison: 'Target & Achievement',
    showingRows: 'rows',
    egp: 'EGP',
    achievement: 'Achievement',
    editTarget: 'Edit Target',
    achievedTarget: 'Target Achieved 👍',
    underTarget: 'Below Target',
    actual: 'Actual',
    target: 'Target',
    filterAllTargets: 'All Targets',
    export: 'Export Data',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    share: 'Share %',
    noSalesFound: 'No matching records found for the selected filters',
    filterByLabel: 'Filter by',
  }
};

export const getTranslation = (lang: Language): Translations => {
  return translations[lang] || translations.ar;
};
