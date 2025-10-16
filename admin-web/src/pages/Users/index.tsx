import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Alert, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { usersApi } from '../../api/users';
import type { User } from '../../types';

const Users: React.FC = () => {
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  
  // 重置密码相关状态
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetForm] = Form.useForm();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadUsers();
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
    });
    setModalVisible(true);
  };

  const handleDelete = (id: number, userName: string, realName: string) => {
    console.log('🗑️ 点击删除按钮', { id, userName, realName });
    
    try {
      const modalInstance = modal.confirm({
        title: '⚠️ 删除用户确认',
        icon: null,
        centered: true,
        zIndex: 10000,
        maskClosable: false,
        content: (
          <div>
            <p style={{ marginBottom: 16 }}>
              您确定要删除用户 <strong style={{ color: '#ff4d4f' }}>{realName} ({userName})</strong> 吗？
            </p>
            <Alert
              message="警告：此操作不可恢复！"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>删除该用户后，以下数据将被<strong>永久清除</strong>：</p>
                  <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                    <li>该用户创建的所有工单</li>
                    <li>分配给该用户的所有工单</li>
                    <li>该用户发表的所有评论</li>
                    <li>该用户的所有操作日志</li>
                    <li>该用户上传的所有附件</li>
                  </ul>
                </div>
              }
              type="error"
              showIcon
            />
          </div>
        ),
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        width: 520,
        onOk: async () => {
          console.log('⏳ 开始删除用户...', id);
          try {
            await usersApi.deleteUser(id);
            message.success('用户已删除');
            loadUsers();
            console.log('✅ 用户删除成功');
          } catch (error: any) {
            console.error('❌ 删除失败:', error);
            message.error(error.response?.data?.message || '删除失败，请重试');
          }
        },
        onCancel: () => {
          console.log('❌ 取消删除');
        },
      });
      console.log('✅ Modal.confirm 已调用, modalInstance:', modalInstance);
    } catch (error) {
      console.error('❌ Modal.confirm 调用失败:', error);
      alert('弹窗调用失败，请查看控制台');
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
      await loadUsers(); // 确保等待加载完成
    } catch (error: any) {
      console.error('提交失败：', error);
      message.error(error.response?.data?.message || '操作失败，请重试');
    }
  };

  // 打开重置密码模态框
  const handleResetPassword = (record: User) => {
    setResetTargetUser(record);
    setResetSuccess(false);
    setNewPassword('');
    resetForm.resetFields();
    setResetModalVisible(true);
  };

  // 提交重置密码
  const handleResetSubmit = async () => {
    try {
      const values = await resetForm.validateFields();
      
      if (!resetTargetUser) return;
      
      const response = await usersApi.resetPassword(resetTargetUser.id, {
        admin_password: values.admin_password,
        new_password: values.new_password,
      });
      
      // 显示成功状态和新密码
      setNewPassword(response.data.data.new_password);
      setResetSuccess(true);
      message.success('密码重置成功！');
    } catch (error: any) {
      console.error('重置密码失败：', error);
      message.error(error.response?.data?.message || '密码重置失败，请重试', 5);
    }
  };

  // 关闭重置密码模态框
  const handleResetCancel = () => {
    setResetModalVisible(false);
    setResetTargetUser(null);
    setResetSuccess(false);
    setNewPassword('');
    resetForm.resetFields();
  };

  const roleOptions = [
    { label: '管理员', value: 'admin' },
    { label: '区域经理', value: 'regional_manager' },
    { label: '店长', value: 'shop_manager' },
    { label: '外卖运营', value: 'delivery_operation' },
  ];

  const roleColors: Record<string, string> = {
    admin: 'red',
    regional_manager: 'orange',
    shop_manager: 'blue',
    delivery_operation: 'cyan',
  };

  const roleNames: Record<string, string> = {
    admin: '管理员',
    regional_manager: '区域经理',
    shop_manager: '店长',
    delivery_operation: '外卖运营',
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
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
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            重置密码
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.username, record.real_name)}
          >
            删除
          </Button>
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
            <Select 
              placeholder="请选择角色" 
              options={roleOptions}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title="重置用户密码"
        open={resetModalVisible}
        onOk={resetSuccess ? handleResetCancel : handleResetSubmit}
        onCancel={handleResetCancel}
        okText={resetSuccess ? '关闭' : '确认重置'}
        cancelButtonProps={{ style: { display: resetSuccess ? 'none' : 'inline-block' } }}
        width={550}
        destroyOnClose
      >
        {resetSuccess ? (
          // 重置成功后显示新密码
          <div style={{ padding: '20px 0' }}>
            <Alert
              message="密码重置成功！"
              description={
                <div style={{ marginTop: 16 }}>
                  <p>用户：<strong>{resetTargetUser?.real_name}</strong> ({resetTargetUser?.username})</p>
                  <p style={{ fontSize: 16, marginTop: 16 }}>
                    新密码：
                    <span style={{ 
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: '#f5f5f5',
                      border: '2px dashed #1890ff',
                      borderRadius: 4,
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#1890ff',
                      marginLeft: 8,
                      letterSpacing: 2
                    }}>
                      {newPassword}
                    </span>
                  </p>
                  <p style={{ color: '#ff4d4f', marginTop: 16 }}>
                    ⚠️ 请务必记录此密码并告知用户，关闭后将无法再次查看！
                  </p>
                </div>
              }
              type="success"
              showIcon
            />
          </div>
        ) : (
          // 重置密码表单
          <Form form={resetForm} layout="vertical">
            <Alert
              message={`正在为用户 "${resetTargetUser?.real_name}" (${resetTargetUser?.username}) 重置密码`}
              type="info"
              showIcon
              style={{ marginBottom: 20 }}
            />
            
            <Form.Item
              name="admin_password"
              label="请输入您的管理员密码以确认身份"
              rules={[{ required: true, message: '请输入管理员密码' }]}
            >
              <Input.Password 
                placeholder="请输入您的管理员密码" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password 
                placeholder="请输入新密码（至少6位）" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="确认新密码"
              dependencies={['new_password']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password 
                placeholder="请再次输入新密码" 
                size="large"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Users;

