import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Modal, Form, Input, InputNumber, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import costAnalysisApi, { type SourceCostItem } from '../../../../api/costAnalysis';

/**
 * 源商品成本库标签页
 * 管理源商品成本（映射源商品 -> 具体成本）
 */
const SourceCostLibraryTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<SourceCostItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SourceCostItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    loadCategories();
  }, [page, pageSize, categoryFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        per_page: pageSize,
      };
      
      if (searchText) {
        params.search = searchText;
      }
      
      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const response = await costAnalysisApi.getSourceCostLibrary(params);
      setDataSource(response.data.items);
      setTotal(response.data.total);
    } catch (error: any) {
      console.error('加载源商品成本库失败', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await costAnalysisApi.getSourceCostCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('加载类别列表失败', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: SourceCostItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      source_product_name: record.source_product_name,
      source_product_sku: record.source_product_sku,
      category: record.category,
      cost: record.cost,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: SourceCostItem) => {
    try {
      await costAnalysisApi.deleteSourceCost(record.id);
      message.success('删除成功');
      loadData();
      loadCategories(); // 重新加载类别列表
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingItem) {
        // 编辑
        await costAnalysisApi.updateSourceCost(editingItem.id, values);
        message.success('更新成功');
      } else {
        // 新增
        await costAnalysisApi.createSourceCost(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
      loadCategories(); // 重新加载类别列表
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data?.error || '操作失败');
      }
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const columns: ColumnsType<SourceCostItem> = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      align: 'center',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '源商品',
      dataIndex: 'source_product_name',
      key: 'source_product_name',
      width: 200,
    },
    {
      title: '源商品SKU',
      dataIndex: 'source_product_sku',
      key: 'source_product_sku',
      width: 180,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => category || '-',
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost) => `¥${cost.toFixed(2)}`,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
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
            title="确定要删除该源商品吗？"
            description="删除后相关的映射关系可能失效"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="tab-content">
      <div className="tab-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="tab-section-title" style={{ marginBottom: 0 }}>源商品成本库</h3>
          <Space>
            <Select
              placeholder="筛选类别"
              allowClear
              style={{ width: 150 }}
              value={categoryFilter || undefined}
              onChange={(value) => {
                setCategoryFilter(value || '');
                setPage(1);
              }}
              options={(categories || []).map(cat => ({ label: cat, value: cat }))}
            />
            <Input.Search
              placeholder="搜索源商品或SKU"
              allowClear
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加源商品
            </Button>
          </Space>
        </div>
        <Card>
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200 }}
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
        </Card>
      </div>

      {/* 添加/编辑源商品弹窗 */}
      <Modal
        title={editingItem ? '编辑源商品' : '添加源商品'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="源商品名称"
            name="source_product_name"
            rules={[{ required: true, message: '请输入源商品名称' }]}
          >
            <Input placeholder="例如：榴莲王披萨-7寸" />
          </Form.Item>
          <Form.Item
            label="源商品SKU"
            name="source_product_sku"
            rules={[{ required: true, message: '请输入源商品SKU' }]}
          >
            <Input placeholder="例如：LLWPZ-7" />
          </Form.Item>
          <Form.Item
            label="类别"
            name="category"
          >
            <Select
              placeholder="请选择或输入类别"
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
              options={(categories || []).map(cat => ({ label: cat, value: cat }))}
            />
          </Form.Item>
          <Form.Item
            label="成本"
            name="cost"
            rules={[
              { required: true, message: '请输入成本' },
              { type: 'number', min: 0, message: '成本不能小于0' }
            ]}
          >
            <InputNumber
              placeholder="请输入成本"
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="¥"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SourceCostLibraryTab;
