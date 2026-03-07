import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Spin } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { getDashboard } from '../../api/supplyChain';
import type { DashboardData, SCOrder } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title } = Typography;

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'processing' },
  approved: { text: '已审核', color: 'blue' },
  rejected: { text: '已驳回', color: 'red' },
  shipping: { text: '配送中', color: 'orange' },
  shipped: { text: '已发货', color: 'green' },
  completed: { text: '已完成', color: 'default' },
};

const Dashboard: React.FC = () => {
  const isMobile = useIsMobile();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getDashboard();
        setData(res.data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 180 },
    { title: '门店', dataIndex: 'store_name', key: 'store_name', width: 120 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => {
        const info = statusMap[v] || { text: v, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '金额', dataIndex: 'total_amount', key: 'total_amount', width: 100,
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: (v: string) => v?.replace('T', ' ').slice(0, 16),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>供应链看板</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="待审核订单"
              value={data?.pending_count || 0}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="待发货订单"
              value={data?.approved_count || 0}
              prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="低库存预警"
              value={data?.low_stock_count || 0}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: data?.low_stock_count ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={data?.today_orders || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近订单" style={{ marginTop: 24 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.recent_orders || []}
          pagination={false}
          scroll={{ x: 600 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
