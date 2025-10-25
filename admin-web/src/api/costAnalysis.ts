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
  source_product_sku: string;
  category?: string;
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
  source_product_sku: string;
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
    source_product_sku: string;
    category?: string;
    cost: number;
  }) => {
    return http.post('/cost-analysis/source-cost-library', data);
  },

  // 更新源商品成本
  updateSourceCost: (id: number, data: {
    source_product_name?: string;
    source_product_sku?: string;
    category?: string;
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
    source_product_sku: string;
  }) => {
    return http.post('/cost-analysis/product-mapping', data);
  },

  // 更新商品映射
  updateProductMapping: (id: number, data: {
    parsed_product_name?: string;
    source_product_name?: string;
    source_product_sku?: string;
  }) => {
    return http.put(`/cost-analysis/product-mapping/${id}`, data);
  },

  // 删除商品映射
  deleteProductMapping: (id: number) => {
    return http.delete(`/cost-analysis/product-mapping/${id}`);
  },
};

export default costAnalysisApi;

