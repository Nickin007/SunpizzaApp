import React from 'react';
import { Card, Empty } from 'antd';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const ProductOperationTab: React.FC<Props> = () => {
  return (
    <Card>
      <Empty description="商品运营分析功能开发中..." />
    </Card>
  );
};

export default ProductOperationTab;

