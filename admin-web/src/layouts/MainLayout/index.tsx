import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShopOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  AppstoreOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/logo.png';
import './index.css';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 构建菜单项，根据用户角色动态显示
  const buildMenuItems = () => {
    const items = [
      {
        key: '/admin/dashboard',
        icon: <DashboardOutlined />,
        label: '仪表板',
      },
      {
        key: 'store-training',
        icon: <AppstoreOutlined />,
        label: '店务&培训',
        children: [
          {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: '用户管理',
          },
          {
            key: '/admin/shops',
            icon: <ShopOutlined />,
            label: '门店管理',
          },
          {
            key: '/admin/work-orders',
            icon: <FileTextOutlined />,
            label: '工单管理',
          },
          {
            key: '/admin/training',
            icon: <BookOutlined />,
            label: '培训管理',
          },
          {
            key: '/admin/dict',
            icon: <SettingOutlined />,
            label: '字典管理',
          },
        ],
      },
    ];

    // 仅对admin角色显示"外卖运营管理"菜单
    if (user?.role === 'admin') {
      items.push({
        key: 'delivery-management',
        icon: <RocketOutlined />,
        label: '外卖运营管理',
        children: [
          {
            key: 'delivery-placeholder',
            icon: <SettingOutlined />,
            label: '功能开发中...',
          },
        ],
      });
    }

    return items;
  };

  const menuItems = buildMenuItems();

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
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="custom-sider">
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
          className="custom-menu"
        />
      </Sider>
      <Layout className="main-content-layout">
        <Header className="header">
          <div className="header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
            })}
          </div>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span className="username">{user?.real_name || '管理员'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

