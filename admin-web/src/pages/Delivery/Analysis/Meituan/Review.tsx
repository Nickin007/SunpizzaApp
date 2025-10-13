import React from 'react';
import AnalysisPlaceholder from '../AnalysisPlaceholder';

const MeituanReview: React.FC = () => {
  return (
    <AnalysisPlaceholder 
      platform="美团外卖" 
      type="评价分析"
      description="统计用户评价、好评率、差评原因等数据"
    />
  );
};

export default MeituanReview;

