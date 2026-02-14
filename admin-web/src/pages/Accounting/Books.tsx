import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, DatePicker, Space, Tag, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, BookOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as financeApi from '../../api/finance';
import type { AccountBook } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';

const { Text, Title } = Typography;

const Books: React.FC = () => {
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<AccountBook | null>(null);
  const [form] = Form.useForm();

  const { currentBookId, setCurrentBook } = useFinanceStore();

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await financeApi.listBooks();
      if (res.data.code === 200) {
        setBooks(res.data.data);
      }
    } catch {
      message.error('加载账套列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleCreate = () => {
    setEditingBook(null);
    form.resetFields();
    form.setFieldsValue({ currency: 'CNY' });
    setModalVisible(true);
  };

  const handleEdit = (record: AccountBook) => {
    setEditingBook(record);
    form.setFieldsValue({
      name: record.name,
      start_date: dayjs(record.start_date),
      currency: record.currency,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        start_date: values.start_date.format('YYYY-MM-DD'),
        currency: values.currency || 'CNY',
      };

      if (editingBook) {
        const res = await financeApi.updateBook(editingBook.id, { name: payload.name, currency: payload.currency });
        if (res.data.code === 200) {
          message.success('更新成功');
          if (currentBookId === editingBook.id) {
            setCurrentBook(editingBook.id, payload.name);
          }
        }
      } else {
        const res = await financeApi.createBook(payload);
        if (res.data.code === 200) {
          message.success(res.data.message || '创建成功');
        }
      }
      setModalVisible(false);
      loadBooks();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await financeApi.deleteBook(id);
      if (res.data.code === 200) {
        message.success('删除成功');
        if (currentBookId === id) setCurrentBook(null, '');
        loadBooks();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleSwitch = (record: AccountBook) => {
    setCurrentBook(record.id, record.name);
    message.success(`已切换到账套「${record.name}」`);
  };

  const columns: ColumnsType<AccountBook> = [
    {
      title: '账套名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AccountBook) => (
        <Space>
          <Text strong>{name}</Text>
          {currentBookId === record.id && <Tag color="green">当前使用</Tag>}
        </Space>
      ),
    },
    { title: '启用日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '本位币', dataIndex: 'currency', key: 'currency', width: 100 },
    {
      title: '最后结账期间',
      dataIndex: 'last_closed_period',
      key: 'last_closed_period',
      render: (v: string | null) => v || <Text type="secondary">未结账</Text>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: AccountBook) => (
        <Space>
          {currentBookId !== record.id ? (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleSwitch(record)}>
              切换使用
            </Button>
          ) : (
            <Tag color="green">使用中</Tag>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此账套？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: 8 }} />
            账套管理
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建账套
          </Button>
        </div>

        {currentBookId && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <Text>当前账套：<Text strong>{useFinanceStore.getState().currentBookName}</Text></Text>
          </div>
        )}

        <Table columns={columns} dataSource={books} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editingBook ? '编辑账套' : '新建账套'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="账套名称" rules={[{ required: true, message: '请输入账套名称' }]}>
            <Input placeholder="如：圣比萨2026年账套" />
          </Form.Item>
          <Form.Item name="start_date" label="启用日期" rules={[{ required: true, message: '请选择启用日期' }]}>
            <DatePicker style={{ width: '100%' }} disabled={!!editingBook} />
          </Form.Item>
          <Form.Item name="currency" label="本位币">
            <Input placeholder="CNY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Books;
