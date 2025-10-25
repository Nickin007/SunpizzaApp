import React from 'react';
import { Card, Empty } from 'antd';
import './CostMapping.css';

/**
 * 美团外卖 - 成本分析
 * 分析和管理外卖平台成本结构
 */
const MeituanCostMapping: React.FC = () => {
  return (
    <div className="meituan-cost-mapping">
      <Card className="cost-mapping-card">
        <div className="page-header">
          <h2>美团外卖 - 成本分析</h2>
          <p className="page-description">分析和管理外卖平台成本结构，优化利润率</p>
        </div>
        <Empty
          description="美团外卖成本分析功能开发中..."
          style={{ padding: '80px 0' }}
        />
      </Card>
    </div>
  );
};

export default MeituanCostMapping;

