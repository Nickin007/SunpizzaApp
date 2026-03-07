import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../api/supplyChain';
import type { SCWarehouse } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const WarehouseManage: React.FC = () => {
  const isMobile = useIsMobile();
  const [warehouses, setWarehouses] = useState<SCWarehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SCWarehouse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listWarehouses();
      setWarehouses(res.data.data ?? []);
    } catch {
      message.error('加载仓库列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: SCWarehouse) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address ?? '',
      contact_name: record.contact_name ?? '',
      contact_phone: record.contact_phone ?? '',
      admin_user_id: record.admin_user_id ?? undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWarehouse(id);
      message.success('删除成功');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await updateWarehouse(editing.id, values);
        message.success('更新成功');
      } else {
        await createWarehouse(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(editing ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '仓库名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 200, ellipsis: true },
    { title: '联系人', dataIndex: 'contact_name', key: 'contact_name', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 130 },
    { title: '管理员', dataIndex: 'admin_user_name', key: 'admin_user_name', width: 100, render: (v: string | null) => v ?? '-' },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, record: SCWarehouse) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该仓库？" onConfirm={() => handleDelete(record.id)} okText="确认" cancelText="取消">
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card
        title="仓库管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={openCreate}>
            新增仓库
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={warehouses}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={editing ? '编辑仓库' : '新增仓库'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
        width={isMobile ? '95%' : 520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="仓库名称" rules={[{ required: true, message: '请输入仓库名称' }]}>
            <Input placeholder="请输入仓库名称" />
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
          <Form.Item name="admin_user_id" label="管理员用户ID">
            <InputNumber style={{ width: '100%' }} placeholder="请输入管理员用户ID" min={1} precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WarehouseManage;
