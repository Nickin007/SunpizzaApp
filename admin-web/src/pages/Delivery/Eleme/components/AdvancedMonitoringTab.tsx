import React from 'react';
import { Result } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

/**
 * 进阶运营监控
 * 监控门店进阶指标（单量、收入、转化率等）
 * 当前为占位状态
 */
const AdvancedMonitoringTab: React.FC = () => {
  return (
    <Result
      icon={<RocketOutlined style={{ color: '#1890ff' }} />}
      title="进阶运营监控"
      subTitle="单量不达标、收入不达标、转化率异常等高级指标监控功能正在开发中..."
      style={{
        padding: '120px 32px',
      }}
    />
  );
};

export default AdvancedMonitoringTab;

