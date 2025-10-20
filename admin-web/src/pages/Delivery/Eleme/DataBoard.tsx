import React, { useState } from 'react';
import { Card, Tabs, DatePicker, Select, Button, Space } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import BasicInfoTab from '../Analysis/Eleme/components/BasicInfoTab';
import OperationHoursTab from '../Analysis/Eleme/components/OperationHoursTab';
import OrderFinanceTab from '../Analysis/Eleme/components/OrderFinanceTab';
import MarketingFunnelTab from '../Analysis/Eleme/components/MarketingFunnelTab';
import ProductOperationTab from '../Analysis/Eleme/components/ProductOperationTab';
import ServiceQualityTab from '../Analysis/Eleme/components/ServiceQualityTab';
import './DataBoard.css';

const { RangePicker } = DatePicker;

/**
 * 饿了么 - 数据看板
 * 整合多个分析维度的数据展示
 */
const ElemeDataBoard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Tab配置 - 整合各维度分析
  const tabItems = [
    {
      key: 'basic',
      label: '基础信息',
      children: (
        <BasicInfoTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
    {
      key: 'operation',
      label: '运营时长',
      children: (
        <OperationHoursTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
    {
      key: 'finance',
      label: '订单财务',
      children: (
        <OrderFinanceTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
    {
      key: 'funnel',
      label: '营销漏斗',
      children: (
        <MarketingFunnelTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
    {
      key: 'product',
      label: '商品运营',
      children: (
        <ProductOperationTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
    {
      key: 'quality',
      label: '服务质量',
      children: (
        <ServiceQualityTab
          dateRange={dateRange}
          selectedStores={selectedStores}
          selectedCities={selectedCities}
        />
      ),
    },
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('导出数据', { dateRange, selectedStores, selectedCities });
  };

  return (
    <div className="eleme-data-board">
      <Card className="data-board-card">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>饿了么 - 数据看板</h2>
          <p className="page-description">多维度数据分析与可视化展示</p>
        </div>

        {/* 顶部筛选栏 */}
        <div className="filter-bar">
          <Space size="middle" wrap>
            <span className="filter-label">筛选条件：</span>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
            />
            <Select
              mode="multiple"
              placeholder="选择城市"
              style={{ minWidth: 200 }}
              value={selectedCities}
              onChange={setSelectedCities}
              allowClear
            >
              {/* 动态加载城市列表 */}
            </Select>
            <Select
              mode="multiple"
              placeholder="选择门店"
              style={{ minWidth: 250 }}
              value={selectedStores}
              onChange={setSelectedStores}
              allowClear
            >
              {/* 动态加载门店列表 */}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出
            </Button>
          </Space>
        </div>

        {/* Tab切换栏 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="data-board-tabs"
        />
      </Card>
    </div>
  );
};

export default ElemeDataBoard;

