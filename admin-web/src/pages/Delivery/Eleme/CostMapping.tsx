import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import {
  CostDashboardTab,
  CostCalendarTab,
  AppliedStoresTab,
  OrderIntegrationTab,
  ProductMappingProcessTab,
  CostMappingProcessTab,
  SourceCostLibraryTab,
  OrderParseDataTab,
} from './components';
import './CostMapping.css';

/**
 * 饿了么 - 成本分析
 * 管理和分析外卖订单的成本结构
 */
const ElemeCostAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  // Tab配置
  const tabItems = [
    {
      key: 'calendar',
      label: '📅 日历面板',
      children: <CostCalendarTab />,
    },
    {
      key: 'dashboard',
      label: '📊 成本看板',
      children: <CostDashboardTab />,
    },
    {
      key: 'stores',
      label: '🏪 应用门店',
      children: <AppliedStoresTab />,
    },
    {
      key: 'integration',
      label: '🔄 订单整合',
      children: <OrderIntegrationTab />,
    },
    {
      key: 'mapping-process',
      label: '🔗 单品映射',
      children: <ProductMappingProcessTab />,
    },
    {
      key: 'cost-mapping',
      label: '💸 成本映射',
      children: <CostMappingProcessTab />,
    },
    {
      key: 'library',
      label: '💰 源商品成本库',
      children: <SourceCostLibraryTab />,
    },
    {
      key: 'parse',
      label: '🗂️ 映射数据库',
      children: <OrderParseDataTab />,
    },
  ];

  return (
    <div className="eleme-cost-analysis">
      <Card className="cost-analysis-card">
        {/* 页面标题 */}
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
