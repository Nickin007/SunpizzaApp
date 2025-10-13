import React from 'react';
import { Card, Empty } from 'antd';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const OperationHoursTab: React.FC<Props> = () => {
  return (
    <Card>
      <Empty description="运营时长分析功能开发中..." />
    </Card>
  );
};

export default OperationHoursTab;

