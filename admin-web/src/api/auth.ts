import { http } from '../utils/request';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  // 登录 - 修改路径匹配后端 /api/users/login
  login: (data: LoginRequest) => 
    http.post<LoginResponse>('/users/login', data),

  // 获取当前用户信息
  getCurrentUser: () => 
    http.get('/users/me'),
};

