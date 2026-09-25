import { ColumnClassification, SheetAnalysisResult } from '../types';

/**
 * Generates a stable signature string representing the set of sheet headers.
 * Used to identify repeat templates or company preset schemas.
 */
export function getHeadersSignature(columns: string[]): string {
  if (!columns || columns.length === 0) return '';
  return columns
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('::');
}

/**
 * Patterns for identifying metric vs dimension columns and their semantic roles.
 */
const PATTERNS = {
  qty: /qty|quantity|كمية|الكمية|مباع|مبيعات_كمية|units|pieces|قطع|عدد|عددا|وحدات/i,
  value: /val|value|amount|مبلغ|المبلغ|قيمة|القيمة|صافي|net|egp|سعر|price|cost|إجمالي|اجمالي|total|revenue|sales/i,
  target: /target|تارجت|مستهدف|الهدف|الهدف_المطلوب|هدف|quota|budget/i,
  region: /region|منطقة|المنطقة|محافظة|المحافظة|territory|zone|governorate/i,
  branch: /branch|فرع|الفرع|outlet|store|مكتب/i,
  address: /address|عنوان|العنوان|شارع|مدينة|city|street|district|حي/i,
  brick: /brick|بريك|البريك|مربع|sector|area_code/i,
  rep: /rep|مندوب|المندوب|ممثل|sales_rep|agent|medical_rep|promoter/i,
  supervisor: /supervisor|مشرف|المشرف|manager|مدير|team_lead/i,
  customer: /customer|client|عميل|العميل|صيدلية|الصيدلية|pharmacy|doctor|طبيب|account/i,
  brand: /brand|ماركة|الماركة|خط|براند|line|manufacturer|company/i,
  product: /product|منتج|المنتج|صنف|الصنف|item_name|drug|medicine/i,
  item: /item|عنصر|pack|sku|كود_الصنف|form|strength/i,
};

/**
 * Classify columns in a sheet as Dimensions or Metrics, and detect primary metric columns.
 */
export function smartClassifySheet(
  columns: string[],
  sampleRows: Record<string, any>[]
): SheetAnalysisResult {
  const dimensions: ColumnClassification[] = [];
  const metrics: ColumnClassification[] = [];

  let detectedQtyCol: string | undefined;
  let detectedValueCol: string | undefined;
  let detectedTargetCol: string | undefined;

  for (const col of columns) {
    const rawColName = col.trim();
    if (!rawColName) continue;

    // Collect non-empty sample values
    const sampleValues: string[] = [];
    let numericCount = 0;
    let totalSamples = 0;

    for (const row of sampleRows) {
      if (row == null) continue;
      const rawVal = row[rawColName];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        const strVal = String(rawVal).trim();
        if (sampleValues.length < 5 && !sampleValues.includes(strVal)) {
          sampleValues.push(strVal);
        }
        totalSamples++;
        const cleanedVal = strVal.replace(/[,%\s$£€ج.م]/g, '');
        if (!isNaN(Number(cleanedVal)) && isFinite(Number(cleanedVal))) {
          numericCount++;
        }
      }
    }

    const isNumericRatio = totalSamples > 0 ? numericCount / totalSamples : 0;
    const isNumeric = isNumericRatio >= 0.75;
    const uniqueCount = new Set(sampleRows.map((r) => r[rawColName])).size;

    // Determine semantic type
    let semanticType: ColumnClassification['semanticType'] = 'other';
    const lowerName = rawColName.toLowerCase();

    if (PATTERNS.qty.test(lowerName)) {
      semanticType = 'qty';
    } else if (PATTERNS.target.test(lowerName)) {
      semanticType = 'target';
    } else if (PATTERNS.value.test(lowerName)) {
      semanticType = 'value';
    } else if (PATTERNS.rep.test(lowerName)) {
      semanticType = 'rep';
    } else if (PATTERNS.supervisor.test(lowerName)) {
      semanticType = 'supervisor';
    } else if (PATTERNS.customer.test(lowerName)) {
      semanticType = 'customer';
    } else if (PATTERNS.brand.test(lowerName)) {
      semanticType = 'brand';
    } else if (PATTERNS.product.test(lowerName)) {
      semanticType = 'product';
    } else if (PATTERNS.item.test(lowerName)) {
      semanticType = 'item';
    } else if (PATTERNS.region.test(lowerName)) {
      semanticType = 'region';
    } else if (PATTERNS.branch.test(lowerName)) {
      semanticType = 'branch';
    } else if (PATTERNS.address.test(lowerName)) {
      semanticType = 'address';
    } else if (PATTERNS.brick.test(lowerName)) {
      semanticType = 'brick';
    }

    // Classify as metric or dimension
    const isIdOrCode = /id|code|كود|رقم_|مفتاح|#|uuid/i.test(lowerName);
    const isExplicitMetric =
      semanticType === 'qty' || semanticType === 'value' || semanticType === 'target';

    if (isExplicitMetric || (isNumeric && !isIdOrCode && uniqueCount > 3)) {
      const colObj: ColumnClassification = {
        name: rawColName,
        type: 'metric',
        semanticType,
        sampleValues,
        uniqueCount,
        isNumeric: true
      };
      metrics.push(colObj);

      if (semanticType === 'qty' && !detectedQtyCol) {
        detectedQtyCol = rawColName;
      } else if (semanticType === 'value' && !detectedValueCol) {
        detectedValueCol = rawColName;
      } else if (semanticType === 'target' && !detectedTargetCol) {
        detectedTargetCol = rawColName;
      }
    } else {
      const colObj: ColumnClassification = {
        name: rawColName,
        type: 'dimension',
        semanticType,
        sampleValues,
        uniqueCount,
        isNumeric: false
      };
      dimensions.push(colObj);
    }
  }

  // Fallbacks if metric columns were not recognized by semantic pattern
  if (!detectedQtyCol && metrics.length > 0) {
    detectedQtyCol = metrics[0].name;
  }
  if (!detectedValueCol && metrics.length > 1) {
    detectedValueCol = metrics[1].name;
  }

  // Choose recommended dimensions: dimensions with reasonable cardinality (not 1 value, not completely unique ids)
  const recommendedDimensions = dimensions
    .filter((d) => d.uniqueCount >= 2 && d.name.toLowerCase() !== 'id')
    .slice(0, 4)
    .map((d) => d.name);

  // If no recommended dimensions found, take first few non-metric columns
  if (recommendedDimensions.length === 0 && dimensions.length > 0) {
    recommendedDimensions.push(...dimensions.slice(0, 3).map((d) => d.name));
  }

  return {
    dimensions,
    metrics,
    recommendedDimensions,
    detectedQtyCol,
    detectedValueCol,
    detectedTargetCol
  };
}
