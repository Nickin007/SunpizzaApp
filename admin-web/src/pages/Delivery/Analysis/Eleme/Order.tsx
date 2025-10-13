import React from 'react';
import AnalysisPlaceholder from '../AnalysisPlaceholder';

const ElemeOrder: React.FC = () => {
  return (
    <AnalysisPlaceholder 
      platform="饿了么" 
      type="订单分析"
      description="统计订单数量、金额、时段分布等订单相关数据"
    />
  );
};

export default ElemeOrder;

