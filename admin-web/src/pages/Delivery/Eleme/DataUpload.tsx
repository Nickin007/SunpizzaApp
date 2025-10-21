import React from 'react';
import { Card, Tabs } from 'antd';
import UploadCalendarTab from '../Analysis/Eleme/components/UploadCalendarTab';
import DataUploadTab from '../Analysis/Eleme/components/DataUploadTab';
import DatabaseEditTab from '../Analysis/Eleme/components/DatabaseEditTab';
import DataViewTab from '../Analysis/Eleme/components/DataViewTab';
import ActiveStoreTab from '../Analysis/Eleme/components/ActiveStoreTab';
import './DataUpload.css';

/**
 * 饿了么 - 数据上传
 * Excel数据上传、数据查看和数据库字段管理
 */
const ElemeDataUpload: React.FC = () => {
  const tabItems = [
    {
      key: 'calendar',
      label: '📅 上传日历',
      children: <UploadCalendarTab />,
    },
    {
      key: 'upload',
      label: '📤 数据上传',
      children: <DataUploadTab />,
    },
    {
      key: 'view',
      label: '📊 数据查看',
      children: <DataViewTab />,
    },
    {
      key: 'database',
      label: '🗄️ 数据库配置',
      children: <DatabaseEditTab />,
    },
    {
      key: 'active-stores',
      label: '🏪 在营门店列表',
      children: <ActiveStoreTab />,
    },
  ];

  return (
    <div className="eleme-data-upload">
      <Card className="data-upload-card">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>饿了么 - 数据管理</h2>
          <p className="page-description">数据上传、数据查看与数据库字段配置</p>
        </div>

        {/* Tab切换 */}
        <Tabs
          defaultActiveKey="upload"
          items={tabItems}
          className="data-upload-tabs"
        />
      </Card>
    </div>
  );
};

export default ElemeDataUpload;

