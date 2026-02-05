/**
 * POI门店搜索API
 */
import http from '../utils/request';

export interface POIStore {
  id: number;
  poi_id: string;
  brand_name: string;
  store_name: string;
  city: string;
  province: string;
  district: string;
  address: string;
  full_address: string;
  phone: string;
  longitude: number;
  latitude: number;
  poi_type: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface SearchPOIParams {
  keyword?: string;  // 关键词搜索（可选，如果提供types则可不提供）
  city: string;
  max_pages?: number;
  save_to_db?: boolean;
  poi_category?: string;  // 'brand' 或其他类型（学校/医院等）
  types?: string;  // 高德POI分类编码，多个用|分隔（如"120000|120203"）
}

export interface BatchSearchParams {
  keywords: string[];
  city: string;
  save_to_db?: boolean;
}

export interface GetStoresParams {
  city?: string;
  brand_name?: string;
  category?: string;
}

export interface ExportParams {
  store_ids?: number[];
  brands?: string[];
}

export interface Brand {
  brand_name: string;
  category: string;
  store_count: number;
  cities: string[];
  last_updated: string | null;
}

export interface GetBrandsParams {
  city?: string;
}

export interface POITypeConfig {
  type: string;
  types?: string[];  // 高德官方POI分类编码（优先使用）
  keywords?: string[];  // 备用关键词（当没有types时使用）
  icon: string;
  color: string;
}

export interface OtherPOIType {
  poi_type: string;
  store_count: number;
  icon: string;
  color: string;
}

export const poiApi = {
  // 搜索POI（分区县查询时间较长，设置10分钟超时）
  searchPOI: (params: SearchPOIParams) => 
    http.post('/poi/search', params, { 
      timeout: 600000  // 10分钟超时
    }),

  // 批量搜索
  batchSearch: (params: BatchSearchParams) => 
    http.post('/poi/batch-search', params),

  // 获取已存储的POI
  getStores: (params: GetStoresParams) => 
    http.get('/poi/stores', { params }),

  // 获取品牌列表
  getBrands: (params?: GetBrandsParams) => 
    http.get('/poi/brands', { params }),

  // 获取POI类型配置
  getPOITypes: () => 
    http.get('/poi/poi-types'),

  // 获取其他POI类型列表
  getOtherPOIs: (params?: GetBrandsParams) => 
    http.get('/poi/other-pois', { params }),

  // 导出Excel
  exportExcel: (params: ExportParams) => 
    http.post('/poi/export', params, { responseType: 'blob' }),
};

