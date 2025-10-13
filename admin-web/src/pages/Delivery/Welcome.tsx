import React from 'react';
import { Card, Typography, Row, Col, Space } from 'antd';
import { RocketOutlined, BarChartOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Title, Paragraph } = Typography;

const Welcome: React.FC = () => {
  const { user } = useAuthStore();

  const features = [
    {
      icon: <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: '快速启动',
      description: '即将上线的外卖运营功能模块',
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: '数据分析',
      description: '实时监控外卖业务运营数据',
    },
    {
      icon: <TeamOutlined style={{ fontSize: 48, color: '#faad14' }} />,
      title: '团队协作',
      description: '高效管理外卖团队和订单',
    },
    {
      icon: <SettingOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      title: '系统设置',
      description: '灵活配置业务流程和规则',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
        }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            欢迎，{user?.real_name || '外卖运营'}！
          </Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, margin: 0 }}>
            圣比萨外卖运营管理系统 - 您的智能外卖业务助手
          </Paragraph>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={12} lg={6} key={index}>
            <Card
              hoverable
              style={{
                textAlign: 'center',
                borderRadius: 12,
                height: '100%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
              bodyStyle={{ padding: 32 }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>{feature.icon}</div>
                <Title level={4} style={{ margin: 0 }}>
                  {feature.title}
                </Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                  {feature.description}
                </Paragraph>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{
          marginTop: 24,
          borderRadius: 12,
          background: '#f5f5f5',
        }}
        bordered={false}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            🚀 功能开发中
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            外卖运营管理功能正在紧锣密鼓地开发中，敬请期待！
          </Paragraph>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            如有任何建议或需求，请联系系统管理员。
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default Welcome;

