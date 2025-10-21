import React from 'react';
import { Card, Tabs } from 'antd';
import { FundOutlined, RocketOutlined } from '@ant-design/icons';
import BasicMonitoringTab from './components/BasicMonitoringTab';
import AdvancedMonitoringTab from './components/AdvancedMonitoringTab';
import './DataBoard.css';

/**
 * 饿了么 - 数据看板
 * 门店运营监控面板
 */
const ElemeDataBoard: React.FC = () => {
  const tabItems = [
    {
      key: 'basic',
      label: (
        <span>
          <FundOutlined />
          基础运营监控
        </span>
      ),
      children: <BasicMonitoringTab />,
    },
    {
      key: 'advanced',
      label: (
        <span>
          <RocketOutlined />
          进阶运营监控
        </span>
      ),
      children: <AdvancedMonitoringTab />,
    },
  ];

  return (
    <div className="eleme-data-board">
      <Card className="data-board-container">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>饿了么 - 数据看板</h2>
          <p className="page-description">门店运营实时监控 · 基础指标 + 进阶分析</p>
        </div>

        {/* Tab切换 */}
        <Tabs
          defaultActiveKey="basic"
          items={tabItems}
          className="data-board-tabs"
          size="large"
        />
      </Card>
    </div>
  );
};

export default ElemeDataBoard;
