import React from 'react';
import { Card, Empty } from 'antd';
import './Diagnosis.css';

/**
 * 美团外卖 - 门店诊断
 * 对门店进行问题诊断和健康度评估
 */
const MeituanDiagnosis: React.FC = () => {
  return (
    <div className="meituan-diagnosis">
      <Card className="diagnosis-card">
        <div className="page-header">
          <h2>美团外卖 - 门店诊断</h2>
          <p className="page-description">智能诊断门店运营问题，提供优化建议</p>
        </div>
        <Empty
          description="美团外卖门店诊断功能开发中..."
          style={{ padding: '80px 0' }}
        />
      </Card>
    </div>
  );
};

export default MeituanDiagnosis;

