import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Modal, Form, Input, Select, Popconfirm, AutoComplete } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import costAnalysisApi, { type ProductMappingItem, type SourceCostItem } from '../../../../api/costAnalysis';

/**
 * 映射数据库标签页（映射商品库）
 * 管理拆解单品 -> 映射源商品的映射关系
 */
const OrderParseDataTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<ProductMappingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductMappingItem | null>(null);
  const [form] = Form.useForm();
  
  // 源商品列表（用于自动完成）
  const [sourceProducts, setSourceProducts] = useState<SourceCostItem[]>([]);

  useEffect(() => {
    loadData();
    loadSourceProducts();
  }, [page, pageSize]);

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

      const response = await costAnalysisApi.getProductMapping(params);
        // 注意：后端返回的是 response.data.data（嵌套两层data）
      const resData = (response.data as any).data || response.data;
      setDataSource(resData.items || []);
      setTotal(resData.total || 0);
    } catch (error: any) {
      console.error('加载映射商品库失败', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSourceProducts = async () => {
    try {
      // 获取所有源商品（不分页，用于自动完成）
      const response = await costAnalysisApi.getSourceCostLibrary({ per_page: 1000 });
      const resData = (response.data as any).data || response.data;
      setSourceProducts(resData.items || []);
    } catch (error) {
      console.error('加载源商品列表失败', error);
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

  const handleEdit = (record: ProductMappingItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      parsed_product_name: record.parsed_product_name,
      source_product_name: record.source_product_name,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: ProductMappingItem) => {
    try {
      await costAnalysisApi.deleteProductMapping(record.id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingItem) {
        // 编辑
        await costAnalysisApi.updateProductMapping(editingItem.id, values);
        message.success('更新成功');
      } else {
        // 新增
        await costAnalysisApi.createProductMapping(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
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

  // 当选择源商品时（预留）
  const handleSourceProductSelect = (value: string) => {
    // 可用于未来扩展
  };

  const columns: ColumnsType<ProductMappingItem> = [
    {
      title: '序号',
      key: 'index',
      width: 70,
      align: 'center',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '拆解单品',
      dataIndex: 'parsed_product_name',
      key: 'parsed_product_name',
      width: 250,
    },
    {
      title: <span><LinkOutlined /> 映射源商品</span>,
      dataIndex: 'source_product_name',
      key: 'source_product_name',
      width: 200,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
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
            title="确定要删除该映射吗？"
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
          <h3 className="tab-section-title" style={{ marginBottom: 0 }}>映射数据库</h3>
          <Space>
            <Input.Search
              placeholder="搜索拆解单品或源商品"
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
              添加映射
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

      {/* 添加/编辑映射弹窗 */}
      <Modal
        title={editingItem ? '编辑映射' : '添加映射'}
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
            label="拆解单品名称"
            name="parsed_product_name"
            rules={[{ required: true, message: '请输入拆解单品名称' }]}
            extra="从订单中解析出的商品名称，例如：榴莲王7寸、榴莲王7寸（手拍）"
          >
            <Input placeholder="例如：榴莲王7寸" />
          </Form.Item>
          <Form.Item
            label="映射源商品名称"
            name="source_product_name"
            rules={[{ required: true, message: '请选择映射源商品' }]}
            extra="选择一个已存在的源商品进行映射"
          >
            <AutoComplete
              placeholder="请选择或输入源商品名称"
              options={(sourceProducts || []).map(p => ({ 
                value: p.source_product_name,
                label: p.source_product_name,
              }))}
              onSelect={handleSourceProductSelect}
              filterOption={(inputValue, option) =>
                option?.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderParseDataTab;
