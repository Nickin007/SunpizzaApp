import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { shopsApi } from '../../api/shops';
import { usersApi } from '../../api/users';
import { Shop, User } from '../../types';

const Shops: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadShops();
    loadRegionalManagers();
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

  const loadRegionalManagers = async () => {
    try {
      const response = await usersApi.getUsers({ role: 'regional_manager', per_page: 100 });
      setRegionalManagers(response.data.data.items);
    } catch (error) {
      console.error('加载区域经理列表失败：', error);
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
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '区域经理',
      dataIndex: ['regional_manager', 'real_name'],
      key: 'regional_manager',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Shop) => (
        <Space>
          <Button
            type="link"
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
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>门店管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增门店
        </Button>
      </div>

      <Table
        loading={loading}
        dataSource={shops}
        columns={columns}
        rowKey="id"
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
              placeholder="请选择区域经理"
              options={regionalManagers.map(user => ({
                label: user.real_name,
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

