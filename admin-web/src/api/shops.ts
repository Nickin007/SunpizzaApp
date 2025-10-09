import { http } from '../utils/request';
import type { Shop, PaginationResponse } from '../types';

export const shopsApi = {
  // 获取门店列表
  getShops: (params?: { page?: number; per_page?: number }) =>
    http.get<PaginationResponse<Shop>>('/shops/', { params }),

  // 获取单个门店
  getShop: (id: number) =>
    http.get<Shop>(`/shops/${id}`),

  // 创建门店
  createShop: (data: {
    name: string;
    address: string;
    regional_manager_id: number;
  }) => http.post<Shop>('/shops/', data),

  // 更新门店
  updateShop: (id: number, data: {
    name?: string;
    address?: string;
    regional_manager_id?: number;
  }) => http.put<Shop>(`/shops/${id}`, data),

  // 删除门店
  deleteShop: (id: number) =>
    http.delete(`/shops/${id}`),
};

