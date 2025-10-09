import { http } from '../utils/request';
import { User, PaginationResponse } from '../types';

export const usersApi = {
  // 获取用户列表
  getUsers: (params?: { page?: number; per_page?: number; role?: string; shop_id?: number }) =>
    http.get<PaginationResponse<User>>('/users/', { params }),

  // 获取单个用户
  getUser: (id: number) =>
    http.get<User>(`/users/${id}`),

  // 创建用户
  createUser: (data: {
    username: string;
    password: string;
    real_name: string;
    role: string;
    shop_id?: number;
  }) => http.post<User>('/users/', data),

  // 更新用户
  updateUser: (id: number, data: {
    real_name?: string;
    role?: string;
    shop_id?: number;
    password?: string;
  }) => http.put<User>(`/users/${id}`, data),

  // 删除用户
  deleteUser: (id: number) =>
    http.delete(`/users/${id}`),
};

