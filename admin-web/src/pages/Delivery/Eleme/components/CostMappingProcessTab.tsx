import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, message, DatePicker, Tag, Alert, Modal, Form, InputNumber, Input } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import costAnalysisApi from '@/api/costAnalysis';

const { RangePicker } = DatePicker;

/**
 * 成本映射标签页
 * 包含成本映射数据库和未匹配订单两个子标签
 */
const CostMappingProcessTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('database');

  // 子标签配置
  const subTabItems = [
    {
      key: 'database',
      label: '💸 成本映射数据库',
      children: <CostMappingDatabaseSubTab />,
    },
    {
      key: 'unmatched',
      label: '⚠️ 未匹配订单',
      children: <UnmatchedOrdersSubTab />,
    },
  ];

  return (
    <div className="cost-mapping-tab" style={{ padding: '0 0 24px 0' }}>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={subTabItems}
        className="cost-mapping-sub-tabs"
        tabBarStyle={{ marginBottom: 16 }}
      />
    </div>
  );
};

/**
 * 成本映射数据库子Tab
 */
const CostMappingDatabaseSubTab: React.FC = () => {
  interface CostMappingRecord {
    id: number;
    order_date: string;
    order_id: string;
    store_name: string;
    order_time: string;
    expected_income: number;
    order_cost: number;
    product_info: string;
    parsed_products: string;
  }

  const [dataSource, setDataSource] = useState<CostMappingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dataStatus, setDataStatus] = useState<{ mapping: boolean } | null>(null);
  const [mappingCost, setMappingCost] = useState(false);
  const [checkingData, setCheckingData] = useState(false);
  
  // 批量删除控制
  const [deleteDate, setDeleteDate] = useState<Dayjs | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  // 编辑控制
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CostMappingRecord | null>(null);
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [page, pageSize, searchText]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: pageSize,
      };
      
      if (searchText) {
        params.search = searchText;
      }
      
      const response = await costAnalysisApi.getCostMappedOrders(params);
      const resData = (response.data as any).data || response.data;
      setDataSource(resData.items || []);
      setTotal(resData.total || 0);
    } catch (error: any) {
      console.error('加载数据失败', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const checkDateData = async () => {
    if (!selectedDate) {
      message.warning('请先选择日期');
      return;
    }
    
    try {
      setCheckingData(true);
      const dateStr = selectedDate.format('YYYY-MM-DD');
      
      // 检查单品映射数据是否存在
      const response = await costAnalysisApi.getMappingStatus();
      const resData = (response.data as any).data || response.data;
      const dates = resData.dates || [];
      
      const mappingExists = dates.includes(dateStr);
      setDataStatus({ mapping: mappingExists });
      
      if (mappingExists) {
        message.success(`${dateStr} 的单品映射数据已就绪，可以进行成本映射！`);
      } else {
        message.warning(`${dateStr} 没有单品映射数据，请先进行单品映射`);
      }
      
    } catch (error: any) {
      message.error('检查数据失败');
    } finally {
      setCheckingData(false);
    }
  };

  const handleMapping = async () => {
    if (!selectedDate) {
      message.warning('请先选择日期');
      return;
    }
    
    if (!dataStatus || !dataStatus.mapping) {
      message.error('单品映射数据不可用，请先进行单品映射');
      return;
    }
    
    try {
      setMappingCost(true);
      const dateStr = selectedDate.format('YYYY-MM-DD');
      message.loading({ content: `正在映射 ${dateStr} 的成本数据...`, key: 'cost-mapping', duration: 0 });
      
      const response = await costAnalysisApi.mapCosts(dateStr);
      const resData = (response.data as any).data || response.data;
      
      message.success({
        content: `映射完成！已映射: ${resData.mapped_count} 条，未匹配: ${resData.unmatched_count} 条`,
        key: 'cost-mapping',
        duration: 5,
      });
      
      // 刷新数据
      loadData();
    } catch (error: any) {
      message.error({ 
        content: error.response?.data?.message || '成本映射失败',
        key: 'cost-mapping'
      });
    } finally {
      setMappingCost(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      checkDateData();
    } else {
      setDataStatus(null);
    }
  }, [selectedDate]);

  const columns: ColumnsType<CostMappingRecord> = [
    {
      title: '日期',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 120,
      sorter: true,
    },
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 180,
    },
    {
      title: '下单时间',
      dataIndex: 'order_time',
      key: 'order_time',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '预计收入',
      dataIndex: 'expected_income',
      key: 'expected_income',
      width: 140,
      render: (income: number) => `¥${income?.toFixed(2) || '0.00'}`,
      sorter: true,
    },
    {
      title: '订单成本',
      dataIndex: 'order_cost',
      key: 'order_cost',
      width: 140,
      render: (cost: number) => (
        <span style={{ color: '#cf1322', fontWeight: 600 }}>
          ¥{cost?.toFixed(2) || '0.00'}
        </span>
      ),
      sorter: true,
    },
    {
      title: '商品信息',
      dataIndex: 'product_info',
      key: 'product_info',
      width: 300,
      ellipsis: true,
    },
    {
      title: '解析单品',
      dataIndex: 'parsed_products',
      key: 'parsed_products',
      width: 300,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setEditingRecord(record);
            editForm.setFieldsValue({
              order_date: record.order_date ? dayjs(record.order_date) : null,
              order_id: record.order_id,
              store_name: record.store_name,
              order_time: record.order_time ? dayjs(record.order_time) : null,
              expected_income: record.expected_income,
              order_cost: record.order_cost,
              product_info: record.product_info,
              parsed_products: record.parsed_products,
            });
            setEditModalVisible(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="tab-content">
      <Card style={{ marginBottom: 24, background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 500, color: '#595959' }}>选择日期：</span>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="选择要映射的日期"
              style={{ width: 200 }}
              format="YYYY-MM-DD"
            />
          </div>
          
          {selectedDate && dataStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tag 
                icon={dataStatus.mapping ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                color={dataStatus.mapping ? 'success' : 'error'}
              >
                单品映射数据
              </Tag>
            </div>
          )}
          
          <Button 
            type="primary"
            icon={<SyncOutlined spin={mappingCost} />}
            onClick={handleMapping}
            loading={mappingCost || checkingData}
            disabled={!selectedDate || !dataStatus || !dataStatus.mapping}
          >
            开始成本映射
          </Button>
        </div>
        
        {selectedDate && dataStatus && (
          <Alert
            style={{ marginTop: 16 }}
            message={
              dataStatus.mapping
                ? `${selectedDate.format('YYYY-MM-DD')} 的单品映射数据已就绪，可以进行成本映射`
                : `${selectedDate.format('YYYY-MM-DD')} 的单品映射数据不可用，请先进行单品映射`
            }
            type={dataStatus.mapping ? 'success' : 'warning'}
            showIcon
          />
        )}
      </Card>
      
      <div className="tab-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="tab-section-title" style={{ marginBottom: 0 }}>成本映射数据库</h3>
          <Space>
            <DatePicker
              placeholder="选择要删除的日期"
              style={{ width: 180 }}
              format="YYYY-MM-DD"
              value={deleteDate}
              onChange={setDeleteDate}
            />
            <Button 
              danger
              loading={deleting}
              disabled={!deleteDate}
              onClick={() => {
                if (!deleteDate) return;
                setDeleteModalVisible(true);
              }}
            >
              删除该日期数据
            </Button>
            <Input.Search
              placeholder="搜索订单号或门店名称"
              allowClear
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => {
                setPage(1);
                loadData();
              }}
            />
            <Button icon={<SyncOutlined />} onClick={loadData}>刷新</Button>
          </Space>
        </div>
        <Card>
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条映射记录`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize || 20);
              },
            }}
            locale={{
              emptyText: '暂无成本映射记录，请先执行成本映射',
            }}
          />
        </Card>
      </div>
      
      {/* 删除确认弹窗 */}
      <Modal
        title="⚠️ 确认删除"
        open={deleteModalVisible}
        onOk={async () => {
          if (!deleteDate) return;
          
          try {
            setDeleting(true);
            const response = await costAnalysisApi.deleteCostMappings(deleteDate.format('YYYY-MM-DD'));
            const resData = (response.data as any).data || response.data;
            message.success(`成功删除 ${resData.deleted_count} 条成本映射数据`);
            setDeleteDate(null);
            setDeleteModalVisible(false);
            loadData();
          } catch (error: any) {
            message.error(error.response?.data?.message || '删除失败');
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false);
        }}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelButtonProps={{ disabled: deleting }}
        closable={!deleting}
        maskClosable={!deleting}
      >
        <Alert
          message="危险操作"
          description={
            <div>
              <p>确定要删除 <strong style={{ color: '#ff4d4f' }}>{deleteDate?.format('YYYY-MM-DD')}</strong> 的所有成本映射数据吗？</p>
              <p style={{ marginTop: 8, marginBottom: 0 }}>此操作不可恢复，请谨慎操作！</p>
            </div>
          }
          type="warning"
          showIcon
        />
      </Modal>
      
      {/* 编辑弹窗 */}
      <Modal
        title="编辑成本映射数据"
        open={editModalVisible}
        onOk={async () => {
          try {
            const values = await editForm.validateFields();
            if (!editingRecord) return;
            
            const submitData = {
              order_date: values.order_date?.format('YYYY-MM-DD'),
              order_id: values.order_id,
              store_name: values.store_name,
              order_time: values.order_time?.format('YYYY-MM-DD HH:mm:ss'),
              expected_income: values.expected_income,
              order_cost: values.order_cost,
              product_info: values.product_info,
              parsed_products: values.parsed_products,
            };
            
            await costAnalysisApi.updateCostMapping(editingRecord.id, submitData);
            message.success('成本映射更新成功');
            setEditModalVisible(false);
            editForm.resetFields();
            setEditingRecord(null);
            loadData();
          } catch (error: any) {
            message.error(error.response?.data?.message || '更新失败');
          }
        }}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingRecord(null);
        }}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="日期" name="order_date" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="订单号" name="order_id" rules={[{ required: true, message: '请输入订单号' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="门店名称" name="store_name" rules={[{ required: true, message: '请输入门店名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="下单时间" name="order_time" rules={[{ required: true, message: '请选择下单时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
          </Form.Item>
          <Form.Item label="预计收入（元）" name="expected_income" rules={[{ required: true, message: '请输入预计收入' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item label="订单成本（元）" name="order_cost" rules={[{ required: true, message: '请输入订单成本' }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item label="商品信息" name="product_info" rules={[{ required: true, message: '请输入商品信息' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="解析单品" name="parsed_products" rules={[{ required: true, message: '请输入解析单品' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

/**
 * 未匹配订单子Tab
 */
const UnmatchedOrdersSubTab: React.FC = () => {
  interface UnmatchedOrder {
    id: number;
    order_id: string;
    store_name: string;
    order_time: string;
    order_date: string;
    expected_income: number;
    product_info: string;
    parsed_products?: string;
  }

  const [dataSource, setDataSource] = useState<UnmatchedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  
  // 手动匹配相关状态
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchingOrder, setMatchingOrder] = useState<UnmatchedOrder | null>(null);
  const [matchForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [page, pageSize, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: pageSize,
      };
      
      if (dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await costAnalysisApi.getUnmatchedCostMappingOrders(params);
      const resData = (response.data as any).data || response.data;
      setDataSource(resData.items || []);
      setTotal(resData.total || 0);
    } catch (error: any) {
      console.error('加载数据失败', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开手动匹配弹窗
  const handleManualMatch = (record: UnmatchedOrder) => {
    setMatchingOrder(record);
    matchForm.resetFields();
    setMatchModalVisible(true);
  };

  // 提交手动匹配
  const handleSubmitMatch = async () => {
    try {
      const values = await matchForm.validateFields();
      
      if (!matchingOrder) return;
      
      await costAnalysisApi.manualMatchCostMapping({
        unmatched_order_id: matchingOrder.id,
        order_cost: values.order_cost,
      });
      
      message.success('手动匹配成功');
      setMatchModalVisible(false);
      matchForm.resetFields();
      setMatchingOrder(null);
      
      // 刷新未匹配订单列表
      loadData();
    } catch (error: any) {
      console.error('手动匹配失败:', error);
      message.error(error.response?.data?.message || '手动匹配失败');
    }
  };

  const columns: ColumnsType<UnmatchedOrder> = [
    {
      title: '日期',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 120,
      sorter: true,
    },
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 180,
    },
    {
      title: '下单时间',
      dataIndex: 'order_time',
      key: 'order_time',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '预计收入',
      dataIndex: 'expected_income',
      key: 'expected_income',
      width: 140,
      render: (income: number) => `¥${income?.toFixed(2) || '0.00'}`,
      sorter: true,
    },
    {
      title: '商品信息',
      dataIndex: 'product_info',
      key: 'product_info',
      width: 300,
      ellipsis: true,
    },
    {
      title: '解析单品',
      dataIndex: 'parsed_products',
      key: 'parsed_products',
      width: 300,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleManualMatch(record)}
        >
          手动匹配
        </Button>
      ),
    },
  ];

  return (
    <div className="tab-content">
      <Alert
        message="未匹配订单说明"
        description="这些订单因为解析的单品在映射数据库或源商品成本库中找不到对应的成本信息，无法完成成本映射。请检查映射数据库和源商品成本库的配置。"
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />
      
      <div className="tab-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="tab-section-title" style={{ marginBottom: 0 }}>未匹配订单</h3>
          <Space>
            <span style={{ color: '#8c8c8c' }}>日期范围：</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [null, null])}
              placeholder={['开始日期', '结束日期']}
            />
            <Button onClick={() => setDateRange([null, null])}>清除</Button>
            <Button icon={<SyncOutlined />} onClick={loadData}>刷新</Button>
          </Space>
        </div>
        <Card>
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条未匹配订单`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize || 20);
              },
            }}
            locale={{
              emptyText: '暂无未匹配订单',
            }}
          />
        </Card>
      </div>
      
      {/* 手动匹配Modal */}
      <Modal
        title="手动匹配 - 输入订单成本"
        open={matchModalVisible}
        onOk={handleSubmitMatch}
        onCancel={() => {
          setMatchModalVisible(false);
          matchForm.resetFields();
          setMatchingOrder(null);
        }}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        {matchingOrder && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="该订单无法自动匹配成本，请手动输入订单成本"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
              <p><strong>订单号：</strong>{matchingOrder.order_id}</p>
              <p><strong>门店名称：</strong>{matchingOrder.store_name}</p>
              <p><strong>预计收入：</strong>¥{matchingOrder.expected_income?.toFixed(2)}</p>
              <p><strong>商品信息：</strong>{matchingOrder.product_info}</p>
              {matchingOrder.parsed_products && (
                <p><strong>解析单品：</strong>{matchingOrder.parsed_products}</p>
              )}
            </div>
          </div>
        )}
        
        <Form form={matchForm} layout="vertical">
          <Form.Item
            label="订单成本（元）"
            name="order_cost"
            rules={[
              { required: true, message: '请输入订单成本' },
              { type: 'number', min: 0, message: '成本不能小于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入订单成本"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CostMappingProcessTab;

