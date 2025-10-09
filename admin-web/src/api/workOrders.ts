import { http } from '../utils/request';
import { WorkOrder, PaginationResponse, TaskComment, Statistics } from '../types';

export const workOrdersApi = {
  // 获取工单列表
  getWorkOrders: (params?: {
    page?: number;
    per_page?: number;
    status_id?: number;
    type_id?: number;
    priority_id?: number;
    shop_id?: number;
    creator_id?: number;
    assignee_id?: number;
  }) => http.get<PaginationResponse<WorkOrder>>('/work-orders/', { params }),

  // 获取工单统计
  getStatistics: () =>
    http.get<Statistics>('/work-orders/statistics'),

  // 获取单个工单
  getWorkOrder: (id: number) =>
    http.get<WorkOrder>(`/work-orders/${id}`),

  // 创建工单
  createWorkOrder: (data: {
    title: string;
    description: string;
    type_id: number;
    priority_id: number;
    shop_id: number;
    assignee_id: number;
    due_date: string;
  }) => http.post<WorkOrder>('/work-orders/', data),

  // 更新工单
  updateWorkOrder: (id: number, data: {
    title?: string;
    description?: string;
    status_id?: number;
    priority_id?: number;
    completion_notes?: string;
    due_date?: string;
  }) => http.put<WorkOrder>(`/work-orders/${id}`, data),

  // 删除工单
  deleteWorkOrder: (id: number) =>
    http.delete(`/work-orders/${id}`),

  // 获取工单评论
  getComments: (workOrderId: number) =>
    http.get<TaskComment[]>(`/work-orders/${workOrderId}/comments`),

  // 添加评论
  addComment: (workOrderId: number, content: string) =>
    http.post<TaskComment>(`/work-orders/${workOrderId}/comments`, { content }),
};

