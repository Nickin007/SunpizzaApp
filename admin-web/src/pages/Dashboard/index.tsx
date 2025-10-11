import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { workOrdersApi } from '../../api/workOrders';
import { usersApi } from '../../api/users';
import { shopsApi } from '../../api/shops';
import type { Statistics } from '../../types';
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
  const [userStats, setUserStats] = useState({
    admin: 0,
    regional_manager: 0,
    shop_manager: 0,
  });
  const [shopCount, setShopCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载工单统计数据
      const statsRes = await workOrdersApi.getStatistics();
      setStats(statsRes.data.data);

      // 加载用户角色统计
      const [adminRes, managerRes, shopManagerRes] = await Promise.all([
        usersApi.getUsers({ role: 'admin', per_page: 1000 }),
        usersApi.getUsers({ role: 'regional_manager', per_page: 1000 }),
        usersApi.getUsers({ role: 'shop_manager', per_page: 1000 }),
      ]);
      
      setUserStats({
        admin: adminRes.data.data.total,
        regional_manager: managerRes.data.data.total,
        shop_manager: shopManagerRes.data.data.total,
      });

      // 加载门店统计
      const shopsRes = await shopsApi.getShops({ per_page: 1000 });
      setShopCount(shopsRes.data.data.total);
    } catch (error) {
      console.error('加载数据失败：', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Spin spinning={loading}>
      <div className="dashboard">
        <h2>数据概览</h2>
        
        {/* 工单状态统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="总工单数"
                value={stats.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="待受理"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="进行中"
                value={stats.in_progress}
                prefix={<SyncOutlined spin />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic
                title="已完成"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 账号角色统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card className="stat-card role-admin">
              <Statistic
                title="管理员账号"
                value={userStats.admin}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#e31e24' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card role-manager">
              <Statistic
                title="区域经理账号"
                value={userStats.regional_manager}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="stat-card role-shop-manager">
              <Statistic
                title="店长账号"
                value={userStats.shop_manager}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 门店统计 */}
        <Row gutter={16}>
          <Col span={24}>
            <Card className="stat-card shop-count-card">
              <Statistic
                title="🏪 门店总数"
                value={shopCount}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#722ed1', fontSize: '36px' }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;

