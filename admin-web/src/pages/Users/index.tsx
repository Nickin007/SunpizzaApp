import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usersApi } from '../../api/users';
import { shopsApi } from '../../api/shops';
import { User, Shop } from '../../types';

const Users: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
    loadShops();
  }, [page, pageSize]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers({ page, per_page: pageSize });
      setUsers(response.data.data.items);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('加载用户列表失败：', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      const response = await shopsApi.getShops({ per_page: 100 });
      setShops(response.data.data.items);
    } catch (error) {
      console.error('加载门店列表失败：', error);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      real_name: record.real_name,
      role: record.role,
      shop_id: record.shop_id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await usersApi.deleteUser(id);
      message.success('删除成功');
      loadUsers();
    } catch (error) {
      console.error('删除失败：', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, values);
        message.success('更新成功');
      } else {
        await usersApi.createUser(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      console.error('提交失败：', error);
    }
  };

  const roleOptions = [
    { label: '管理员', value: 'admin' },
    { label: '区域经理', value: 'regional_manager' },
    { label: '店长', value: 'shop_manager' },
    { label: '员工', value: 'staff' },
  ];

  const roleColors: Record<string, string> = {
    admin: 'red',
    regional_manager: 'orange',
    shop_manager: 'blue',
    staff: 'green',
  };

  const roleNames: Record<string, string> = {
    admin: '管理员',
    regional_manager: '区域经理',
    shop_manager: '店长',
    staff: '员工',
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      ellipsis: true,
    },
    {
      title: '真实姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 120,
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={roleColors[role]}>{roleNames[role]}</Tag>
      ),
    },
    {
      title: '所属门店',
      dataIndex: ['shop', 'name'],
      key: 'shop',
      width: 180,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">用户管理</h2>
        <div className="page-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增用户
          </Button>
        </div>
      </div>

      <div className="table-container">
        <Table
          loading={loading}
          dataSource={users}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </div>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            name="real_name"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色" options={roleOptions} />
          </Form.Item>

          <Form.Item
            name="shop_id"
            label="所属门店"
            tooltip="管理员和区域经理可以不选"
          >
            <Select
              placeholder="请选择门店"
              allowClear
              options={shops.map(shop => ({ label: shop.name, value: shop.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;

