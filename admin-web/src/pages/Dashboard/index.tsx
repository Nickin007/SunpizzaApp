import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { workOrdersApi } from '../../api/workOrders';
import { Statistics, WorkOrder } from '../../types';
import dayjs from 'dayjs';
import './index.css';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Statistics>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    archived: 0,
  });
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载统计数据
      const statsRes = await workOrdersApi.getStatistics();
      setStats(statsRes.data.data);

      // 加载最近的工单
      const ordersRes = await workOrdersApi.getWorkOrders({ page: 1, per_page: 10 });
      setRecentOrders(ordersRes.data.data.items);
    } catch (error) {
      console.error('加载数据失败：', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    '待受理': 'default',
    '进行中': 'processing',
    '已完成': 'success',
    '已归档': 'default',
  };

  const priorityColors: Record<string, string> = {
    '低': 'green',
    '中': 'orange',
    '高': 'red',
  };

  const columns = [
    {
      title: '工单标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: ['type', 'type_name'],
      key: 'type',
      render: (text: string, record: WorkOrder) => (
        <Tag color={record.type?.color}>{text}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: ['priority', 'priority_name'],
      key: 'priority',
      render: (text: string, record: WorkOrder) => (
        <Tag color={priorityColors[text] || 'default'}>{text}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: ['status', 'status_name'],
      key: 'status',
      render: (text: string) => (
        <Tag color={statusColors[text] || 'default'}>{text}</Tag>
      ),
    },
    {
      title: '门店',
      dataIndex: ['shop', 'name'],
      key: 'shop',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className="dashboard">
        <h2>数据概览</h2>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总工单数"
                value={stats.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待受理"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="进行中"
                value={stats.in_progress}
                prefix={<SyncOutlined spin />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="最近工单" extra={<InboxOutlined />}>
          <Table
            dataSource={recentOrders}
            columns={columns}
            rowKey="id"
            pagination={false}
          />
        </Card>
      </div>
    </Spin>
  );
};

export default Dashboard;

