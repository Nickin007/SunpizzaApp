/**
 * 饿了么数据分析API
 */

import http from '../utils/request';

// 数据类型定义
export interface ElemeStoreData {
  id: number;
  data_date: string;
  store_name: string;
  store_id: string;
  city: string;
  valid_orders: number;
  income: number;
  customer_payment_total: number;
  avg_payment_per_order: number;
  visit_conversion_rate: number;
  order_conversion_rate: number;
  store_score: number;
  good_rate_30d: number;
}

export interface ImportLog {
  id: number;
  batch_id: string;
  file_name: string;
  data_type: string; // 数据类型：store/order/product/review/growth/fans
  data_date: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  importer_name: string;
  created_at: string;
  completed_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
}

export interface FieldConfig {
  id: number;
  field_name: string;
  display_name: string;
  field_type: string;
  field_category: string;
  is_active: boolean;
  sort_order: number;
  description?: string;
}

export interface Statistics {
  total_orders: number;
  total_income: number;
  avg_order_payment: number;
  avg_store_score: number;
  store_count: number;
}

export interface StoreInfo {
  store_id: string;
  store_name: string;
  city: string;
}

const elemeApi = {
  // 上传Excel文件
  uploadExcel: (file: File, dataType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data_type', dataType);
    return http.post<{
      batch_id: string;
      total_rows: number;
      success_rows: number;
      failed_rows: number;
      data_date: string;
    }>('/eleme/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取导入日志
  getImportLogs: (page: number = 1, per_page: number = 20) =>
    http.get<{
      logs: ImportLog[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/import-logs', { params: { page, per_page } }),

  // 获取门店数据
  getStoreData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    store_id?: string;
    store_name?: string;
    city?: string;
  }) =>
    http.get<{
      data: ElemeStoreData[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/data', { params }),

  // 获取订单数据（食亨）
  getOrderData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    store_id?: string;
    store_name?: string;
    order_status?: string;
    order_id?: string;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/order-data', { params }),

  // 获取订单数据（饿了么）
  getOrderElemeData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    order_id?: string;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/order-eleme-data', { params }),

  // 获取商品数据
  getProductData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    city?: string;
    store_id?: string;
    store_name?: string;
    product_name?: string;
    is_new_product?: string;
    is_signature?: string;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/product-data', { params }),

  // 获取评价数据
  getReviewData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    city?: string;
    store_id?: string;
    store_name?: string;
    order_id?: string;
    min_score?: number;
    max_score?: number;
    is_counted_in_score?: string;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/review-data', { params }),

  // 获取商家成长数据
  getGrowthData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    province?: string;
    city?: string;
    store_id?: string;
    store_name?: string;
    l_level?: string;
    min_score?: number;
    max_score?: number;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/growth-data', { params }),

  // 获取粉丝群数据
  getFansData: (params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    city?: string;
    store_id?: string;
    store_name?: string;
  }) =>
    http.get<{
      data: any[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    }>('/eleme/fans-data', { params }),

  // 获取统计数据
  getStatistics: (params: {
    start_date?: string;
    end_date?: string;
    city?: string;
  }) =>
    http.get<Statistics>('/eleme/statistics', { params }),

  // 获取城市列表
  getCities: () =>
    http.get<{ cities: string[] }>('/eleme/cities'),

  // 获取门店列表
  getStores: (city?: string) =>
    http.get<{ stores: StoreInfo[] }>('/eleme/stores', {
      params: city ? { city } : {},
    }),

  // 字段配置管理
  getFieldConfigs: (category?: string) =>
    http.get<{ fields: FieldConfig[] }>('/eleme/fields', {
      params: category ? { category } : {},
    }),

  createFieldConfig: (data: Partial<FieldConfig>) =>
    http.post<FieldConfig>('/eleme/fields', data),

  updateFieldConfig: (id: number, data: Partial<FieldConfig>) =>
    http.put<FieldConfig>(`/eleme/fields/${id}`, data),

  deleteFieldConfig: (id: number) =>
    http.delete(`/eleme/fields/${id}`),

  // 数据管理
  getDataDates: () =>
    http.get<{ dates: string[] }>('/eleme/data/dates'),

  deleteDataByDate: (date: string) =>
    http.delete<{ deleted_count: number; date: string }>(`/eleme/data/date/${date}`),

  deleteDataByBatch: (batchId: string) =>
    http.delete<{ deleted_count: number; batch_id: string; has_data: boolean }>(`/eleme/data/batch/${batchId}`),

  // 在营门店管理
  /**
   * 获取在营门店列表
   */
  getActiveStores: (params: {
    page?: number;
    per_page?: number;
    is_active?: boolean;
    search?: string;
  }) => {
    return http.get('/eleme/active-stores', { params });
  },

  /**
   * 创建在营门店
   */
  createActiveStore: (data: { store_name: string; is_active?: boolean }) => {
    return http.post('/eleme/active-stores', data);
  },

  /**
   * 更新在营门店
   */
  updateActiveStore: (storeId: number, data: { store_name?: string; is_active?: boolean }) => {
    return http.put(`/eleme/active-stores/${storeId}`, data);
  },

  /**
   * 删除在营门店
   */
  deleteActiveStore: (storeId: number) => {
    return http.delete(`/eleme/active-stores/${storeId}`);
  },

  /**
   * 批量创建在营门店
   */
  batchCreateActiveStores: (stores: string[]) => {
    return http.post('/eleme/active-stores/batch', { stores });
  },

  /**
   * 检查数据上传状态
   * @param date 日期 YYYY-MM-DD，可选，默认昨天
   */
  getDataUploadStatus: (date?: string) => {
    return http.get('/eleme/data-upload-status', { params: { date } });
  },

  /**
   * 获取异常监控数据
   * @param date 日期 YYYY-MM-DD，可选，默认昨天
   */
  getAnomalyMonitor: (date?: string) => {
    return http.get('/eleme/anomaly-monitor', { params: { date } });
  },

  /**
   * 获取异常门店详细列表
   * @param anomalyType 异常类型
   * @param date 日期 YYYY-MM-DD，可选，默认昨天
   */
  getAnomalyDetails: (anomalyType: string, date?: string) => {
    return http.get('/eleme/anomaly-details', { params: { anomaly_type: anomalyType, date } });
  },
};

export default elemeApi;

