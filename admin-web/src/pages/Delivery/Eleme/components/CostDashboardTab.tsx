import React from 'react';
import { Card, Row, Col, Statistic, Empty } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  PercentageOutlined,
  RiseOutlined
} from '@ant-design/icons';

/**
 * 成本看板标签页
 * 展示整体成本分析数据和趋势
 */
const CostDashboardTab: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="tab-section">
        <h3 className="tab-section-title">成本概览</h3>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总订单数"
                value={0}
                prefix={<ShoppingCartOutlined />}
                suffix="单"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总成本"
                value={0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="平均成本率"
                value={0}
                precision={2}
                prefix={<PercentageOutlined />}
                suffix="%"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="成本趋势"
                value={0}
                precision={2}
                prefix={<RiseOutlined />}
                suffix="%"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="tab-section" style={{ marginTop: 24 }}>
        <h3 className="tab-section-title">成本分析图表</h3>
        <Card>
          <Empty
            description="成本分析图表功能开发中..."
            style={{ padding: '60px 0' }}
          />
        </Card>
      </div>
    </div>
  );
};

export default CostDashboardTab;

