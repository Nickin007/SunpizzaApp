import React from 'react';
import { Card, Empty } from 'antd';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const ServiceQualityTab: React.FC<Props> = () => {
  return (
    <Card>
      <Empty description="服务质量分析功能开发中..." />
    </Card>
  );
};

export default ServiceQualityTab;

