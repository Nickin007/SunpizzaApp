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
