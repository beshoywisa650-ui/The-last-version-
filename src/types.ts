export type TerritoryDimension = 'region' | 'branch' | 'address' | 'brick';
export type ProductDimension = 'brand' | 'product' | 'item';
export type MetricType = 'qty' | 'value' | 'both';
export type Language = 'ar' | 'en';
export type ParetoFilterMode = 'all' | 'top10' | 'pareto80';
export type NavTab = 'home' | 'analyze' | 'more';

export interface ColumnClassification {
  name: string;
  type: 'dimension' | 'metric';
  semanticType?: 'region' | 'branch' | 'address' | 'brick' | 'rep' | 'supervisor' | 'customer' | 'brand' | 'product' | 'item' | 'qty' | 'value' | 'target' | 'other';
  sampleValues: string[];
  uniqueCount: number;
  isNumeric: boolean;
  score?: number;
}

export interface SheetAnalysisResult {
  dimensions: ColumnClassification[];
  metrics: ColumnClassification[];
  recommendedDimensions: string[];
  detectedQtyCol?: string;
  detectedValueCol?: string;
  detectedTargetCol?: string;
}

export type SheetMode = 'sales' | 'general';
export type PercentageMode = 'total_share' | 'col_vs_col';

export interface SavedSheetPreset {
  id: string;
  name: string;
  headersSignature: string;
  matchedColumns?: string[];
  activeDimensionColumns: string[];
  sheetType?: SheetMode;
  showPercentage?: boolean;
  percentageMode?: PercentageMode;
  percentageNumeratorCol?: string;
  percentageDenominatorCol?: string;
  showKpiCards?: boolean;
  qtyColumn: string;
  valueColumn?: string;
  targetColumn?: string;
  primaryMetricColumn?: string;
  secondaryMetricColumn?: string;
  defaultMetric: MetricType;
  enableTargetComparison?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface FilterDimension {
  id: string;        // e.g. 'region', 'branch', 'address', 'brick', 'customer', or raw col name
  label: string;     // Display title (e.g. 'المنطقة', 'المندوب', 'الصيدلية')
  column: string;    // Excel column key
  selected: string[];// Currently selected filter values ([] = All)
}

export interface DynamicFilterConfig {
  activeDimensionColumns: string[];
  sheetType?: SheetMode;
  showPercentage?: boolean;
  percentageMode?: PercentageMode;
  percentageNumeratorCol?: string;
  percentageDenominatorCol?: string;
  showKpiCards?: boolean;
  qtyColumn: string;
  valueColumn?: string;
  targetColumn?: string;
  primaryMetricColumn?: string;
  secondaryMetricColumn?: string;
  defaultMetric: MetricType;
  enableTargetComparison?: boolean;
}

export interface ColumnMapping {
  region: string;
  branch: string;
  address: string;
  brick: string;
  brand: string;
  product: string;
  item: string;
  qty: string;
  value?: string;
  target?: string;
  customerName?: string;
  customerCode?: string;
  repName?: string;
  supervisorName?: string;
}

export interface SalesRow {
  region: string;
  branch: string;
  address: string;
  brick: string;
  brand: string;
  product: string;
  item: string;
  qty: number;
  value: number;
  target?: number;
  raw?: Record<string, any>;
}

export interface TerritoryFilter {
  regions: string[]; // empty array = All
  branches: string[];
  addresses: string[];
  bricks: string[];
}

export interface SavedTerritory {
  id: string;
  name: string;
  createdAt: number;
  regions: string[];
  branches: string[];
  addresses: string[];
  bricks: string[];
}

export interface SavedAnalysis {
  id: string;
  name: string;
  createdAt: number;
  territory: TerritoryFilter;
  dimension: ProductDimension;
  focus: string; // 'all' or specific brand/product name
  metric: MetricType;
}

export interface AggregatedItem {
  id: string;
  name: string;
  subName?: string;
  extraValues?: Record<string, string>;
  colValues?: string[];
  qty: number;
  value: number;
  target?: number;
  shareQty: number; // 0 to 100
  shareValue: number; // 0 to 100
  customPercentage?: number; // Calculated custom percentage (e.g. col vs col)
  rowCount: number;
}

export interface TargetEntry {
  qty?: number;
  value?: number;
}

export interface TargetConfigStore {
  overallTargetQty?: number;
  overallTargetValue?: number;
  dimension?: string;
  targets: Record<string, TargetEntry>;
}

export interface TargetComparisonItem extends AggregatedItem {
  target: number;
  actual: number;
  achievementPct: number;
  gap: number;
  isAchieved: boolean;
}

export interface LoadedFileMeta {
  fileName: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  loadedAt: number;
  columns: string[];
  sheetNames: string[];
  fileSize?: number;
}

export interface RecentFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  loadedAt: number;
  lastOpenedAt?: number;
  columns: string[];
}

