import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/logo.png';
import type { ItemType } from 'antd/es/menu/interface';
import './index.css';

const { Header, Sider, Content } = Layout;

/** 每个门户的主题色配置 */
export interface PortalTheme {
  /** 主色 */
  primary: string;
  /** 主色深色 */
  primaryDark: string;
  /** 侧边栏渐变起始（浅） */
  siderGradientFrom: string;
  /** 侧边栏渐变结束（深一些） */
  siderGradientTo: string;
  /** 菜单 hover 背景渐变浅色 */
  menuHoverFrom: string;
  menuHoverTo: string;
  /** 菜单选中渐变 */
  menuSelectedFrom: string;
  menuSelectedTo: string;
  /** logo 阴影色 */
  logoShadow: string;
}

interface PortalLayoutProps {
  title: string;
  theme: PortalTheme;
  menuItems: ItemType[];
}

/** 预设主题 */
export const THEMES = {
  green: {
    primary: '#52c41a',
    primaryDark: '#389e0d',
    siderGradientFrom: '#b7eb8f',
    siderGradientTo: '#95de64',
    menuHoverFrom: '#f6ffed',
    menuHoverTo: '#d9f7be',
    menuSelectedFrom: '#52c41a',
    menuSelectedTo: '#389e0d',
    logoShadow: 'rgba(82, 196, 26, 0.1)',
  } as PortalTheme,
  orange: {
    primary: '#fa8c16',
    primaryDark: '#d46b08',
    siderGradientFrom: '#ffd591',
    siderGradientTo: '#ffc069',
    menuHoverFrom: '#fff7e6',
    menuHoverTo: '#ffe7ba',
    menuSelectedFrom: '#fa8c16',
    menuSelectedTo: '#d46b08',
    logoShadow: 'rgba(250, 140, 22, 0.1)',
  } as PortalTheme,
  purple: {
    primary: '#722ed1',
    primaryDark: '#531dab',
    siderGradientFrom: '#d3adf7',
    siderGradientTo: '#b37feb',
    menuHoverFrom: '#f9f0ff',
    menuHoverTo: '#efdbff',
    menuSelectedFrom: '#722ed1',
    menuSelectedTo: '#531dab',
    logoShadow: 'rgba(114, 46, 209, 0.1)',
  } as PortalTheme,
  red: {
    primary: '#f5222d',
    primaryDark: '#cf1322',
    siderGradientFrom: '#ffa39e',
    siderGradientTo: '#ff7875',
    menuHoverFrom: '#fff1f0',
    menuHoverTo: '#ffccc7',
    menuSelectedFrom: '#f5222d',
    menuSelectedTo: '#cf1322',
    logoShadow: 'rgba(245, 34, 45, 0.1)',
  } as PortalTheme,
};

const PortalLayout: React.FC<PortalLayoutProps> = ({ title, theme, menuItems }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleMenuClick = ({ key }: { key: string }) => {
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

  // 用 CSS 变量注入主题色
  const cssVars = {
    '--portal-primary': theme.primary,
    '--portal-primary-dark': theme.primaryDark,
    '--portal-sider-from': theme.siderGradientFrom,
    '--portal-sider-to': theme.siderGradientTo,
    '--portal-hover-from': theme.menuHoverFrom,
    '--portal-hover-to': theme.menuHoverTo,
    '--portal-selected-from': theme.menuSelectedFrom,
    '--portal-selected-to': theme.menuSelectedTo,
    '--portal-logo-shadow': theme.logoShadow,
  } as React.CSSProperties;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5', ...cssVars }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className="portal-sider"
        width={260}
        collapsedWidth={80}
      >
        <div className="portal-logo-box">
          {collapsed ? (
            <img src={logoImage} alt="Logo" className="portal-logo-small" />
          ) : (
            <img src={logoImage} alt="圣比萨 Logo" className="portal-logo-large" />
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="portal-menu"
        />
      </Sider>
      <Layout className="portal-content-layout">
        <Header className="portal-header">
          <div className="portal-header-left">
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'portal-trigger',
              onClick: () => setCollapsed(!collapsed),
            })}
            <h2 style={{ margin: 0, color: theme.primary, fontSize: '20px', fontWeight: 600 }}>
              {title}
            </h2>
          </div>
          <div className="portal-header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="portal-user-info">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: theme.primary }} />
                <span className="portal-username">{user?.real_name || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="portal-page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default PortalLayout;
