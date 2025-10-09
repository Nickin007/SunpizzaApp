import { http } from '../utils/request';
import { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  // 登录
  login: (data: LoginRequest) => 
    http.post<LoginResponse>('/auth/login', data),

  // 获取当前用户信息
  getCurrentUser: () => 
    http.get('/auth/me'),
};

