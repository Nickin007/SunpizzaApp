import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, message, DatePicker, Tag, Alert, Input, Modal, Form, InputNumber } from 'antd';
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import costAnalysisApi from '@/api/costAnalysis';

const { RangePicker } = DatePicker;

/**
 * 单品映射标签页
 * 包含单品映射数据库和未匹配订单两个子标签
 */
const ProductMappingProcessTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('database');

  // 单品映射数据库子标签
  const MappingDatabaseSubTab: React.FC = () => {
    interface MappingRecord {
      id: number;
      order_date: string;
      order_id: string;
      store_name: string;
      order_time: string;
      expected_income: number;
      product_info: string;
      parsed_products: string;
    }

    const [dataSource, setDataSource] = useState<MappingRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchText, setSearchText] = useState('');
    
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [dataStatus, setDataStatus] = useState<{ integration: boolean } | null>(null);
    const [mapping, setMapping] = useState(false);
    const [checkingData, setCheckingData] = useState(false);
    
    // 批量删除控制
    const [deleteDate, setDeleteDate] = useState<Dayjs | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    
    // 编辑控制
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MappingRecord | null>(null);
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
        
        const response = await costAnalysisApi.getMappedProducts(params);
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
        
        // 检查订单整合数据是否存在
        const response = await costAnalysisApi.getIntegrationStatus();
        const resData = (response.data as any).data || response.data;
        const dates = resData.dates || [];
        
        const integrationExists = dates.includes(dateStr);
        setDataStatus({ integration: integrationExists });
        
        if (integrationExists) {
          message.success(`${dateStr} 的订单整合数据已就绪，可以进行映射！`);
        } else {
          message.warning(`${dateStr} 没有订单整合数据，请先进行订单整合`);
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
      
      if (!dataStatus || !dataStatus.integration) {
        message.error('订单整合数据不可用，请先进行订单整合');
        return;
      }
      
      try {
        setMapping(true);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        message.loading({ content: `正在映射 ${dateStr} 的商品数据...`, key: 'mapping', duration: 0 });
        
        const response = await costAnalysisApi.mapProducts(dateStr);
        const resData = (response.data as any).data || response.data;
        
        message.success({
          content: `映射完成！已映射: ${resData.mapped_count} 条，未匹配: ${resData.unmatched_count} 条`,
          key: 'mapping',
          duration: 5,
        });
        
        // 刷新数据
        loadData();
      } catch (error: any) {
        message.error({ 
          content: error.response?.data?.message || '单品映射失败',
          key: 'mapping'
        });
      } finally {
        setMapping(false);
      }
    };

    useEffect(() => {
      if (selectedDate) {
        checkDateData();
      } else {
        setDataStatus(null);
      }
    }, [selectedDate]);

    const columns: ColumnsType<MappingRecord> = [
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
                  icon={dataStatus.integration ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  color={dataStatus.integration ? 'success' : 'error'}
                >
                  订单整合数据
                </Tag>
              </div>
            )}
            
            <Button 
              type="primary"
              icon={<SyncOutlined spin={mapping} />}
              onClick={handleMapping}
              loading={mapping || checkingData}
              disabled={!selectedDate || !dataStatus || !dataStatus.integration}
            >
              开始单品映射
            </Button>
          </div>
          
          {selectedDate && dataStatus && (
            <Alert
              style={{ marginTop: 16 }}
              message={
                dataStatus.integration
                  ? `${selectedDate.format('YYYY-MM-DD')} 的订单整合数据已就绪，可以进行映射`
                  : `${selectedDate.format('YYYY-MM-DD')} 的订单整合数据不可用，请先进行订单整合`
              }
              type={dataStatus.integration ? 'success' : 'warning'}
              showIcon
            />
          )}
        </Card>
        
        <div className="tab-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="tab-section-title" style={{ marginBottom: 0 }}>单品映射数据库</h3>
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
                emptyText: '暂无单品映射记录，请先执行单品映射',
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
              const response = await costAnalysisApi.deleteProductMappings(deleteDate.format('YYYY-MM-DD'));
              const resData = (response.data as any).data || response.data;
              message.success(`成功删除 ${resData.deleted_count} 条单品映射数据`);
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
                <p>确定要删除 <strong style={{ color: '#ff4d4f' }}>{deleteDate?.format('YYYY-MM-DD')}</strong> 的所有单品映射数据吗？</p>
                <p style={{ marginTop: 8, marginBottom: 0 }}>此操作不可恢复，请谨慎操作！</p>
              </div>
            }
            type="warning"
            showIcon
          />
        </Modal>
        
        {/* 编辑弹窗 */}
        <Modal
          title="编辑单品映射数据"
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
                product_info: values.product_info,
                parsed_products: values.parsed_products,
              };
              
              await costAnalysisApi.updateProductMappingRecord(editingRecord.id, submitData);
              message.success('单品映射更新成功');
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

  // 未匹配订单子标签
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
        
        // 添加日期过滤
        if (dateRange[0] && dateRange[1]) {
          params.start_date = dateRange[0].format('YYYY-MM-DD');
          params.end_date = dateRange[1].format('YYYY-MM-DD');
        }
        
        const response = await costAnalysisApi.getUnmatchedMappingOrders(params);
        const resData = (response.data as any).data || response.data;
        setDataSource(resData.items || []);
        setTotal(resData.total || 0);
      } catch (error: any) {
        console.error('加载未匹配订单失败', error);
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
        
        await costAnalysisApi.manualMatchProductMapping({
          unmatched_order_id: matchingOrder.id,
          parsed_products: values.parsed_products,
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
        title: '日期',
        dataIndex: 'order_date',
        key: 'order_date',
        width: 120,
      },
      {
        title: '下单时间',
        dataIndex: 'order_time',
        key: 'order_time',
        width: 180,
        render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
      },
      {
        title: '预计收入（元）',
        dataIndex: 'expected_income',
        key: 'expected_income',
        width: 130,
        align: 'right',
        render: (value: number) => value?.toFixed(2) || '0.00',
      },
      {
        title: '商品信息',
        dataIndex: 'product_info',
        key: 'product_info',
        ellipsis: true,
      },
      {
        title: '解析单品',
        dataIndex: 'parsed_products',
        key: 'parsed_products',
        width: 300,
        ellipsis: true,
        render: (text: string | undefined) => text || '-',
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
          message="未匹配订单提示"
          description="这些订单在单品映射过程中无法找到对应的源商品成本，请检查源商品成本库中是否已包含相关商品。"
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div className="tab-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="tab-section-title" style={{ marginBottom: 0 }}>未匹配订单列表</h3>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as [Dayjs | null, Dayjs | null]);
                  setPage(1);
                }}
                placeholder={['开始日期', '结束日期']}
                format="YYYY-MM-DD"
                style={{ width: 240 }}
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
          title="手动匹配 - 输入解析单品"
          open={matchModalVisible}
          onOk={handleSubmitMatch}
          onCancel={() => {
            setMatchModalVisible(false);
            matchForm.resetFields();
            setMatchingOrder(null);
          }}
          width={700}
          okText="提交"
          cancelText="取消"
        >
          {matchingOrder && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                message="该订单无法自动匹配单品，请手动输入解析单品"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', marginBottom: 16 }}>
                <p><strong>订单号：</strong>{matchingOrder.order_id}</p>
                <p><strong>门店名称：</strong>{matchingOrder.store_name}</p>
                <p><strong>日期：</strong>{matchingOrder.order_date}</p>
                <p><strong>预计收入：</strong>¥{matchingOrder.expected_income?.toFixed(2)}</p>
                <p style={{ marginBottom: 0 }}><strong>商品信息：</strong>{matchingOrder.product_info}</p>
              </div>
            </div>
          )}
          
          <Form form={matchForm} layout="vertical">
            <Form.Item
              label="解析单品"
              name="parsed_products"
              rules={[
                { required: true, message: '请输入解析单品' },
              ]}
              extra="格式示例：披萨*2,可乐*1,薯条*1"
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入解析后的单品信息，例如：披萨*2,可乐*1,薯条*1"
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };

  // 子标签配置
  const subTabItems = [
    {
      key: 'database',
      label: '📋 单品映射数据库',
      children: <MappingDatabaseSubTab />,
    },
    {
      key: 'unmatched',
      label: '⚠️ 未匹配订单',
      children: <UnmatchedOrdersSubTab />,
    },
  ];

  return (
    <div className="product-mapping-tab" style={{ padding: '0 0 24px 0' }}>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={subTabItems}
        className="mapping-sub-tabs"
        tabBarStyle={{ marginBottom: 16 }}
      />
    </div>
  );
};

export default ProductMappingProcessTab;


