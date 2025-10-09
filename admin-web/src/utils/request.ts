import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '../types';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: 'http://118.89.73.199:5000/api', // 后端 API 地址
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    console.log('📤 发送请求:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      data: config.data,
    });
    
    // 从 localStorage 获取 token
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ 请求错误：', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    console.log('📥 收到响应:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    
    const res = response.data;

    // 如果后端返回的是标准格式 { code, message, data }
    if (res.code !== undefined) {
      if (res.code === 200 || res.code === 201) {
        return response;
      } else {
        message.error(res.message || '请求失败');
        return Promise.reject(new Error(res.message || '请求失败'));
      }
    }

    // 如果后端直接返回数据（非标准格式）
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    console.error('❌ 响应错误：', error);
    console.error('错误详情:', {
      message: error.message,
      response: error.response,
      request: error.request,
      config: error.config,
    });

    // 处理 HTTP 错误状态码
    if (error.response) {
      const { status, data } = error.response;
      console.error(`HTTP ${status}:`, data);
      
      switch (status) {
        case 401:
          message.error('未授权，请重新登录');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/login';
          break;
        case 403:
          message.error(data?.message || '没有权限访问');
          break;
        case 404:
          message.error(data?.message || '请求的资源不存在');
          break;
        case 500:
          message.error(data?.message || '服务器错误');
          break;
        default:
          message.error(data?.message || `请求失败: ${status}`);
      }
    } else if (error.request) {
      console.error('❌ 网络错误 - 没有收到响应');
      console.error('请求详情:', error.request);
      message.error('网络错误，请检查后端服务是否运行');
    } else {
      console.error('❌ 请求配置错误:', error.message);
      message.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

export default request;

// 封装常用的请求方法
export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    request.get<ApiResponse<T>>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request.post<ApiResponse<T>>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request.put<ApiResponse<T>>(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    request.delete<ApiResponse<T>>(url, config),
};

