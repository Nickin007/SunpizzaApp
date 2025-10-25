import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  ShopOutlined,
  DatabaseOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import {
  CostDashboardTab,
  CostCalendarTab,
  AppliedStoresTab,
  SourceCostLibraryTab,
  OrderParseDataTab,
} from './components';
import './CostMapping.css';

/**
 * 饿了么 - 成本分析
 * 管理和分析外卖订单的成本结构
 */
const ElemeCostAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Tab配置
  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          成本看板
        </span>
      ),
      children: <CostDashboardTab />,
    },
    {
      key: 'calendar',
      label: (
        <span>
          <CalendarOutlined />
          日历面板
        </span>
      ),
      children: <CostCalendarTab />,
    },
    {
      key: 'stores',
      label: (
        <span>
          <ShopOutlined />
          应用门店
        </span>
      ),
      children: <AppliedStoresTab />,
    },
    {
      key: 'library',
      label: (
        <span>
          <DatabaseOutlined />
          源商品成本库
        </span>
      ),
      children: <SourceCostLibraryTab />,
    },
    {
      key: 'parse',
      label: (
        <span>
          <FileTextOutlined />
          映射数据库
        </span>
      ),
      children: <OrderParseDataTab />,
    },
  ];

  return (
    <div className="eleme-cost-analysis">
      <Card className="cost-analysis-card">
        <div className="page-header">
          <h2>饿了么 - 成本分析</h2>
          <p className="page-description">成本数据管理、商品映射与成本分析配置</p>
        </div>

        {/* Tab切换栏 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="cost-analysis-tabs"
        />
      </Card>
    </div>
  );
};

export default ElemeCostAnalysis;
