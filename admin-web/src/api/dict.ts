import { http } from '../utils/request';
import { DictTaskType, DictPriority, DictStatus } from '../types';

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
};

