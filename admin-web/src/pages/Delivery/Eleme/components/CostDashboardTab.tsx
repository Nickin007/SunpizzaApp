import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  DatePicker, 
  Select, 
  Space, 
  message,
  Spin,
  Empty,
  Tag
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  ShopOutlined,
  PercentageOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import costAnalysisApi from '@/api/costAnalysis';
import './CostDashboardTab.css';

interface StoreData {
  store_name: string;
  total_revenue: number;
  total_cost: number;
  profit_margin: number;
  order_count: number;
}

interface SummaryData {
  total_revenue: number;
  total_cost: number;
  avg_profit_margin: number;
  total_orders: number;
  store_count: number;
}

interface TrendData {
  date: string;
  total_revenue: number;
  total_cost: number;
  profit_margin: number;
  order_count: number;
}

/**
 * 成本看板标签页
 * 展示整体成本分析数据和趋势
 */
const CostDashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [storeList, setStoreList] = useState<StoreData[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  
  // 单店趋势
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  // 加载门店统计数据
  const loadStoreStats = async (date?: Dayjs) => {
    try {
      setLoading(true);
      const dateStr = (date || selectedDate).format('YYYY-MM-DD');
      const response = await costAnalysisApi.getDashboardStoreStats(dateStr);
      const resData = (response.data as any).data || response.data;
      
      setStoreList(resData.stores || []);
      setSummary(resData.summary || null);
      
      // 如果有门店数据且还没选择门店，默认选择第一个
      if (resData.stores && resData.stores.length > 0 && !selectedStore) {
        setSelectedStore(resData.stores[0].store_name);
      }
    } catch (error: any) {
      console.error('加载门店统计失败:', error);
      message.error(error.response?.data?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载单店趋势数据
  const loadStoreTrend = async (storeName: string) => {
    if (!storeName) return;
    
    try {
      setTrendLoading(true);
      const response = await costAnalysisApi.getDashboardStoreTrend(storeName, 7);
      const resData = (response.data as any).data || response.data;
      
      setTrendData(resData.trend || []);
    } catch (error: any) {
      console.error('加载门店趋势失败:', error);
      message.error(error.response?.data?.message || '加载趋势数据失败');
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    loadStoreStats();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStoreTrend(selectedStore);
    }
  }, [selectedStore]);

  // 处理日期变化
  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
      loadStoreStats(date);
    }
  };

  // 门店表格列定义
  const columns: ColumnsType<StoreData> = [
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      fixed: 'left',
      width: 200,
      render: (name: string) => (
        <span style={{ fontWeight: 500 }}>{name}</span>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color="blue">{count}</Tag>
      ),
    },
    {
      title: '总实收（元）',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      width: 150,
      align: 'right',
      render: (revenue: number) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          ¥{revenue.toFixed(2)}
        </span>
      ),
      sorter: (a, b) => a.total_revenue - b.total_revenue,
    },
    {
      title: '总成本（元）',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 150,
      align: 'right',
      render: (cost: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
          ¥{cost.toFixed(2)}
        </span>
      ),
      sorter: (a, b) => a.total_cost - b.total_cost,
    },
    {
      title: '毛利率',
      dataIndex: 'profit_margin',
      key: 'profit_margin',
      width: 120,
      align: 'right',
      render: (margin: number) => {
        const color = margin >= 50 ? '#52c41a' : margin >= 30 ? '#faad14' : '#ff4d4f';
        return (
          <span style={{ color, fontWeight: 600, fontSize: 16 }}>
            {margin.toFixed(2)}%
          </span>
        );
      },
      sorter: (a, b) => a.profit_margin - b.profit_margin,
      defaultSortOrder: 'descend',
    },
  ];

  // 获取毛利率颜色
  const getProfitMarginColor = (margin: number) => {
    if (margin >= 50) return '#52c41a';
    if (margin >= 30) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <div className="cost-dashboard">
      <Spin spinning={loading}>
        {/* 日期选择器 */}
        <Card className="dashboard-header" style={{ marginBottom: 24 }}>
          <Space>
            <span style={{ fontSize: 16, fontWeight: 500 }}>选择日期：</span>
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              style={{ width: 200 }}
            />
          </Space>
        </Card>

        {/* 汇总数据卡片 */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                bordered={false}
                className="stat-card"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                }}
              >
                <Statistic
                  title={<span style={{ color: '#fff', fontSize: 14 }}>门店数量</span>}
                  value={summary.store_count}
                  suffix="家"
                  prefix={<ShopOutlined />}
                  valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card 
                bordered={false}
                className="stat-card"
                style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: '#fff',
                }}
              >
                <Statistic
                  title={<span style={{ color: '#fff', fontSize: 14 }}>总实收</span>}
                  value={summary.total_revenue}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="元"
                  valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card 
                bordered={false}
                className="stat-card"
                style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: '#fff',
                }}
              >
                <Statistic
                  title={<span style={{ color: '#fff', fontSize: 14 }}>总成本</span>}
                  value={summary.total_cost}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="元"
                  valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card 
                bordered={false}
                className="stat-card"
                style={{
                  background: `linear-gradient(135deg, ${getProfitMarginColor(summary.avg_profit_margin)} 0%, ${getProfitMarginColor(summary.avg_profit_margin)}dd 100%)`,
                  color: '#fff',
                }}
              >
                <Statistic
                  title={<span style={{ color: '#fff', fontSize: 14 }}>平均毛利率</span>}
                  value={summary.avg_profit_margin}
                  precision={2}
                  prefix={<RiseOutlined />}
                  suffix="%"
                  valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 门店明细表格 */}
        <Card 
          title={
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              📊 门店成本明细
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={columns}
            dataSource={storeList}
            rowKey="store_name"
            pagination={false}
            scroll={{ x: 800 }}
            locale={{
              emptyText: <Empty description="暂无数据，请先完成成本映射" />,
            }}
          />
        </Card>

        {/* 单店毛利率走势 */}
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                <LineChartOutlined /> 单店毛利率走势（近7天）
              </span>
              <Select
                value={selectedStore}
                onChange={setSelectedStore}
                style={{ width: 200 }}
                placeholder="选择门店"
                options={storeList.map(store => ({
                  label: store.store_name,
                  value: store.store_name,
                }))}
              />
            </div>
          }
        >
          {trendLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin tip="加载中..." />
            </div>
          ) : trendData.length > 0 ? (
            <div className="trend-chart">
              {/* 简易趋势表格 */}
              <Table
                columns={[
                  {
                    title: '日期',
                    dataIndex: 'date',
                    key: 'date',
                    width: 120,
                  },
                  {
                    title: '订单数',
                    dataIndex: 'order_count',
                    key: 'order_count',
                    width: 100,
                    align: 'center',
                    render: (count: number) => <Tag color="blue">{count}</Tag>,
                  },
                  {
                    title: '总实收（元）',
                    dataIndex: 'total_revenue',
                    key: 'total_revenue',
                    width: 150,
                    align: 'right',
                    render: (revenue: number) => (
                      <span style={{ color: '#52c41a', fontWeight: 600 }}>
                        ¥{revenue.toFixed(2)}
                      </span>
                    ),
                  },
                  {
                    title: '总成本（元）',
                    dataIndex: 'total_cost',
                    key: 'total_cost',
                    width: 150,
                    align: 'right',
                    render: (cost: number) => (
                      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                        ¥{cost.toFixed(2)}
                      </span>
                    ),
                  },
                  {
                    title: '毛利率',
                    dataIndex: 'profit_margin',
                    key: 'profit_margin',
                    width: 120,
                    align: 'right',
                    render: (margin: number) => {
                      const color = getProfitMarginColor(margin);
                      return (
                        <span style={{ color, fontWeight: 600, fontSize: 16 }}>
                          {margin.toFixed(2)}%
                        </span>
                      );
                    },
                  },
                ]}
                dataSource={trendData}
                rowKey="date"
                pagination={false}
                size="small"
              />
            </div>
          ) : (
            <Empty description="暂无趋势数据" style={{ padding: '60px 0' }} />
          )}
        </Card>
      </Spin>
    </div>
  );
};

export default CostDashboardTab;
