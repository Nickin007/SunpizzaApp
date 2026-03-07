import request from '../utils/request';

export interface RoleOption {
  value: string;
  label: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  real_name: string;
  roles: string[];
}

export interface UpdateUserRequest {
  real_name?: string;
  roles?: string[];
  password?: string;
}

export const usersApi = {
  /** 获取可用角色列表 */
  getRoles: () => request.get<{ data: RoleOption[] }>('/users/roles'),

  /** 获取所有用户列表 */
  getList: () => request.get<{ data: any[] }>('/users/list'),

  /** 创建用户 */
  create: (data: CreateUserRequest) => request.post('/users/create', data),

  /** 编辑用户 */
  update: (id: number, data: UpdateUserRequest) => request.put(`/users/${id}`, data),

  /** 删除用户 */
  delete: (id: number) => request.delete(`/users/${id}`),
};
