import http from '../utils/request';

export interface AppliedStore {
  id: number;
  store_name: string;
  store_name_shiheng?: string;
  is_active: boolean;
  cost_analysis_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppliedStoresParams {
  page?: number;
  per_page?: number;
  search?: string;
  enabled_only?: boolean;
}

export interface AppliedStoresResponse {
  stores: AppliedStore[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface StoreSummary {
  total_stores: number;
  enabled_stores: number;
  disabled_stores: number;
}

// 源商品成本库相关接口
export interface SourceCostItem {
  id: number;
  source_product_name: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface SourceCostLibraryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
}

export interface SourceCostLibraryResponse {
  items: SourceCostItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// 映射商品库相关接口
export interface ProductMappingItem {
  id: number;
  parsed_product_name: string;
  source_product_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductMappingParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ProductMappingResponse {
  items: ProductMappingItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const costAnalysisApi = {
  // 获取应用门店列表
  getAppliedStores: (params?: AppliedStoresParams) => {
    return http.get<AppliedStoresResponse>('/cost-analysis/applied-stores', { params });
  },

  // 创建应用门店
  createAppliedStore: (data: {
    store_name: string;
    store_name_shiheng?: string;
    cost_analysis_enabled?: boolean;
  }) => {
    return http.post('/cost-analysis/applied-stores', data);
  },

  // 更新应用门店
  updateAppliedStore: (id: number, data: {
    store_name?: string;
    store_name_shiheng?: string;
    cost_analysis_enabled?: boolean;
  }) => {
    return http.put(`/cost-analysis/applied-stores/${id}`, data);
  },

  // 切换成本分析状态
  toggleCostAnalysis: (id: number) => {
    return http.put(`/cost-analysis/applied-stores/${id}/toggle`);
  },

  // 删除应用门店
  deleteAppliedStore: (id: number) => {
    return http.delete(`/cost-analysis/applied-stores/${id}`);
  },

  // 获取统计信息
  getSummary: () => {
    return http.get<StoreSummary>('/cost-analysis/applied-stores/summary');
  },

  // ==================== 源商品成本库 API ====================
  
  // 获取源商品成本库列表
  getSourceCostLibrary: (params?: SourceCostLibraryParams) => {
    return http.get<SourceCostLibraryResponse>('/cost-analysis/source-cost-library', { params });
  },

  // 创建源商品成本
  createSourceCost: (data: {
    source_product_name: string;
    cost: number;
  }) => {
    return http.post('/cost-analysis/source-cost-library', data);
  },

  // 更新源商品成本
  updateSourceCost: (id: number, data: {
    source_product_name?: string;
    cost?: number;
  }) => {
    return http.put(`/cost-analysis/source-cost-library/${id}`, data);
  },

  // 删除源商品成本
  deleteSourceCost: (id: number) => {
    return http.delete(`/cost-analysis/source-cost-library/${id}`);
  },

  // 获取类别列表
  getSourceCostCategories: () => {
    return http.get<{ categories: string[] }>('/cost-analysis/source-cost-library/categories');
  },

  // ==================== 映射商品库 API ====================
  
  // 获取映射商品库列表
  getProductMapping: (params?: ProductMappingParams) => {
    return http.get<ProductMappingResponse>('/cost-analysis/product-mapping', { params });
  },

  // 创建商品映射
  createProductMapping: (data: {
    parsed_product_name: string;
    source_product_name: string;
  }) => {
    return http.post('/cost-analysis/product-mapping', data);
  },

  // 更新商品映射
  updateProductMapping: (id: number, data: {
    parsed_product_name?: string;
    source_product_name?: string;
  }) => {
    return http.put(`/cost-analysis/product-mapping/${id}`, data);
  },

  // 删除商品映射
  deleteProductMapping: (id: number) => {
    return http.delete(`/cost-analysis/product-mapping/${id}`);
  },

  // ==================== 订单整合 API ====================

  // 执行订单整合
  integrateOrders: (date?: string) => {
    const data = date ? { date } : {};
    return http.post<{
      matched_count: number;
      unmatched_eleme_count: number;
      unmatched_shiheng_count: number;
      total_shiheng: number;
      total_eleme: number;
    }>('/cost-analysis/integrate-orders', data);
  },

  // 获取已整合订单列表
  getIntegratedOrders: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        order_date: string;
        order_id: string;
        store_name: string;
        order_time: string;
        expected_income: number;
        product_info: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>('/cost-analysis/integrated-orders', { params });
  },

  // 获取未匹配订单列表
  getUnmatchedOrders: (params?: {
    page?: number;
    per_page?: number;
    source?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        source: 'eleme' | 'shiheng';
        order_id: string;
        store_name: string;
        order_date?: string;
        order_time?: string;
        expected_income?: number;
        product_info?: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
      eleme_count: number;
      shiheng_count: number;
    }>('/cost-analysis/unmatched-orders', { params });
  },

  // 手动匹配订单
  manualMatchOrder: (data: {
    unmatched_order_id: number;
    expected_income?: number;
    order_time?: string;
    product_info?: string;
  }) => {
    return http.post<any>('/cost-analysis/manual-match-order', data);
  },

  // 获取订单整合状态（用于日历面板）
  getIntegrationStatus: () => {
    return http.get<{
      dates: string[];
      count: number;
    }>('/cost-analysis/integration-status');
  },

  // ==================== 单品映射 API ====================

  // 获取单品映射状态（用于日历面板）
  getMappingStatus: () => {
    return http.get<{
      dates: string[];
      count: number;
    }>('/cost-analysis/mapping-status');
  },

  // 执行单品映射
  mapProducts: (date: string) => {
    return http.post<{
      message: string;
      date: string;
      mapped_count: number;
      unmatched_count: number;
    }>('/cost-analysis/map-products', { date });
  },

  // 获取已映射的单品订单列表
  getMappedProducts: (params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        order_date: string;
        order_id: string;
        store_name: string;
        order_time: string;
        expected_income: number;
        product_info: string;
        parsed_products: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>('/cost-analysis/mapped-products', { params });
  },

  // 获取单品映射未匹配的订单列表
  getUnmatchedMappingOrders: (params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        order_date: string;
        order_id: string;
        store_name: string;
        order_time: string;
        expected_income: number;
        product_info: string;
        parsed_products: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>('/cost-analysis/unmatched-mapping-orders', { params });
  },

  // ==================== 成本映射 API ====================

  // 获取成本映射状态（用于日历面板）
  getCostMappingStatus: () => {
    return http.get<{
      dates: string[];
      count: number;
    }>('/cost-analysis/cost-mapping-status');
  },

  // 执行成本映射
  mapCosts: (date: string) => {
    return http.post<{
      message: string;
      date: string;
      mapped_count: number;
      unmatched_count: number;
    }>('/cost-analysis/map-costs', { date });
  },

  // 获取已映射成本的订单列表
  getCostMappedOrders: (params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        order_date: string;
        order_id: string;
        store_name: string;
        order_time: string;
        expected_income: number;
        order_cost: number;
        product_info: string;
        parsed_products: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>('/cost-analysis/cost-mapped-orders', { params });
  },

  // 获取成本映射未匹配的订单列表
  getUnmatchedCostMappingOrders: (params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    return http.get<{
      items: Array<{
        id: number;
        order_date: string;
        order_id: string;
        store_name: string;
        order_time: string;
        expected_income: number;
        product_info: string;
        parsed_products: string;
      }>;
      total: number;
      page: number;
      per_page: number;
      pages: number;
    }>('/cost-analysis/unmatched-cost-mapping-orders', { params });
  },

  // 手动匹配成本映射订单
  manualMatchCostMapping: (data: {
    unmatched_order_id: number;
    order_cost: number;
  }) => {
    return http.post<any>('/cost-analysis/manual-match-cost-mapping', data);
  },

  // 手动匹配单品映射订单
  manualMatchProductMapping: (data: {
    unmatched_order_id: number;
    parsed_products: string;
  }) => {
    return http.post<any>('/cost-analysis/manual-match-product-mapping', data);
  },

  // ==================== 成本看板 API ====================

  // 获取门店成本统计数据
  getDashboardStoreStats: (date?: string) => {
    return http.get<{
      date: string;
      stores: Array<{
        store_name: string;
        total_revenue: number;
        total_cost: number;
        profit_margin: number;
        order_count: number;
      }>;
      summary: {
        total_revenue: number;
        total_cost: number;
        avg_profit_margin: number;
        total_orders: number;
        store_count: number;
      };
    }>('/cost-analysis/dashboard/store-stats', {
      params: date ? { date } : undefined
    });
  },

  // 获取单店毛利率趋势
  getDashboardStoreTrend: (storeName: string, days?: number) => {
    return http.get<{
      store_name: string;
      start_date: string;
      end_date: string;
      trend: Array<{
        date: string;
        total_revenue: number;
        total_cost: number;
        profit_margin: number;
        order_count: number;
      }>;
    }>('/cost-analysis/dashboard/store-trend', {
      params: { store_name: storeName, days }
    });
  },

  // 批量删除订单整合数据
  deleteIntegratedOrders: (date: string) => {
    return http.post<{
      deleted_count: number;
    }>('/cost-analysis/delete-integrated-orders', { date });
  },

  // 批量删除单品映射数据
  deleteProductMappings: (date: string) => {
    return http.post<{
      deleted_count: number;
    }>('/cost-analysis/delete-product-mappings', { date });
  },

  // 批量删除成本映射数据
  deleteCostMappings: (date: string) => {
    return http.post<{
      deleted_count: number;
    }>('/cost-analysis/delete-cost-mappings', { date });
  },

  // ==================== 编辑相关API ====================
  
  // 更新订单整合数据
  updateIntegratedOrder: (id: number, data: {
    order_date?: string;
    order_id?: string;
    store_name?: string;
    order_time?: string;
    expected_income?: number;
    product_info?: string;
  }) => {
    return http.put<{ order: any }>(`/cost-analysis/integrated-orders/${id}`, data);
  },

  // 更新单品映射数据（订单记录）
  updateProductMappingRecord: (id: number, data: {
    order_date?: string;
    order_id?: string;
    store_name?: string;
    order_time?: string;
    expected_income?: number;
    product_info?: string;
    parsed_products?: string;
  }) => {
    return http.put<{ mapping: any }>(`/cost-analysis/product-mappings/${id}`, data);
  },

  // 更新成本映射数据
  updateCostMapping: (id: number, data: {
    order_date?: string;
    order_id?: string;
    store_name?: string;
    order_time?: string;
    expected_income?: number;
    order_cost?: number;
    product_info?: string;
    parsed_products?: string;
  }) => {
    return http.put<{ cost_mapping: any }>(`/cost-analysis/cost-mappings/${id}`, data);
  },
};

export default costAnalysisApi;

