import React from 'react';
import AnalysisPlaceholder from '../AnalysisPlaceholder';

const MeituanProduct: React.FC = () => {
  return (
    <AnalysisPlaceholder 
      platform="美团外卖" 
      type="商品分析"
      description="分析商品销量、热销榜单、库存状态等数据"
    />
  );
};

export default MeituanProduct;

