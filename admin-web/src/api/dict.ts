import { http } from '../utils/request';
import type { DictTaskType, DictPriority, DictStatus } from '../types';

export const dictApi = {
  // 获取任务类型
  getTypes: () =>
    http.get<DictTaskType[]>('/work-orders/dict/types'),

  // 获取优先级
  getPriorities: () =>
    http.get<DictPriority[]>('/work-orders/dict/priorities'),

  // 获取状态
  getStatuses: () =>
    http.get<DictStatus[]>('/work-orders/dict/statuses'),

  // ==================== 任务类型管理 ====================
  
  // 创建任务类型
  createType: (data: { type_name: string; color: string }) =>
    http.post<DictTaskType>('/work-orders/dict/types', data),
  
  // 更新任务类型
  updateType: (id: number, data: { type_name?: string; color?: string }) =>
    http.put<DictTaskType>(`/work-orders/dict/types/${id}`, data),

  // 删除任务类型
  deleteType: (id: number) =>
    http.delete(`/work-orders/dict/types/${id}`),

  // ==================== 优先级管理 ====================
  
  // 创建优先级
  createPriority: (data: { priority_name: string; color: string; sort_order: number }) =>
    http.post<DictPriority>('/work-orders/dict/priorities', data),
  
  // 更新优先级
  updatePriority: (id: number, data: { priority_name?: string; color?: string; sort_order?: number }) =>
    http.put<DictPriority>(`/work-orders/dict/priorities/${id}`, data),

  // 删除优先级
  deletePriority: (id: number) =>
    http.delete(`/work-orders/dict/priorities/${id}`),

  // ==================== 状态管理 ====================
  
  // 创建状态
  createStatus: (data: { status_name: string; color: string }) =>
    http.post<DictStatus>('/work-orders/dict/statuses', data),
  
  // 更新状态
  updateStatus: (id: number, data: { status_name?: string; color?: string }) =>
    http.put<DictStatus>(`/work-orders/dict/statuses/${id}`, data),

  // 删除状态
  deleteStatus: (id: number) =>
    http.delete(`/work-orders/dict/statuses/${id}`),
};

