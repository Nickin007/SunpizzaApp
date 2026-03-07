import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Drawer, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  CompassOutlined,
  FileExcelOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import logoImage from '../../assets/logo.png';
import ChatDrawer from '../../components/ChatDrawer';
import './index.css';

const { Header, Sider, Content } = Layout;

const DeliveryLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
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
      key: '/delivery/site-selection',
      icon: <EnvironmentOutlined />,
      label: '选址工具',
    },
    {
      key: 'eleme',
      icon: <CompassOutlined />,
      label: '饿了么',
      children: [
        {
          key: '/delivery/eleme/excel-toolkit',
          icon: <FileExcelOutlined />,
          label: '数据分析库',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
      if (isMobile) setDrawerOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'portal',
      icon: <HomeOutlined />,
      label: '返回工作台',
      onClick: () => navigate('/portal-select'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const siderContent = (
    <>
      <div className="logo">
        <img src={logoImage} alt="圣比萨 Logo" className="logo-large" />
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        className="delivery-menu"
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #91d5ff 0%, #69c0ff 100%)' } }}
          closeIcon={<CloseOutlined style={{ color: '#333' }} />}
        >
          {siderContent}
        </Drawer>
      ) : (
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
      )}
      <Layout className="delivery-content-layout">
        <Header className="delivery-header">
          <div className="header-left">
            {isMobile ? (
              <MenuOutlined className="trigger" onClick={() => setDrawerOpen(true)} />
            ) : (
              React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                className: 'trigger',
                onClick: () => setCollapsed(!collapsed),
              })
            )}
            <h2 className="delivery-title" style={{ margin: 0, color: '#1890ff', fontWeight: 600 }}>
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
      <ChatDrawer />
    </Layout>
  );
};

export default DeliveryLayout;
