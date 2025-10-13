import React, { useState } from 'react';
import { Card, Tabs, DatePicker, Select, Button, Space } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import DataUploadTab from './components/DataUploadTab';
import DatabaseEditTab from './components/DatabaseEditTab';
import BasicInfoTab from './components/BasicInfoTab';
import OperationHoursTab from './components/OperationHoursTab';
import OrderFinanceTab from './components/OrderFinanceTab';
import MarketingFunnelTab from './components/MarketingFunnelTab';
import ProductOperationTab from './components/ProductOperationTab';
import ServiceQualityTab from './components/ServiceQualityTab';
import './Store.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ElemeStore: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Tab配置
  const tabItems = [
    {
      key: 'upload',
      label: '数据上传',
      children: <DataUploadTab />,
    },
    {
      key: 'database',
      label: '数据库编辑',
      children: <DatabaseEditTab />,
    },
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
    // 刷新当前Tab的数据
    window.location.reload();
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('导出数据', { dateRange, selectedStores, selectedCities });
  };

  // 是否显示筛选栏（数据上传和数据库编辑不显示）
  const showFilters = !['upload', 'database'].includes(activeTab);

  return (
    <div className="eleme-store-analysis">
      <Card className="analysis-card">
        {/* 顶部筛选栏 */}
        {showFilters && (
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
        )}

        {/* Tab切换栏 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="analysis-tabs"
        />
      </Card>
    </div>
  );
};

export default ElemeStore;

