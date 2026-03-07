import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Space, Typography,
  List, Popconfirm, message, Empty, Tag, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  listItemCategories, createItemCategory, updateItemCategory, deleteItemCategory,
  createItem, updateItem, deleteItem,
} from '../../api/finance';
import type { AccountItemCategory, AccountItem } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import './accounting.css';

const { Title, Text } = Typography;

const ItemManage: React.FC = () => {
  const isMobile = useIsMobile();
  const { currentBookId } = useFinanceStore();

  const [categories, setCategories] = useState<AccountItemCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<AccountItemCategory | null>(null);
  const [catForm] = Form.useForm();

  const [items, setItems] = useState<AccountItem[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AccountItem | null>(null);
  const [itemForm] = Form.useForm();

  const selectedCat = categories.find((c) => c.id === selectedCatId) ?? null;

  const loadCategories = useCallback(async () => {
    if (!currentBookId) return;
    setCatLoading(true);
    try {
      const res = await listItemCategories(currentBookId);
      if (res.data.code === 200) {
        setCategories(res.data.data);
      }
    } catch {
      message.error('加载核算项目分类失败');
    } finally {
      setCatLoading(false);
    }
  }, [currentBookId]);

  useEffect(() => {
    if (currentBookId) {
      loadCategories();
      setSelectedCatId(null);
      setItems([]);
    }
  }, [currentBookId, loadCategories]);

  useEffect(() => {
    if (selectedCat?.items) {
      setItems(selectedCat.items);
    } else {
      setItems([]);
    }
    setItemLoading(false);
  }, [selectedCat]);

  // ===== 分类 CRUD =====

  const handleAddCategory = () => {
    setEditingCat(null);
    catForm.resetFields();
    setCatModalOpen(true);
  };

  const handleEditCategory = (cat: AccountItemCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    catForm.setFieldsValue({ name: cat.name });
    setCatModalOpen(true);
  };

  const handleCatSubmit = async () => {
    try {
      const values = await catForm.validateFields();
      if (editingCat) {
        const res = await updateItemCategory(editingCat.id, { name: values.name });
        if (res.data.code === 200) message.success('分类已更新');
      } else {
        const res = await createItemCategory(currentBookId!, { name: values.name });
        if (res.data.code === 200) message.success('分类已创建');
      }
      setCatModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await deleteItemCategory(id);
      if (res.data.code === 200) {
        message.success('分类已删除');
        if (selectedCatId === id) {
          setSelectedCatId(null);
          setItems([]);
        }
        loadCategories();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  // ===== 项目 CRUD =====

  const handleAddItem = () => {
    setEditingItem(null);
    itemForm.resetFields();
    setItemModalOpen(true);
  };

  const handleEditItem = (record: AccountItem) => {
    setEditingItem(record);
    itemForm.setFieldsValue({ code: record.code, name: record.name });
    setItemModalOpen(true);
  };

  const handleItemSubmit = async () => {
    try {
      const values = await itemForm.validateFields();
      if (editingItem) {
        const res = await updateItem(editingItem.id, { code: values.code, name: values.name });
        if (res.data.code === 200) message.success('项目已更新');
      } else {
        const res = await createItem(selectedCatId!, { code: values.code, name: values.name });
        if (res.data.code === 200) message.success('项目已创建');
      }
      setItemModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await deleteItem(id);
      if (res.data.code === 200) {
        message.success('项目已删除');
        loadCategories();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleToggleEnabled = async (record: AccountItem, checked: boolean) => {
    try {
      const res = await updateItem(record.id, { is_enabled: checked });
      if (res.data.code === 200) {
        message.success(checked ? '已启用' : '已禁用');
        loadCategories();
      }
    } catch {
      message.error('操作失败');
    }
  };

  // ===== 表格列 =====

  const itemColumns: ColumnsType<AccountItem> = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 100,
      render: (val: boolean, record: AccountItem) => (
        <Switch
          checked={val}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: AccountItem) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此项目？" onConfirm={() => handleDeleteItem(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!currentBookId) {
    return (
      <Card className="acct-card">
        <Empty description="请先在「账套管理」中选择一个账套" />
      </Card>
    );
  }

  const categoryPanel = (
    <Card
      className="acct-card"
      title="核算项目分类"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCategory}>
          新增
        </Button>
      }
      style={{ width: isMobile ? '100%' : 280, flexShrink: 0 }}
    >
      <List
        loading={catLoading}
        dataSource={categories}
        locale={{ emptyText: <Empty description="暂无分类" /> }}
        renderItem={(cat) => (
          <List.Item
            onClick={() => setSelectedCatId(cat.id)}
            style={{
              cursor: 'pointer',
              padding: '10px 12px',
              background: selectedCatId === cat.id ? '#e6f4ff' : undefined,
              borderLeft: selectedCatId === cat.id ? '3px solid #1677ff' : '3px solid transparent',
            }}
            actions={[
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => handleEditCategory(cat, e)}
              />,
              <Popconfirm
                key="del"
                title="确定删除该分类？"
                onConfirm={() => handleDeleteCategory(cat.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
              </Popconfirm>,
            ]}
          >
            <Space>
              <AppstoreOutlined />
              <Text>{cat.name}</Text>
              {cat.items && <Tag>{cat.items.length}</Tag>}
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );

  const itemPanel = (
    <Card
      className="acct-card"
      title={selectedCat ? `${selectedCat.name} - 核算项目` : '核算项目'}
      extra={
        selectedCat && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddItem}>
            新增项目
          </Button>
        )
      }
      style={{ flex: 1 }}
    >
      {selectedCat ? (
        <div className="acct-table">
          <Table<AccountItem>
            columns={itemColumns}
            dataSource={items}
            rowKey="id"
            loading={itemLoading}
            pagination={false}
            scroll={{ x: 500 }}
            locale={{ emptyText: <Empty description="该分类下暂无项目" /> }}
          />
        </div>
      ) : (
        <Empty description="请在左侧选择一个分类" />
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          核算项目管理
        </Title>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {categoryPanel}
        {itemPanel}
      </div>

      {/* 分类弹窗 */}
      <Modal
        title={editingCat ? '编辑分类' : '新增分类'}
        open={catModalOpen}
        onOk={handleCatSubmit}
        onCancel={() => setCatModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={catForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：客户、供应商、部门" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目弹窗 */}
      <Modal
        title={editingItem ? '编辑项目' : '新增项目'}
        open={itemModalOpen}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}>
            <Input placeholder="如：C001" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：某某客户" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ItemManage;
