import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Clock,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Language, LoadedFileMeta, RecentFileItem } from '../types';

interface HomeViewProps {
  lang: Language;
  fileMeta: LoadedFileMeta | null;
  recentFiles: RecentFileItem[];
  onUploadFile: (file: File) => void;
  onOpenRecentFile: (id: string) => void;
  onDeleteRecentFile: (id: string) => void;
  onOpenCurrentFile: () => void;
  onRemoveCurrentFile: () => void;
  isLoading: boolean;
  loadingMessage?: string;
  onLoadDemoData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lang,
  fileMeta,
  recentFiles,
  onUploadFile,
  onOpenRecentFile,
  onDeleteRecentFile,
  onOpenCurrentFile,
  onRemoveCurrentFile,
  isLoading,
  loadingMessage,
  onLoadDemoData
}) => {
  const isRtl = lang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getFileExtension = (name: string) => {
    const ext = name.split('.').pop()?.toUpperCase();
    return ext === 'CSV' ? 'CSV' : 'XLSX';
  };

  const eligibleFiles = recentFiles.slice(0, 8);
  const displayedFiles = showAllRecent ? eligibleFiles : eligibleFiles.slice(0, 3);
  const hasMoreThanThree = eligibleFiles.length > 3;

  return (
    <div className="w-full max-w-xl mx-auto py-3.5 sm:py-5 space-y-3 sm:space-y-3.5 font-sans selection:bg-[#0A3D62]/10 selection:text-[#0A3D62]">
      {/* 1. Active File Hero Card (Fully Clickable Card) */}
      {fileMeta && (
        <div
          onClick={onOpenCurrentFile}
          className="group bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-[#0A3D62]/40 shadow-2xs hover:shadow-xs p-3.5 sm:p-4.5 transition-all cursor-pointer active:scale-[0.99] select-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0A3D62]/10 group-hover:bg-[#0A3D62] text-[#0A3D62] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <FileSpreadsheet className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isRtl ? 'الملف الحالي قيد العمل' : 'Active Spreadsheet'}</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#0A3D62] truncate mt-0.5 transition-colors" title={fileMeta.fileName}>
                  {fileMeta.fileName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono mt-1 whitespace-nowrap">
                  <span>{fileMeta.rowCount.toLocaleString()} {isRtl ? 'صف' : 'rows'}</span>
                  <span className="text-slate-300 select-none">·</span>
                  <span>{fileMeta.columnCount} {isRtl ? 'عمود' : 'cols'}</span>
                  {fileMeta.fileSize ? (
                    <>
                      <span className="text-slate-300 select-none">·</span>
                      <span>{formatFileSize(fileMeta.fileSize)}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveCurrentFile();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title={isRtl ? 'إغلاق الملف' : 'Close file'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCurrentFile();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0A3D62] group-hover:bg-[#072C47] text-white text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isRtl ? 'متابعة التحليل' : 'Open Analysis'}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> : <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />}
            </button>
          </div>
        </div>
      )}

      {/* 2. Direct, Minimal Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative overflow-hidden rounded-2xl bg-white border-2 border-dashed transition-all duration-200 cursor-pointer select-none p-5 sm:p-6 text-center ${
          isDragOver
            ? 'border-[#0A3D62] bg-[#F4F9FD] scale-[1.01]'
            : 'border-slate-300 hover:border-[#0A3D62] hover:bg-slate-50/60 shadow-2xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#0A3D62] text-slate-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors duration-200">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 stroke-[1.8]" />
            )}
          </div>

          {isLoading ? (
            <div>
              <p className="text-sm sm:text-base font-bold text-[#0A3D62]">
                {loadingMessage || (isRtl ? 'جاري قراءة ومعالجة الملف...' : 'Processing file...')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm sm:text-base font-black text-slate-800 group-hover:text-[#0A3D62] transition-colors">
                {isRtl ? 'اضغط لاختيار ملف إكسيل' : 'Click to select spreadsheet'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                XLSX · XLS · CSV
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Recent Files (Clean, compact list) */}
      {recentFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 sm:p-4.5 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs sm:text-sm">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{isRtl ? 'الملفات الأخيرة' : 'Recent Files'}</span>
            </span>
            <span className="text-slate-400 font-mono text-xs">
              {recentFiles.length} {isRtl ? 'ملف' : 'files'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayedFiles.map((file) => (
              <div
                key={file.id}
                className="group flex items-center justify-between gap-3 py-3 px-1 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div
                  onClick={() => onOpenRecentFile(file.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#0A3D62] shrink-0 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-[#0A3D62] truncate transition-colors">
                      {file.fileName}
                    </p>
                    {file.lastOpenedAt && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {formatDate(file.lastOpenedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenRecentFile(file.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0A3D62] text-slate-700 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
                  >
                    {isRtl ? 'فتح' : 'Open'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecentFile(file.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                    title={isRtl ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMoreThanThree && (
            <div className="pt-1.5 text-center">
              <button
                type="button"
                onClick={() => setShowAllRecent(!showAllRecent)}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-500 hover:text-[#0A3D62] transition-colors cursor-pointer"
              >
                {showAllRecent ? (
                  <>
                    <span>{isRtl ? 'عرض أقل' : 'Show less'}</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>{isRtl ? `عرض الكل (${eligibleFiles.length})` : `Show all (${eligibleFiles.length})`}</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
