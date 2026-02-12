import React from 'react';
import { Card, Typography, Row, Col, Space } from 'antd';
import { ToolOutlined, RocketOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Title, Paragraph } = Typography;

interface PlaceholderPageProps {
  title: string;
  description: string;
  color?: string;
  features?: { icon: React.ReactNode; title: string; description: string }[];
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, color = '#1890ff', features }) => {
  const { user } = useAuthStore();

  const defaultFeatures = features || [
    {
      icon: <RocketOutlined style={{ fontSize: 44, color }} />,
      title: '即将上线',
      description: '核心功能模块正在开发中',
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 44, color }} />,
      title: '数据驱动',
      description: '智能数据分析与决策支持',
    },
    {
      icon: <SettingOutlined style={{ fontSize: 44, color }} />,
      title: '灵活配置',
      description: '可定制化的业务流程管理',
    },
    {
      icon: <ToolOutlined style={{ fontSize: 44, color }} />,
      title: '持续迭代',
      description: '功能持续优化升级中',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          background: `linear-gradient(135deg, ${color}cc 0%, ${color} 100%)`,
          color: 'white',
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: `0 4px 20px ${color}40`,
        }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            欢迎，{user?.real_name || '用户'}！
          </Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, margin: 0 }}>
            {title} — {description}
          </Paragraph>
        </Space>
      </Card>

      <Row gutter={[24, 24]}>
        {defaultFeatures.map((feature, index) => (
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
            该模块功能正在紧锣密鼓地开发中，敬请期待！
          </Paragraph>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            如有任何建议或需求，请联系系统管理员。
          </Paragraph>
        </Space>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
