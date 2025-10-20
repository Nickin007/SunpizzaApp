import React from 'react';
import { Card, Empty } from 'antd';
import './DataBoard.css';

/**
 * 美团外卖 - 数据看板
 * 多维度数据分析与可视化展示
 */
const MeituanDataBoard: React.FC = () => {
  return (
    <div className="meituan-data-board">
      <Card className="data-board-card">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>美团外卖 - 数据看板</h2>
          <p className="page-description">多维度数据分析与可视化展示</p>
        </div>

        {/* 占位内容 - 待开发 */}
        <Empty
          description="美团外卖数据看板功能开发中..."
          style={{ padding: '80px 0' }}
        />
      </Card>
    </div>
  );
};

export default MeituanDataBoard;

