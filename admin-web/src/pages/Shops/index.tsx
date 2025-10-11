import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { shopsApi } from '../../api/shops';
import { usersApi } from '../../api/users';
import type { Shop, User } from '../../types';

const Shops: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<User[]>([]);
  const [shopManagers, setShopManagers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadShops();
    loadUsers();
  }, [page, pageSize]);

  const loadShops = async () => {
    setLoading(true);
    try {
      const response = await shopsApi.getShops({ page, per_page: pageSize });
      setShops(response.data.data.items);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('加载门店列表失败：', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // 加载区域经理
      const regionalManagersResponse = await usersApi.getUsers({ role: 'regional_manager', per_page: 100 });
      setRegionalManagers(regionalManagersResponse.data.data.items);
      
      // 加载店长
      const shopManagersResponse = await usersApi.getUsers({ role: 'shop_manager', per_page: 100 });
      setShopManagers(shopManagersResponse.data.data.items);
    } catch (error) {
      console.error('加载用户列表失败：', error);
    }
  };

  const handleAdd = () => {
    setEditingShop(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Shop) => {
    setEditingShop(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      regional_manager_id: record.regional_manager_id,
      manager_id: record.manager_id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await shopsApi.deleteShop(id);
      message.success('删除成功');
      loadShops();
    } catch (error) {
      console.error('删除失败：', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingShop) {
        await shopsApi.updateShop(editingShop.id, values);
        message.success('更新成功');
      } else {
        await shopsApi.createShop(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadShops();
    } catch (error) {
      console.error('提交失败：', error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '门店名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      ellipsis: true,
    },
    {
      title: '区域经理',
      dataIndex: ['regional_manager', 'real_name'],
      key: 'regional_manager',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '店长',
      dataIndex: ['manager', 'real_name'],
      key: 'manager',
      width: 120,
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
      render: (_: any, record: Shop) => (
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
            title="确定要删除这个门店吗？"
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
        <h2 className="page-title">门店管理</h2>
        <div className="page-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增门店
          </Button>
        </div>
      </div>

      <div className="table-container">
        <Table
          loading={loading}
          dataSource={shops}
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
        title={editingShop ? '编辑门店' : '新增门店'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="门店名称"
            rules={[{ required: true, message: '请输入门店名称' }]}
          >
            <Input placeholder="请输入门店名称" />
          </Form.Item>

          <Form.Item
            name="address"
            label="地址"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Form.Item
            name="regional_manager_id"
            label="区域经理"
            rules={[{ required: true, message: '请选择区域经理' }]}
          >
            <Select
              showSearch
              placeholder="请输入搜索区域经理"
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={regionalManagers.map(user => ({
                label: `${user.real_name} (${user.username})`,
                value: user.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="manager_id"
            label="店长"
            rules={[{ required: true, message: '请选择店长' }]}
          >
            <Select
              showSearch
              placeholder="请输入搜索店长"
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={shopManagers.map(user => ({
                label: `${user.real_name} (${user.username})`,
                value: user.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Shops;

