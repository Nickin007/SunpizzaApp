import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { listStores, createStore, updateStore, deleteStore, listWarehouses } from '../../api/supplyChain';
import type { SCStoreItem, SCWarehouse } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const StoreManage: React.FC = () => {
  const isMobile = useIsMobile();
  const [stores, setStores] = useState<SCStoreItem[]>([]);
  const [warehouses, setWarehouses] = useState<SCWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SCStoreItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listStores();
      setStores(res.data.data ?? []);
    } catch {
      message.error('加载门店列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await listWarehouses();
      setWarehouses(res.data.data ?? []);
    } catch {
      /* warehouses are optional context */
    }
  }, []);

  useEffect(() => {
    fetchStores();
    fetchWarehouses();
  }, [fetchStores, fetchWarehouses]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: SCStoreItem) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address ?? '',
      contact_name: record.contact_name ?? '',
      contact_phone: record.contact_phone ?? '',
      warehouse_id: record.warehouse_id ?? undefined,
      manager_user_id: record.manager_user_id ?? undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteStore(id);
      message.success('删除成功');
      fetchStores();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateStore(editing.id, values);
        message.success('更新成功');
      } else {
        await createStore(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchStores();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(editing ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '门店名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 130 },
    { title: '所属仓库', dataIndex: 'warehouse_name', key: 'warehouse_name', width: 130, render: (v: string | null) => v ?? '-' },
    { title: '负责人', dataIndex: 'manager_user_name', key: 'manager_user_name', width: 100, render: (v: string | null) => v ?? '-' },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: SCStoreItem) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该门店？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card
        title="门店管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={openCreate}>
            新增门店
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={stores}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={editing ? '编辑门店' : '新增门店'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
        width={isMobile ? '95%' : 520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="门店名称" rules={[{ required: true, message: '请输入门店名称' }]}>
            <Input placeholder="请输入门店名称" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <Form.Item name="contact_name" label="联系人">
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item name="contact_phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="warehouse_id" label="所属仓库">
            <Select placeholder="请选择仓库" allowClear>
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="manager_user_id" label="负责人ID">
            <Input type="number" placeholder="请输入负责人用户ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreManage;
