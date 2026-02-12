import request from '../utils/request';

// ==================== 类型定义 ====================

export interface PreviewResult {
  columns: string[];
  rows: any[][];
  total_rows: number;
}

export interface AggregateResult {
  columns: string[];
  rows: any[][];
  total_rows: number;
  unique_stores: number;
  unique_dates: number;
}

// ==================== 推广门店聚合 API ====================

/**
 * 上传Excel文件，返回原始数据全量预览
 */
export async function promoPreview(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ data: PreviewResult }>(
    '/excel-toolkit/promo-aggregate/preview',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

/**
 * 上传Excel文件，返回聚合后的JSON数据（用于结果预览）
 */
export async function promoAggregate(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ data: AggregateResult }>(
    '/excel-toolkit/promo-aggregate',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

/**
 * 传入聚合结果JSON，返回Excel文件blob供下载
 */
export async function promoAggregateExport(columns: string[], rows: any[][]) {
  return request.post(
    '/excel-toolkit/promo-aggregate/export',
    { columns, rows },
    { responseType: 'blob' }
  );
}

// ==================== 淘宝闪购运营核心指标 API ====================

export interface DateInfo {
  matched_dates: string[];
  missing_promo_dates: string[];
  sales_dates: string[];
  promo_dates: string[];
}

export interface KpiResult {
  columns: string[];
  rows: any[][];
  total_rows: number;
  unique_stores: number;
  unique_dates: number;
  date_info: DateInfo;
}

/**
 * 上传两个Excel文件，计算淘宝闪购运营核心指标
 */
export async function taobaoKpiCalculate(salesFile: File, promoFile: File) {
  const formData = new FormData();
  formData.append('sales_file', salesFile);
  formData.append('promo_file', promoFile);
  return request.post<{ data: KpiResult }>(
    '/excel-toolkit/taobao-kpi/calculate',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

/**
 * 传入计算结果JSON，返回Excel文件blob供下载
 */
export async function taobaoKpiExport(columns: string[], rows: any[][], dateInfo: DateInfo) {
  return request.post(
    '/excel-toolkit/taobao-kpi/export',
    { columns, rows, date_info: dateInfo },
    { responseType: 'blob' }
  );
}

// ==================== 一图看清当日运营 API ====================

export interface DashboardStoreRecord {
  date: string;
  store_name: string;
  // 12 original KPIs
  CR1: number | string;
  UC1: number | string;
  EC1: number | string;
  CV1: number | string;
  FC1: number | string;
  PC1: number | string;
  NC1: number | string;
  EA1: number | string;
  VA1: number | string;
  OA1: number | string;
  LV1: number | string;
  CT1: number | string;
  // 14 new metrics
  MR1: number | string;
  MR2: number | string;
  FQ1: number | string;
  FQ2: number | string;
  US1: number | string;
  US2: number | string;
  OH1: number | string;
  OH2: number | string;
  OH3: number | string;
  OH4: number | string;
  PE1: number | string;
  PE2: number | string;
  // Basic data
  revenue: number;
  valid_orders: number;
  avg_paid: number;
  exposure_count: number;
  store_score: number;
  store_rating: number;
  // Promo basic
  promo_cash: number;
  promo_total: number;
  exposure_boost: number;
  order_boost: number;
  [key: string]: any;
}

export interface DashboardMergeResult {
  records: DashboardStoreRecord[];
  dates: string[];
  total_records: number;
  total_stores: number;
}

/**
 * 上传3个Excel文件，合并数据用于运营看板
 */
export async function dailyDashboardMerge(
  kpiFile: File,
  salesFile: File,
  promoFile: File
) {
  const formData = new FormData();
  formData.append('kpi_file', kpiFile);
  formData.append('sales_file', salesFile);
  formData.append('promo_file', promoFile);
  return request.post<{ data: DashboardMergeResult }>(
    '/excel-toolkit/daily-dashboard/merge',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}
