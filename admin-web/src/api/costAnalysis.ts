import request from '../utils/request';

// ==================== 类型定义 ====================

export interface AnalyzableStore {
  id: number;
  store_name: string;
  created_at: string;
}

export interface ProductRecipeCard {
  id: number;
  product_name: string;
  ingredient_name: string;
  ingredient_unit: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientCost {
  id: number;
  ingredient_name: string;
  unit: string;
  unit_cost: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSales {
  product_name: string;
  quantity: number;
}

export interface IngredientUsage {
  ingredient_name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export interface StoreAnalysis {
  store_name: string;
  order_count: number;
  product_sales: ProductSales[];
  ingredient_usage: IngredientUsage[];
  total_cost: number;
}

export interface AnalysisResult {
  stores: StoreAnalysis[];
  summary: {
    total_orders: number;
    total_stores: number;
    unmapped_products: string[];
  };
}

// 预览数据类型
export interface PreviewResult {
  columns: string[];
  preview_rows: Record<string, unknown>[];
  total_rows: number;
  stores_in_file: string[];
  matched_stores: string[];
  unmatched_stores: string[];
  has_store_col: boolean;
  has_product_col: boolean;
  store_col_name: string | null;
  product_col_name: string | null;
}

// 矩阵分析结果类型（旧版，保留兼容）
export interface MatrixRow {
  source_product?: string;
  ingredient?: string;
  [storeName: string]: string | number | undefined;
}

// 竖表行类型
export interface SpRow {
  date: string;
  store: string;
  source_product: string;
  value: number;
}

export interface IngRow {
  date: string;
  store: string;
  ingredient: string;
  value: number;
}

export interface DailyCostItem {
  date: string;
  store: string;
  cost: number;
}

export interface AnalysisResultV2 {
  summary: {
    total_orders: number;
    total_stores: number;
    total_source_products: number;
    total_ingredients: number;
    unmapped_products: string[];
    unmapped_source_products: string[];
    date_range: string;
  };
  stores: string[];
  dates: string[];
  source_products: string[];
  ingredients: string[];
  store_cost_summary: Record<string, number>;
  daily_cost_summary: DailyCostItem[];
  sp_qty_rows: SpRow[];
  sp_cost_rows: SpRow[];
  ing_qty_rows: IngRow[];
  ing_cost_rows: IngRow[];
}

// 门店收入数据
export interface RevenueRow {
  date: string;
  store: string;
  revenue: number;
}

export interface RevenueUploadResult {
  rows: RevenueRow[];
  stores: string[];
  dates: string[];
  total_rows: number;
}

export interface MatrixAnalysisResult {
  summary: {
    total_orders: number;
    total_stores: number;
    total_source_products: number;
    total_ingredients: number;
    unmapped_products: string[];
    unmapped_source_products: string[];
  };
  stores: string[];
  source_products: string[];
  ingredients: string[];
  source_product_quantity_matrix: MatrixRow[];
  source_product_cost_matrix: MatrixRow[];
  ingredient_quantity_matrix: MatrixRow[];
  ingredient_cost_matrix: MatrixRow[];
}

export interface ProductNameMapping {
  id: number;
  parsed_name: string;
  source_name: string;
  created_at: string;
  updated_at: string;
}

export interface UnmappedOrderItem {
  name: string;
  qty: number;
  is_unmapped: boolean;
}

export interface UnmappedDetail {
  store_name: string;
  order_text: string;
  total_parsed: number;
  all_items: UnmappedOrderItem[];
}

export interface UnmappedProduct {
  parsed_name: string;
  count: number;
  stores: string[];
  store_count: number;
  details: UnmappedDetail[];
}

export interface ParserInfo {
  name: string;
  filename: string;
  description: string;
}

// ==================== 一站式导入配置 API ====================

export interface ImportConfigStats {
  stores: { added: number; skipped: number; updated: number };
  mappings: { added: number; skipped: number; updated: number };
  recipes: { added: number; skipped: number; updated: number };
  ingredients: { added: number; skipped: number; updated: number };
}

export interface ImportConfigResult {
  mode: string;
  mode_label: string;
  processed_sheets: string[];
  all_sheets: string[];
  stats: ImportConfigStats;
}

export const importConfig = (file: File, mode: 'upsert' | 'replace') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  return request.post<{ code: number; data: ImportConfigResult; message?: string }>(
    '/cost-analysis/import-config',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

// ==================== 解析算法 API ====================

export const getParsers = () => {
  return request.get<{ code: number; data: ParserInfo[]; message?: string }>('/cost-analysis/parsers');
};

// ==================== 可分析门店 API ====================

export const getStores = () => {
  return request.get<{ code: number; data: AnalyzableStore[]; message?: string }>('/cost-analysis/stores');
};

export const addStore = (storeName: string) => {
  return request.post<{ code: number; data: AnalyzableStore; message?: string }>('/cost-analysis/stores', {
    store_name: storeName,
  });
};

export const deleteStore = (storeId: number) => {
  return request.delete<{ code: number; message?: string }>(`/cost-analysis/stores/${storeId}`);
};

export const batchAddStores = (storeNames: string[]) => {
  return request.post<{ code: number; data: { added: number; skipped: number }; message?: string }>(
    '/cost-analysis/stores/batch',
    { store_names: storeNames }
  );
};

export const batchDeleteStores = (ids: number[]) => {
  return request.post<{ code: number; data: { deleted: number }; message?: string }>(
    '/cost-analysis/stores/batch-delete',
    { ids }
  );
};

// ==================== 单品原料卡 API ====================

export const getRecipes = (productName?: string) => {
  const params = productName ? { product_name: productName } : {};
  return request.get<{ code: number; data: ProductRecipeCard[]; message?: string }>('/cost-analysis/recipes', {
    params,
  });
};

export const getRecipeProducts = () => {
  return request.get<{ code: number; data: string[]; message?: string }>('/cost-analysis/recipes/products');
};

export const addRecipe = (recipe: {
  product_name: string;
  ingredient_name: string;
  ingredient_unit: string;
  quantity: number;
}) => {
  return request.post<{ code: number; data: ProductRecipeCard; message?: string }>('/cost-analysis/recipes', recipe);
};

export const deleteRecipe = (recipeId: number) => {
  return request.delete<{ code: number; message?: string }>(`/cost-analysis/recipes/${recipeId}`);
};

export const batchAddRecipes = (
  recipes: Array<{
    product_name: string;
    ingredient_name: string;
    ingredient_unit: string;
    quantity: number;
  }>
) => {
  return request.post<{ code: number; data: { added: number; updated: number }; message?: string }>(
    '/cost-analysis/recipes/batch',
    { recipes }
  );
};

export const batchDeleteRecipes = (ids: number[]) => {
  return request.post<{ code: number; data: { deleted: number }; message?: string }>(
    '/cost-analysis/recipes/batch-delete',
    { ids }
  );
};

// ==================== 原料成本 API ====================

export const getIngredients = () => {
  return request.get<{ code: number; data: IngredientCost[]; message?: string }>('/cost-analysis/ingredients');
};

export const addIngredient = (ingredient: { ingredient_name: string; unit: string; unit_cost: number }) => {
  return request.post<{ code: number; data: IngredientCost; message?: string }>(
    '/cost-analysis/ingredients',
    ingredient
  );
};

export const deleteIngredient = (ingredientId: number) => {
  return request.delete<{ code: number; message?: string }>(`/cost-analysis/ingredients/${ingredientId}`);
};

export const batchAddIngredients = (
  ingredients: Array<{
    ingredient_name: string;
    unit: string;
    unit_cost: number;
  }>
) => {
  return request.post<{ code: number; data: { added: number; updated: number }; message?: string }>(
    '/cost-analysis/ingredients/batch',
    { ingredients }
  );
};

export const batchDeleteIngredients = (ids: number[]) => {
  return request.post<{ code: number; data: { deleted: number }; message?: string }>(
    '/cost-analysis/ingredients/batch-delete',
    { ids }
  );
};

// ==================== 源商品名称映射 API ====================

export const getMappings = (sourceName?: string) => {
  const params = sourceName ? { source_name: sourceName } : {};
  return request.get<{ code: number; data: ProductNameMapping[]; message?: string }>('/cost-analysis/mappings', {
    params,
  });
};

export const getSourceNames = () => {
  return request.get<{ code: number; data: string[]; message?: string }>('/cost-analysis/mappings/sources');
};

export const addMapping = (mapping: { parsed_name: string; source_name: string }) => {
  return request.post<{ code: number; data: ProductNameMapping; message?: string }>('/cost-analysis/mappings', mapping);
};

export const deleteMapping = (mappingId: number) => {
  return request.delete<{ code: number; message?: string }>(`/cost-analysis/mappings/${mappingId}`);
};

export const batchAddMappings = (
  mappings: Array<{
    parsed_name: string;
    source_name: string;
  }>
) => {
  return request.post<{ code: number; data: { added: number; updated: number }; message?: string }>(
    '/cost-analysis/mappings/batch',
    { mappings }
  );
};

export const batchDeleteMappings = (ids: number[]) => {
  return request.post<{ code: number; data: { deleted: number }; message?: string }>(
    '/cost-analysis/mappings/batch-delete',
    { ids }
  );
};

export const getUnmappedProducts = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{
    code: number;
    data: { unmapped: UnmappedProduct[]; total_products: number; mapped_count: number; unmapped_count: number };
    message?: string;
  }>('/cost-analysis/mappings/unmapped', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ==================== 订单分析 API ====================

export const previewOrders = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ code: number; data: PreviewResult; message?: string }>(
    '/cost-analysis/preview',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

export const analyzeOrders = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ code: number; data: AnalysisResultV2; message?: string }>(
    '/cost-analysis/analyze',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

export const uploadRevenue = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ code: number; data: RevenueUploadResult; message?: string }>(
    '/cost-analysis/upload-revenue',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};

export const exportCostDetail = (data: {
  analysis: AnalysisResultV2;
  revenue_rows: RevenueRow[];
}) => {
  return request.post('/cost-analysis/export-cost-detail', data, { responseType: 'blob' });
};

export const exportAnalysis = (stores: StoreAnalysis[]) => {
  return request.post('/cost-analysis/export', { stores }, { responseType: 'blob' });
};

export const exportSourceProduct = (data: {
  stores: string[];
  source_products: string[];
  source_product_quantity_matrix: MatrixRow[];
  source_product_cost_matrix: MatrixRow[];
}) => {
  return request.post('/cost-analysis/export-source-product', data, { responseType: 'blob' });
};

export const exportIngredient = (data: {
  stores: string[];
  ingredients: string[];
  ingredient_quantity_matrix: MatrixRow[];
  ingredient_cost_matrix: MatrixRow[];
}) => {
  return request.post('/cost-analysis/export-ingredient', data, { responseType: 'blob' });
};
