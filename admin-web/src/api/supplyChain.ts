import request from '../utils/request';

// ═══════════════ 类型定义 ═══════════════

export interface ProductCategory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  children?: ProductCategory[];
}

export interface ProductSpec {
  id?: number;
  product_id?: number;
  spec_name: string;
  spec_value: string;
  price_override: number | null;
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  unit: string;
  default_price: number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  category_name: string | null;
  created_at: string;
  specs?: ProductSpec[];
}

export interface SCWarehouse {
  id: number;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  admin_user_id: number | null;
  admin_user_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SCStoreItem {
  id: number;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  warehouse_id: number | null;
  warehouse_name: string | null;
  manager_user_id: number | null;
  manager_user_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  warehouse_id: number;
  product_id: number;
  product_spec_id: number | null;
  quantity: number;
  safety_stock: number;
  product_name: string;
  spec_info: string | null;
  warehouse_name: string;
  is_low: boolean;
}

export interface InventoryLogItem {
  id: number;
  warehouse_id: number;
  product_id: number;
  product_spec_id: number | null;
  change_qty: number;
  after_qty: number;
  log_type: string;
  reason: string | null;
  order_id: number | null;
  operator_name: string | null;
  product_name: string | null;
  created_at: string;
}

export interface SCOrderItemType {
  id: number;
  order_id: number;
  product_id: number;
  product_spec_id: number | null;
  product_name: string;
  spec_info: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface SCOrder {
  id: number;
  order_no: string;
  store_id: number;
  store_name: string | null;
  warehouse_id: number;
  warehouse_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'shipping' | 'shipped' | 'completed';
  total_amount: number;
  remark: string | null;
  creator_id: number;
  creator_name: string | null;
  reviewer_id: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  shipped_at: string | null;
  shipper_name: string | null;
  tracking_no: string | null;
  created_at: string;
  item_count: number;
  items?: SCOrderItemType[];
}

export interface DashboardData {
  pending_count: number;
  approved_count: number;
  low_stock_count: number;
  today_orders: number;
  recent_orders: SCOrder[];
}

// ═══════════════ 分类 API ═══════════════

export function listCategories(tree = true) {
  return request.get('/api/sc/categories', { params: { tree: tree ? '1' : '0' } });
}
export function createCategory(data: Partial<ProductCategory>) {
  return request.post('/api/sc/categories', data);
}
export function updateCategory(id: number, data: Partial<ProductCategory>) {
  return request.put(`/api/sc/categories/${id}`, data);
}
export function deleteCategory(id: number) {
  return request.delete(`/api/sc/categories/${id}`);
}

// ═══════════════ 货品 API ═══════════════

export function listProducts(params?: { page?: number; per_page?: number; category_id?: number; keyword?: string; is_active?: string }) {
  return request.get('/api/sc/products', { params });
}
export function getProduct(id: number) {
  return request.get(`/api/sc/products/${id}`);
}
export function createProduct(data: any) {
  return request.post('/api/sc/products', data);
}
export function updateProduct(id: number, data: any) {
  return request.put(`/api/sc/products/${id}`, data);
}
export function deleteProduct(id: number) {
  return request.delete(`/api/sc/products/${id}`);
}

// ═══════════════ 仓库 API ═══════════════

export function listWarehouses() {
  return request.get('/api/sc/warehouses');
}
export function createWarehouse(data: Partial<SCWarehouse>) {
  return request.post('/api/sc/warehouses', data);
}
export function updateWarehouse(id: number, data: Partial<SCWarehouse>) {
  return request.put(`/api/sc/warehouses/${id}`, data);
}
export function deleteWarehouse(id: number) {
  return request.delete(`/api/sc/warehouses/${id}`);
}

// ═══════════════ 门店 API ═══════════════

export function listStores() {
  return request.get('/api/sc/stores');
}
export function createStore(data: Partial<SCStoreItem>) {
  return request.post('/api/sc/stores', data);
}
export function updateStore(id: number, data: Partial<SCStoreItem>) {
  return request.put(`/api/sc/stores/${id}`, data);
}
export function deleteStore(id: number) {
  return request.delete(`/api/sc/stores/${id}`);
}

// ═══════════════ 门店订货 API ═══════════════

export function shopListProducts(params?: { category_id?: number; keyword?: string }) {
  return request.get('/api/sc/shop/products', { params });
}
export function shopCreateOrder(data: { items: { product_id: number; product_spec_id?: number; quantity: number }[]; remark?: string; store_id?: number }) {
  return request.post('/api/sc/shop/orders', data);
}
export function shopListOrders(params?: { page?: number; per_page?: number; status?: string; store_id?: number }) {
  return request.get('/api/sc/shop/orders', { params });
}
export function shopOrderDetail(id: number) {
  return request.get(`/api/sc/shop/orders/${id}`);
}

// ═══════════════ 管理员订单 API ═══════════════

export function adminListOrders(params?: { page?: number; per_page?: number; status?: string; store_id?: number }) {
  return request.get('/api/sc/admin/orders', { params });
}
export function adminApproveOrder(id: number) {
  return request.put(`/api/sc/admin/orders/${id}/approve`);
}
export function adminRejectOrder(id: number, reject_reason: string) {
  return request.put(`/api/sc/admin/orders/${id}/reject`, { reject_reason });
}

// ═══════════════ 仓库发货 API ═══════════════

export function warehouseListOrders(params?: { page?: number; per_page?: number; status?: string }) {
  return request.get('/api/sc/warehouse/orders', { params });
}
export function warehouseShipOrder(id: number, tracking_no?: string) {
  return request.put(`/api/sc/warehouse/orders/${id}/ship`, { tracking_no });
}

// ═══════════════ 库存 API ═══════════════

export function listInventory(params?: { warehouse_id?: number; product_id?: number; low_stock?: string }) {
  return request.get('/api/sc/inventory', { params });
}
export function adjustInventory(data: { warehouse_id: number; product_id: number; product_spec_id?: number; change_qty: number; reason?: string }) {
  return request.post('/api/sc/inventory/adjust', data);
}
export function listInventoryLogs(params?: { page?: number; per_page?: number; warehouse_id?: number; product_id?: number }) {
  return request.get('/api/sc/inventory/logs', { params });
}

// ═══════════════ 报表 API ═══════════════

export function getDashboard() {
  return request.get('/api/sc/reports/dashboard');
}
export function getOrderSummary(params?: { start_date?: string; end_date?: string }) {
  return request.get('/api/sc/reports/order-summary', { params });
}
export function exportOrders(params?: { start_date?: string; end_date?: string }) {
  return request.get('/api/sc/reports/export', { params, responseType: 'blob' });
}
