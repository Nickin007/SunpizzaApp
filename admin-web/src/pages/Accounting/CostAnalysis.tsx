import React, { useState } from 'react';
import { Segmented, Empty } from 'antd';
import { ThunderboltOutlined, ShopOutlined, RocketOutlined, CoffeeOutlined } from '@ant-design/icons';
import ElemeCostAnalysis from '../Delivery/Eleme/CostAnalysis';
import MeituanCostAnalysis from '../Delivery/Meituan/CostAnalysis';

const PLATFORMS = [
  {
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
        <ThunderboltOutlined />
        <span>淘宝闪购</span>
      </div>
    ),
    value: 'taobao',
  },
  {
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
        <ShopOutlined />
        <span>美团外卖</span>
      </div>
    ),
    value: 'meituan',
  },
  {
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
        <RocketOutlined />
        <span>京东外卖</span>
      </div>
    ),
    value: 'jingdong',
  },
  {
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
        <CoffeeOutlined />
        <span>堂食/自提/团购</span>
      </div>
    ),
    value: 'dine_in',
  },
];

const AccountingCostAnalysis: React.FC = () => {
  const [platform, setPlatform] = useState<string>('taobao');

  return (
    <div>
      <div style={{
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#595959' }}>选择平台：</span>
        <Segmented
          options={PLATFORMS}
          value={platform}
          onChange={(val) => setPlatform(val as string)}
          size="large"
        />
      </div>

      {platform === 'taobao' && <ElemeCostAnalysis />}
      {platform === 'meituan' && <MeituanCostAnalysis />}
      {platform === 'jingdong' && (
        <Empty description="京东外卖成本分析模块即将上线" style={{ marginTop: 80 }} />
      )}
      {platform === 'dine_in' && (
        <Empty description="堂食/自提/团购成本分析模块即将上线" style={{ marginTop: 80 }} />
      )}
    </div>
  );
};

export default AccountingCostAnalysis;
