import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usersApi } from '../../api/users';
import type { RoleOption } from '../../api/users';
import type { User } from '../../types';

const { Title } = Typography;

const ROLE_COLORS: Record<string, string> = {
  admin: 'red',
  delivery_operation: 'blue',
  SupplyChain_operation: 'green',
  Accouting_operation: 'orange',
  DouyinANDOffline_operation: 'purple',
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getList();
      setUsers(res.data.data);
    } catch (e: any) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await usersApi.getRoles();
      setRoles(res.data.data);
    } catch {
      // fallback
      setRoles([
        { value: 'admin', label: '系统管理员' },
        { value: 'delivery_operation', label: '外卖运营' },
        { value: 'SupplyChain_operation', label: '供应链运营' },
        { value: 'Accouting_operation', label: '财务运营' },
        { value: 'DouyinANDOffline_operation', label: '抖音/小程序运营' },
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await usersApi.create(values);
      message.success('创建用户成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.message || '创建失败');
    }
  };

  const handleEdit = async (values: any) => {
    if (!editingUser) return;
    try {
      // 如果密码为空，不发送
      const payload: any = { real_name: values.real_name, role: values.role };
      if (values.password && values.password.trim()) {
        payload.password = values.password;
      }
      await usersApi.update(editingUser.id, payload);
      message.success('更新用户成功');
      setEditModalOpen(false);
      setEditingUser(null);
      editForm.resetFields();
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.message || '更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await usersApi.delete(id);
      message.success('删除用户成功');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      real_name: user.real_name,
      role: user.role,
      password: '',
    });
    setEditModalOpen(true);
  };

  const getRoleLabel = (role: string) => {
    const r = roles.find(r => r.value === role);
    return r ? r.label : role;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role] || 'default'}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除？"
            description={`将删除用户 "${record.real_name}"`}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          账号管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新增用户
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      {/* 创建用户 Modal */}
      <Modal
        title="新增用户"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入登录用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入密码（至少6位）" />
          </Form.Item>
          <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色" options={roles} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户 Modal */}
      <Modal
        title={`编辑用户 - ${editingUser?.real_name || ''}`}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingUser(null); editForm.resetFields(); }}
        onOk={() => editForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色" options={roles} />
          </Form.Item>
          <Form.Item name="password" label="重置密码（留空则不修改）">
            <Input.Password placeholder="输入新密码以重置（留空则保持不变）" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UserManagement;
