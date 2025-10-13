import React from 'react';
import { Card, Empty } from 'antd';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const OrderFinanceTab: React.FC<Props> = () => {
  return (
    <Card>
      <Empty description="订单财务分析功能开发中..." />
    </Card>
  );
};

export default OrderFinanceTab;

