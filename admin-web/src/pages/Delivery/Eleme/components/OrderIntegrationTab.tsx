import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, message, Alert, DatePicker, Tag, Modal, Form, InputNumber, Input } from 'antd';
import { WarningOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import costAnalysisApi from '@/api/costAnalysis';
import elemeApi from '@/api/eleme';

const { RangePicker } = DatePicker;

/**
 * 订单整合标签页
 * 包含订单整合数据库和未匹配订单两个子标签
 */
const OrderIntegrationTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('database');

  // 订单整合数据库子标签
  const IntegrationDatabaseSubTab: React.FC = () => {
    interface IntegrationRecord {
      id: number;
      order_date: string; // 日期（饿了么）
      order_id: string; // 订单号（食亨）
      store_name: string; // 门店名称（食亨）
      order_time: string; // 下单时间（食亨）
      expected_income: number; // 预计收入（元）（食亨）
      product_info: string; // 商品信息（饿了么）
    }

    const [dataSource, setDataSource] = useState<IntegrationRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchText, setSearchText] = useState('');
    
    // 订单整合控制
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [dataStatus, setDataStatus] = useState<{ shiheng: boolean; eleme: boolean } | null>(null);
    const [integrating, setIntegrating] = useState(false);
    const [checkingData, setCheckingData] = useState(false);
    
    // 批量删除控制
    const [deleteDate, setDeleteDate] = useState<Dayjs | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    
    // 编辑控制
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState<IntegrationRecord | null>(null);
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
        
        const response = await costAnalysisApi.getIntegratedOrders(params);
        const resData = (response.data as any).data || response.data;
        setDataSource(resData.items || []);
        setTotal(resData.total || 0);
      } catch (error: any) {
        console.error('加载已整合订单失败', error);
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    // 检查选定日期的数据是否齐全
    const checkDateData = async () => {
      if (!selectedDate) {
        message.warning('请先选择日期');
        return;
      }
      
      try {
        setCheckingData(true);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        
        // 获取导入历史记录，检查该日期的数据
        const response = await elemeApi.getImportLogs(1, 1000);
        const resData = (response.data as any).data || response.data;
        const logs = resData.logs || [];
        
        // 检查该日期是否有食亨和饿了么的订单数据
        const shihengExists = logs.some((log: any) => 
          log.data_type === 'order_shiheng' && 
          log.data_date === dateStr && 
          log.status === 'completed' &&
          log.success_rows > 0
        );
        
        const elemeExists = logs.some((log: any) => 
          log.data_type === 'order_eleme' && 
          log.data_date === dateStr && 
          log.status === 'completed' &&
          log.success_rows > 0
        );
        
        setDataStatus({ shiheng: shihengExists, eleme: elemeExists });
        
        if (shihengExists && elemeExists) {
          message.success(`${dateStr} 的数据齐全，可以开始整合！`);
        } else {
          const missing = [];
          if (!shihengExists) missing.push('订单数据（食亨）');
          if (!elemeExists) missing.push('订单数据（饿了么）');
          message.warning(`${dateStr} 缺少以下数据：${missing.join('、')}`);
        }
      } catch (error: any) {
        message.error('检查数据失败');
      } finally {
        setCheckingData(false);
      }
    };
    
    // 执行订单整合
    const handleIntegrate = async () => {
      if (!selectedDate) {
        message.warning('请先选择日期');
        return;
      }
      
      if (!dataStatus || !dataStatus.shiheng || !dataStatus.eleme) {
        message.error('数据不齐全，无法整合！请先上传完整的订单数据。');
        return;
      }
      
      try {
        setIntegrating(true);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        message.loading({ content: `正在整合 ${dateStr} 的订单数据...`, key: 'integrate', duration: 0 });
        
        const response = await costAnalysisApi.integrateOrders(dateStr);
        const resData = (response.data as any).data || response.data;
        
        message.success({
          content: `整合完成！匹配成功: ${resData.matched_count} 条，未匹配（饿了么）: ${resData.unmatched_eleme_count} 条，未匹配（食亨）: ${resData.unmatched_shiheng_count} 条`,
          key: 'integrate',
          duration: 5,
        });
        
        // 刷新数据
        loadData();
      } catch (error: any) {
        message.error({ 
          content: error.response?.data?.message || '订单整合失败',
          key: 'integrate'
        });
      } finally {
        setIntegrating(false);
      }
    };
    
    // 日期选择变化时自动检查数据
    useEffect(() => {
      if (selectedDate) {
        checkDateData();
      } else {
        setDataStatus(null);
      }
    }, [selectedDate]);

    const columns: ColumnsType<IntegrationRecord> = [
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
        {/* 订单整合控制模块 */}
        <Card style={{ marginBottom: 24, background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500, color: '#595959' }}>选择日期：</span>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="选择要整合的日期"
                style={{ width: 200 }}
                format="YYYY-MM-DD"
              />
            </div>
            
            {selectedDate && dataStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag 
                  icon={dataStatus.shiheng ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  color={dataStatus.shiheng ? 'success' : 'error'}
                >
                  订单数据（食亨）
                </Tag>
                <Tag 
                  icon={dataStatus.eleme ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  color={dataStatus.eleme ? 'success' : 'error'}
                >
                  订单数据（饿了么）
                </Tag>
              </div>
            )}
            
            <Button 
              type="primary"
              icon={<SyncOutlined spin={integrating} />}
              onClick={handleIntegrate}
              loading={integrating || checkingData}
              disabled={!selectedDate || !dataStatus || !dataStatus.shiheng || !dataStatus.eleme}
            >
              开始订单整合
            </Button>
          </div>
          
          {selectedDate && dataStatus && (
            <Alert
              style={{ marginTop: 16 }}
              message={
                dataStatus.shiheng && dataStatus.eleme 
                  ? `${selectedDate.format('YYYY-MM-DD')} 的数据齐全，可以开始整合`
                  : `${selectedDate.format('YYYY-MM-DD')} 的数据不齐全，无法整合`
              }
              type={dataStatus.shiheng && dataStatus.eleme ? 'success' : 'warning'}
              showIcon
            />
          )}
        </Card>
        
        <div className="tab-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="tab-section-title" style={{ marginBottom: 0 }}>订单整合数据库</h3>
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
                  console.log('🔴 点击删除按钮', { deleteDate: deleteDate?.format('YYYY-MM-DD') });
                  
                  if (!deleteDate) {
                    console.log('🔴 没有选择日期，退出');
                    return;
                  }
                  
                  console.log('🔴 打开删除确认弹窗');
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
                showTotal: (total) => `共 ${total} 条已匹配订单`,
                onChange: (newPage, newPageSize) => {
                  setPage(newPage);
                  setPageSize(newPageSize || 20);
                },
              }}
              locale={{
                emptyText: '暂无订单整合记录，请先执行订单整合操作',
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
            
            console.log('🔴 用户点击了确认删除');
            try {
              setDeleting(true);
              console.log('🔴 开始调用删除API', deleteDate.format('YYYY-MM-DD'));
              const response = await costAnalysisApi.deleteIntegratedOrders(deleteDate.format('YYYY-MM-DD'));
              console.log('🔴 删除API响应', response);
              const resData = (response.data as any).data || response.data;
              message.success(`成功删除 ${resData.deleted_count} 条订单整合数据`);
              setDeleteDate(null);
              setDeleteModalVisible(false);
              loadData();
            } catch (error: any) {
              console.error('🔴 删除失败', error);
              message.error(error.response?.data?.message || '删除失败');
            } finally {
              setDeleting(false);
            }
          }}
          onCancel={() => {
            console.log('🔴 用户点击了取消');
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
                <p>确定要删除 <strong style={{ color: '#ff4d4f' }}>{deleteDate?.format('YYYY-MM-DD')}</strong> 的所有订单整合数据吗？</p>
                <p style={{ marginTop: 8, marginBottom: 0 }}>此操作不可恢复，请谨慎操作！</p>
              </div>
            }
            type="warning"
            showIcon
          />
        </Modal>
        
        {/* 编辑弹窗 */}
        <Modal
          title="编辑订单整合数据"
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
              };
              
              await costAnalysisApi.updateIntegratedOrder(editingRecord.id, submitData);
              message.success('订单更新成功');
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
              <Input.TextArea rows={4} />
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
      source: 'eleme' | 'shiheng'; // 来源
      order_id: string; // 订单号
      store_name: string; // 门店名称
      order_time: string; // 下单时间/日期
      order_date?: string; // 日期（饿了么）
      expected_income?: number; // 预计收入（食亨）
      product_info?: string; // 商品信息
    }

    const [dataSource, setDataSource] = useState<UnmatchedOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [elemeCount, setElemeCount] = useState(0);
    const [shihengCount, setShihengCount] = useState(0);
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
        
        const response = await costAnalysisApi.getUnmatchedOrders(params);
        const resData = (response.data as any).data || response.data;
        setDataSource(resData.items || []);
        setTotal(resData.total || 0);
        setElemeCount(resData.eleme_count || 0);
        setShihengCount(resData.shiheng_count || 0);
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
      
      // 如果来源是饿了么，预填商品信息和日期
      if (record.source === 'eleme') {
        matchForm.setFieldsValue({
          order_date: record.order_date ? dayjs(record.order_date) : null,
        });
      } else {
        // 如果来源是食亨，预填预计收入和时间
        matchForm.setFieldsValue({
          expected_income: record.expected_income,
          order_time: record.order_time ? dayjs(record.order_time) : null,
        });
      }
      
      setMatchModalVisible(true);
    };

    // 提交手动匹配
    const handleSubmitMatch = async () => {
      try {
        const values = await matchForm.validateFields();
        
        if (!matchingOrder) return;
        
        const submitData: any = {
          unmatched_order_id: matchingOrder.id,
        };
        
        // 根据来源不同，提交不同的数据
        if (matchingOrder.source === 'eleme') {
          // 饿了么订单：需要补充预计收入和下单时间
          submitData.expected_income = values.expected_income;
          submitData.order_time = values.order_time.format('YYYY-MM-DD HH:mm:ss');
        } else {
          // 食亨订单：需要补充商品信息
          submitData.product_info = values.product_info;
        }
        
        await costAnalysisApi.manualMatchOrder(submitData);
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
        title: '来源',
        dataIndex: 'source',
        key: 'source',
        width: 100,
        render: (source: string) => (
          <span style={{ 
            color: source === 'eleme' ? '#1890ff' : '#52c41a',
            fontWeight: 600 
          }}>
            {source === 'eleme' ? '饿了么' : '食亨'}
          </span>
        ),
        filters: [
          { text: '饿了么', value: 'eleme' },
          { text: '食亨', value: 'shiheng' },
        ],
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
        title: '日期/时间',
        key: 'datetime',
        width: 180,
        render: (_, record) => record.order_date || record.order_time || '-',
      },
      {
        title: '预计收入（元）',
        dataIndex: 'expected_income',
        key: 'expected_income',
        width: 130,
        align: 'right',
        render: (value: number | undefined) => value ? value.toFixed(2) : '-',
      },
      {
        title: '商品信息',
        dataIndex: 'product_info',
        key: 'product_info',
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
          message="未匹配订单警告"
          description={`发现 ${total} 条未匹配订单（饿了么: ${elemeCount} 条，食亨: ${shihengCount} 条）。这些订单在另一个数据源中没有对应的订单号，请检查数据完整性。`}
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
                  setPage(1); // 重置到第一页
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
          title="手动匹配订单"
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
                message={
                  matchingOrder.source === 'eleme' 
                    ? '该订单来自饿了么，需要补充食亨订单的信息' 
                    : '该订单来自食亨，需要补充饿了么订单的信息'
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                <p><strong>订单号：</strong>{matchingOrder.order_id}</p>
                <p><strong>门店名称：</strong>{matchingOrder.store_name}</p>
                {matchingOrder.source === 'eleme' ? (
                  <>
                    <p><strong>商品信息：</strong>{matchingOrder.product_info || '-'}</p>
                    <p><strong>日期：</strong>{matchingOrder.order_date || '-'}</p>
                  </>
                ) : (
                  <>
                    <p><strong>预计收入：</strong>¥{matchingOrder.expected_income?.toFixed(2) || '-'}</p>
                    <p><strong>下单时间：</strong>{matchingOrder.order_time || '-'}</p>
                  </>
                )}
              </div>
            </div>
          )}
          
          <Form form={matchForm} layout="vertical">
            {matchingOrder?.source === 'eleme' ? (
              // 饿了么订单：需要补充食亨的预计收入和下单时间
              <>
                <Form.Item
                  label="预计收入（元）"
                  name="expected_income"
                  rules={[{ required: true, message: '请输入预计收入' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    precision={2}
                    placeholder="请输入预计收入"
                  />
                </Form.Item>
                <Form.Item
                  label="下单时间"
                  name="order_time"
                  rules={[{ required: true, message: '请选择下单时间' }]}
                >
                  <DatePicker
                    showTime
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD HH:mm:ss"
                    placeholder="请选择下单时间"
                  />
                </Form.Item>
              </>
            ) : (
              // 食亨订单：需要补充饿了么的商品信息
              <Form.Item
                label="商品信息"
                name="product_info"
                rules={[{ required: true, message: '请输入商品信息' }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="请输入商品信息"
                />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    );
  };

  // 子标签配置
  const subTabItems = [
    {
      key: 'database',
      label: '📋 订单整合数据库',
      children: <IntegrationDatabaseSubTab />,
    },
    {
      key: 'unmatched',
      label: '⚠️ 未匹配订单',
      children: <UnmatchedOrdersSubTab />,
    },
  ];

  return (
    <div className="order-integration-tab" style={{ padding: '0 0 24px 0' }}>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab}
        items={subTabItems}
        className="integration-sub-tabs"
        tabBarStyle={{ marginBottom: 16 }}
      />
    </div>
  );
};

export default OrderIntegrationTab;

