import React from 'react';
import { Card, Empty } from 'antd';
import './DataUpload.css';

/**
 * 美团外卖 - 数据上传
 * Excel数据上传和数据库字段管理
 */
const MeituanDataUpload: React.FC = () => {
  return (
    <div className="meituan-data-upload">
      <Card className="data-upload-card">
        <div className="page-header">
          <h2>美团外卖 - 数据上传</h2>
          <p className="page-description">上传Excel数据文件，管理数据库字段配置</p>
        </div>
        <Empty
          description="美团外卖数据上传功能开发中..."
          style={{ padding: '80px 0' }}
        />
      </Card>
    </div>
  );
};

export default MeituanDataUpload;

