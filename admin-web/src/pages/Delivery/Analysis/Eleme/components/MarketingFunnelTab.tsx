import React from 'react';
import { Card, Empty } from 'antd';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const MarketingFunnelTab: React.FC<Props> = () => {
  return (
    <Card>
      <Empty description="营销漏斗分析功能开发中..." />
    </Card>
  );
};

export default MarketingFunnelTab;

