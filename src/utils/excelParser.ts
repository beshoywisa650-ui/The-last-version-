import * as XLSX from 'xlsx';
import {
  SalesRow,
  LoadedFileMeta,
  ColumnMapping,
  SavedSheetPreset,
  SheetAnalysisResult,
  AggregatedItem
} from '../types';
import { getHeadersSignature, smartClassifySheet } from './smartClassifier';
import { getSavedSheetPresets } from './storage';

export interface ParseExcelResult {
  rows: SalesRow[];
  meta: LoadedFileMeta;
  mapping: ColumnMapping;
  analysisResult?: SheetAnalysisResult | null;
  matchedPreset?: SavedSheetPreset | null;
}

/**
 * Safely parse numbers from Excel / CSV strings or numbers:
 * - Handles accounting negative numbers wrapped in parentheses: (500.00) => -500
 * - Handles Eastern Arabic numerals: ١٥٠٠ => 1500
 * - Strips currency symbols, commas, spaces
 * - Returns clean number (fallback to 0)
 */
export function parseNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  // Convert Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹)
  str = str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  str = str.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  // Normalize Unicode minuses / dashes
  str = str.replace(/[−–—]/g, '-');
  // Accounting negative notation e.g. (1,234.50) or (500)
  const isAccountingNeg = /^\s*\(.*?\)\s*$/.test(str);
  str = str.replace(/[^\d.-]/g, '');
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (isAccountingNeg && num > 0) num = -num;
  return num;
}

/**
 * Sanitize cell values for CSV export to prevent Formula Injection (CSV Injection)
 * Prepend a single quote if string starts with dangerous characters: =, +, -, @, \t, \r
 */
export function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Parse an uploaded Excel or CSV file into structured sales data.
 */
export async function parseExcelFile(file: File, targetSheetName?: string): Promise<ParseExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: true
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('الملف فارغ أو لا يحتوي على أوراق عمل صالحة');
        }

        const sheetName =
          targetSheetName && workbook.SheetNames.includes(targetSheetName)
            ? targetSheetName
            : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('تعذر قراءة محتوى الشيت');
        }

        // Convert worksheet to JSON array of objects
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          raw: false
        });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('الشيت لا يحتوي على أي صفوف بيانات');
        }

        // Extract columns from headers or first row keys
        const columnsSet = new Set<string>();
        for (const row of rawJson.slice(0, 50)) {
          Object.keys(row).forEach((col) => {
            const trimmed = col.trim();
            if (trimmed && !trimmed.startsWith('__EMPTY')) {
              columnsSet.add(trimmed);
            }
          });
        }
        const columns = Array.from(columnsSet);

        // Smart Analysis of columns
        const analysisResult = smartClassifySheet(columns, rawJson.slice(0, 150));

        // Check if headers match a saved sheet preset
        const signature = getHeadersSignature(columns);
        const savedPresets = getSavedSheetPresets();
        const matchedPreset = savedPresets.find((p) => p.headersSignature === signature) || null;

        // Determine default column mapping
        const findCol = (terms: RegExp): string => {
          return columns.find((c) => terms.test(c.toLowerCase())) || '';
        };

        const firstDetectedMetricCol = analysisResult.metrics && analysisResult.metrics.length > 0 ? analysisResult.metrics[0].name : '';

        const qtyCol =
          matchedPreset?.primaryMetricColumn ||
          matchedPreset?.qtyColumn ||
          analysisResult.detectedQtyCol ||
          findCol(/qty|quantity|الكمية|كمية|مباع|عدد/) ||
          firstDetectedMetricCol ||
          '';

        const valCol =
          matchedPreset?.secondaryMetricColumn ||
          matchedPreset?.valueColumn ||
          analysisResult.detectedValueCol ||
          findCol(/val|value|مبلغ|قيمة|صافي|net|egp|سعر|price|cost|إجمالي/);

        const targetCol =
          matchedPreset?.targetColumn ||
          analysisResult.detectedTargetCol ||
          findCol(/target|تارجت|مستهدف|هدف/);

        const regionCol = findCol(/region|منطقة|محافظة/);
        const branchCol = findCol(/branch|فرع/);
        const addressCol = findCol(/address|عنوان|شارع|مدينة/);
        const brickCol = findCol(/brick|بريك|مربع/);
        const brandCol = findCol(/brand|ماركة|خط/);
        const prodCol = findCol(/product|item|صنف|منتج/);

        const mapping: ColumnMapping = {
          region: regionCol || columns[0] || '',
          branch: branchCol || columns[1] || '',
          address: addressCol || '',
          brick: brickCol || '',
          brand: brandCol || '',
          product: prodCol || columns[0] || '',
          item: prodCol || columns[0] || '',
          qty: qtyCol,
          value: valCol || undefined,
          target: targetCol || undefined
        };

        // Normalize rows into SalesRow structure using robust number parsing
        const rows: SalesRow[] = rawJson.map((r) => {
          const rawQty = r[qtyCol];
          const rawVal = valCol ? r[valCol] : undefined;
          const rawTarget = targetCol ? r[targetCol] : undefined;

          const numQty = parseNumericValue(rawQty);
          const numVal = rawVal !== undefined ? parseNumericValue(rawVal) : 0;
          const numTarget = rawTarget !== undefined && rawTarget !== '' ? parseNumericValue(rawTarget) : undefined;

          return {
            region: regionCol ? String(r[regionCol] || '').trim() : '',
            branch: branchCol ? String(r[branchCol] || '').trim() : '',
            address: addressCol ? String(r[addressCol] || '').trim() : '',
            brick: brickCol ? String(r[brickCol] || '').trim() : '',
            brand: brandCol ? String(r[brandCol] || '').trim() : '',
            product: prodCol ? String(r[prodCol] || '').trim() : '',
            item: prodCol ? String(r[prodCol] || '').trim() : '',
            qty: numQty,
            value: numVal,
            target: numTarget,
            raw: r
          };
        });

        const meta: LoadedFileMeta = {
          fileName: file.name,
          sheetName,
          rowCount: rows.length,
          columnCount: columns.length,
          loadedAt: Date.now(),
          columns,
          sheetNames: workbook.SheetNames,
          fileSize: file.size
        };

        resolve({
          rows,
          meta,
          mapping,
          analysisResult,
          matchedPreset
        });
      } catch (err: any) {
        reject(err || new Error('فشل معالجة ملف الإكسيل'));
      }
    };

    reader.onerror = () => {
      reject(new Error('تعذر قراءة ملف الإكسيل من الجهاز'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export analysis display items to Excel (.xlsx)
 */
export function exportResultsToExcel(
  items: AggregatedItem[],
  dimensionLabel: string,
  metricLabel: string,
  sheetNameOrCol?: string,
  filename: string = 'Analysis_Report.xlsx',
  primaryColName?: string,
  secondaryColName?: string,
  tableColumns?: string[]
): void {
  const isMultiCol = tableColumns && tableColumns.length > 1;

  const data = items.map((item, index) => {
    const row: Record<string, any> = {
      '#': index + 1
    };

    if (isMultiCol && item.colValues && item.colValues.length === tableColumns.length) {
      tableColumns.forEach((col, idx) => {
        row[col] = item.colValues![idx] || '—';
      });
    } else {
      row[dimensionLabel] = item.name;
    }

    row[primaryColName || 'الكمية (Qty)'] = item.qty;
    if (secondaryColName) {
      row[secondaryColName] = item.value;
    }
    row['النسبة % (Share)'] = `${item.shareQty.toFixed(1)}%`;
    row['عدد السجلات (Count)'] = item.rowCount;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetNameOrCol || 'Sales Analysis');
  XLSX.writeFile(wb, filename);
}

/**
 * Export analysis display items to CSV (.csv)
 */
export function exportResultsToCsv(
  items: AggregatedItem[],
  dimensionLabel: string,
  filename: string = 'Analysis_Report.csv',
  primaryColName: string = 'الكمية',
  secondaryColName?: string,
  tableColumns?: string[]
): void {
  const isMultiCol = tableColumns && tableColumns.length > 1;

  const headers = ['#'];
  if (isMultiCol) {
    tableColumns.forEach((col) => headers.push(sanitizeCsvCell(col)));
  } else {
    headers.push(sanitizeCsvCell(dimensionLabel));
  }
  headers.push(sanitizeCsvCell(primaryColName));
  if (secondaryColName) headers.push(sanitizeCsvCell(secondaryColName));
  headers.push(sanitizeCsvCell('النسبة %'), sanitizeCsvCell('عدد السجلات'));

  const rows = items.map((item, index) => {
    const cols: any[] = [index + 1];
    if (isMultiCol && item.colValues && item.colValues.length === tableColumns.length) {
      item.colValues.forEach((val) => cols.push(sanitizeCsvCell(val || '')));
    } else {
      cols.push(sanitizeCsvCell(item.name || ''));
    }
    cols.push(item.qty);
    if (secondaryColName) cols.push(item.value);
    cols.push(sanitizeCsvCell(`${item.shareQty.toFixed(1)}%`), item.rowCount);
    return cols.join(',');
  });

  // Prepend UTF-8 BOM for Excel Arabic compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
