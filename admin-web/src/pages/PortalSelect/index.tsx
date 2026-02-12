import React from 'react';
import { Card, Row, Col, Typography, Button, message } from 'antd';
import {
  ShopOutlined,
  AccountBookOutlined,
  DollarOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  LogoutOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/logo.png';
import './index.css';

const { Title, Text, Paragraph } = Typography;

interface PortalItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  roles: string[]; // 哪些角色可以看到
}

const PORTALS: PortalItem[] = [
  {
    key: 'delivery',
    title: '外卖运营数字化后台',
    description: '饿了么、美团外卖数据分析、成本分析、选址工具',
    icon: <ShopOutlined />,
    color: '#1890ff',
    path: '/delivery/welcome',
    roles: ['admin', 'delivery_operation'],
  },
  {
    key: 'supply-chain',
    title: '供应链数字化后台',
    description: '供应链管理、库存管理、采购管理',
    icon: <AccountBookOutlined />,
    color: '#52c41a',
    path: '/supply-chain',
    roles: ['admin', 'SupplyChain_operation'],
  },
  {
    key: 'accounting',
    title: '财务数字化后台',
    description: '财务报表、收支管理、成本核算',
    icon: <DollarOutlined />,
    color: '#fa8c16',
    path: '/accounting',
    roles: ['admin', 'Accouting_operation'],
  },
  {
    key: 'douyin',
    title: '抖音/小程序数字化后台',
    description: '抖音运营、小程序管理、线下门店数据',
    icon: <VideoCameraOutlined />,
    color: '#722ed1',
    path: '/douyin',
    roles: ['admin', 'DouyinANDOffline_operation'],
  },
  {
    key: 'admin',
    title: '账号权限管理后台',
    description: '用户账号管理、角色权限配置（仅管理员）',
    icon: <SettingOutlined />,
    color: '#f5222d',
    path: '/admin/users',
    roles: ['admin'],
  },
];

const PortalSelect: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const visiblePortals = PORTALS.filter(p => user && p.roles.includes(user.role));

  return (
    <div className="portal-container">
      {/* 顶部导航 */}
      <div className="portal-header">
        <div className="portal-header-left">
          <img src={logoImage} alt="Logo" className="portal-logo" />
          <Title level={4} style={{ margin: 0, color: '#fff' }}>圣比萨数字化管理平台</Title>
        </div>
        <div className="portal-header-right">
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginRight: 16 }}>
            {user?.real_name || '用户'}
          </Text>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            退出登录
          </Button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="portal-content">
        <div className="portal-welcome">
          <Title level={2} style={{ marginBottom: 8 }}>选择工作台</Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            请选择您要进入的管理后台
          </Paragraph>
        </div>

        <Row gutter={[24, 24]} justify="center" className="portal-cards">
          {visiblePortals.map(portal => (
            <Col key={portal.key} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="portal-card"
                onClick={() => navigate(portal.path)}
                style={{ borderTop: `4px solid ${portal.color}` }}
              >
                <div className="portal-card-icon" style={{ color: portal.color, background: `${portal.color}15` }}>
                  {portal.icon}
                </div>
                <Title level={5} className="portal-card-title">{portal.title}</Title>
                <Text type="secondary" className="portal-card-desc">{portal.description}</Text>
                <div className="portal-card-action">
                  <Button type="link" icon={<ArrowRightOutlined />} style={{ color: portal.color, padding: 0 }}>
                    进入
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 底部 */}
      <div className="portal-footer">
        <Text type="secondary">© 2024 圣比萨 SUN PIZZA. All rights reserved.</Text>
      </div>
    </div>
  );
};

export default PortalSelect;
