import React from 'react';
import { Card, Empty } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import './CostAnalysis.css';

const MeituanCostAnalysis: React.FC = () => {
  return (
    <div className="cost-analysis">
      <Card className="cost-analysis-container">
        <div className="page-header">
          <h2>
            <DollarOutlined style={{ marginRight: 8 }} />
            美团外卖 - 成本分析
          </h2>
          <p className="page-description">此模块正在建设中...</p>
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="成本分析功能即将上线"
          style={{ marginTop: 50 }}
        />
      </Card>
    </div>
  );
};

export default MeituanCostAnalysis;
