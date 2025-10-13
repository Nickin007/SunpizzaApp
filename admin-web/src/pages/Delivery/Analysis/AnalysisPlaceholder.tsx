import React from 'react';
import { Card, Empty, Typography, Space, Tag } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface AnalysisPlaceholderProps {
  platform: '饿了么' | '美团外卖';
  type: string;
  description?: string;
}

const AnalysisPlaceholder: React.FC<AnalysisPlaceholderProps> = ({ 
  platform, 
  type, 
  description 
}) => {
  const platformColors = {
    '饿了么': '#1890ff',
    '美团外卖': '#faad14',
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Tag 
              color={platformColors[platform]} 
              style={{ 
                fontSize: 14, 
                padding: '4px 16px',
                borderRadius: 16 
              }}
            >
              {platform}
            </Tag>
          </div>
          
          <Title level={3} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 12 }} />
            {type}
          </Title>
          
          {description && (
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 16 }}>
              {description}
            </Paragraph>
          )}
          
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <span style={{ fontSize: 16, color: '#999' }}>
                  该功能正在开发中...
                </span>
                <span style={{ fontSize: 14, color: '#bbb' }}>
                  敬请期待！
                </span>
              </Space>
            }
            style={{ marginTop: 40 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default AnalysisPlaceholder;

