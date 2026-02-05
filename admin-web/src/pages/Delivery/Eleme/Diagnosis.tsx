import React from 'react';
import { Card, Empty } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import './Diagnosis.css';

/**
 * 饿了么 - 门店诊断
 * 功能待开发
 */
const ElemeDiagnosis: React.FC = () => {
  return (
    <div className="eleme-diagnosis">
      <Card className="diagnosis-container">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>
            <RocketOutlined style={{ marginRight: 8 }} />
            饿了么 - 门店诊断
          </h2>
          <p className="page-description">商品数据分析 · 数字化指标筛选</p>
        </div>

        {/* 占位内容 */}
        <Empty 
          description="功能开发中，敬请期待" 
          style={{ padding: '80px 0' }}
        />
      </Card>
    </div>
  );
};

export default ElemeDiagnosis;
