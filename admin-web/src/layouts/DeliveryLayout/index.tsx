import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  ShopOutlined,
  ShoppingOutlined,
  GiftOutlined,
  StarOutlined,
  RiseOutlined,
  TeamOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/logo.png';
import './index.css';

const { Header, Sider, Content } = Layout;

const DeliveryLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/delivery/welcome',
      icon: <DashboardOutlined />,
      label: '首页',
    },
    {
      key: 'eleme-analysis',
      icon: <BarChartOutlined />,
      label: '饿了么数据分析',
      children: [
        {
          key: '/delivery/eleme/store',
          icon: <ShopOutlined />,
          label: '门店分析',
        },
        {
          key: '/delivery/eleme/order',
          icon: <ShoppingOutlined />,
          label: '订单分析',
        },
        {
          key: '/delivery/eleme/product',
          icon: <GiftOutlined />,
          label: '商品分析',
        },
        {
          key: '/delivery/eleme/review',
          icon: <StarOutlined />,
          label: '评价分析',
        },
        {
          key: '/delivery/eleme/growth',
          icon: <RiseOutlined />,
          label: '商家成长分析',
        },
        {
          key: '/delivery/eleme/fans',
          icon: <TeamOutlined />,
          label: '粉丝群分析',
        },
      ],
    },
    {
      key: 'meituan-analysis',
      icon: <BarChartOutlined />,
      label: '美团外卖数据分析',
      children: [
        {
          key: '/delivery/meituan/brand',
          icon: <CrownOutlined />,
          label: 'BETTER品牌分析',
        },
        {
          key: '/delivery/meituan/store',
          icon: <ShopOutlined />,
          label: '门店分析',
        },
        {
          key: '/delivery/meituan/order',
          icon: <ShoppingOutlined />,
          label: '订单分析',
        },
        {
          key: '/delivery/meituan/product',
          icon: <GiftOutlined />,
          label: '商品分析',
        },
        {
          key: '/delivery/meituan/review',
          icon: <StarOutlined />,
          label: '评价分析',
        },
        {
          key: '/delivery/meituan/fans',
          icon: <TeamOutlined />,
          label: '粉丝群分析',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    // 只有叶子节点才进行导航
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light" 
        className="delivery-sider"
        width={260}
        collapsedWidth={80}
      >
        <div className="logo">
          {collapsed ? (
            <img src={logoImage} alt="Logo" className="logo-small" />
          ) : (
            <img src={logoImage} alt="圣比萨 Logo" className="logo-large" />
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="delivery-menu"
        />
      </Sider>
      <Layout className="delivery-content-layout">
        <Header className="delivery-header">
          <div className="header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
            })}
            <h2 style={{ margin: 0, color: '#1890ff', fontSize: '20px', fontWeight: 600 }}>
              外卖运营管理系统
            </h2>
          </div>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span className="username">{user?.real_name || '外卖运营'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="delivery-page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DeliveryLayout;

