import React from 'react';
import { Card, Empty } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import './Diagnosis.css';

/**
 * 饿了么 - 门店诊断
 * 【待开发】
 */
const ElemeDiagnosis: React.FC = () => {
  return (
    <div className="eleme-diagnosis" style={{ padding: '24px' }}>
      <Card>
        <Empty
          image={<CodeOutlined style={{ fontSize: 120, color: '#d9d9d9' }} />}
          imageStyle={{ height: 160 }}
          description={
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }}>
                饿了么 - 门店诊断
              </h2>
              <p style={{ fontSize: 16, color: '#8c8c8c' }}>
                功能开发中，敬请期待...
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default ElemeDiagnosis;
