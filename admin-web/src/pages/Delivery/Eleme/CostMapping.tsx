import React, { useState } from 'react';
import { Card, Table, Select, Button, Space, InputNumber, message, Statistic, Row, Col } from 'antd';
import { SaveOutlined, ReloadOutlined, CalculatorOutlined } from '@ant-design/icons';
import './CostMapping.css';

/**
 * 饿了么 - 成本映射
 * 分析和管理外卖平台成本结构
 */
const ElemeCostMapping: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [costData, setCostData] = useState([
    {
      key: '1',
      category: '平台费用',
      item: '平台服务费',
      type: 'percentage',
      value: 18,
      unit: '%',
      amount: 1260,
      editable: false,
    },
    {
      key: '2',
      category: '平台费用',
      item: '履约服务费',
      type: 'fixed',
      value: 4.5,
      unit: '元/单',
      amount: 702,
      editable: false,
    },
    {
      key: '3',
      category: '营销费用',
      item: '平台活动补贴',
      type: 'fixed',
      value: 8,
      unit: '元/单',
      amount: 1248,
      editable: true,
    },
    {
      key: '4',
      category: '营销费用',
      item: '商家优惠券',
      type: 'fixed',
      value: 5,
      unit: '元/单',
      amount: 780,
      editable: true,
    },
    {
      key: '5',
      category: '包装成本',
      item: '包装费',
      type: 'fixed',
      value: 2,
      unit: '元/单',
      amount: 312,
      editable: true,
    },
    {
      key: '6',
      category: '原材料成本',
      item: '食材成本率',
      type: 'percentage',
      value: 35,
      unit: '%',
      amount: 2450,
      editable: true,
    },
  ]);

  // 模拟门店列表
  const storeOptions = [
    { label: '圣比萨（朝阳店）', value: 'store_1' },
    { label: '圣比萨（海淀店）', value: 'store_2' },
    { label: '圣比萨（昌平店）', value: 'store_3' },
  ];

  // 模拟财务数据
  const mockFinanceData = {
    totalRevenue: 7000, // 总收入
    orderCount: 156, // 订单数
  };

  const columns = [
    {
      title: '成本分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '成本项目',
      dataIndex: 'item',
      key: 'item',
      width: 150,
    },
    {
      title: '成本值',
      dataIndex: 'value',
      key: 'value',
      width: 150,
      render: (value: number, record: any) => {
        if (record.editable) {
          return (
            <InputNumber
              value={value}
              onChange={(newValue) => handleValueChange(record.key, newValue || 0)}
              min={0}
              max={record.type === 'percentage' ? 100 : 1000}
              step={record.type === 'percentage' ? 1 : 0.5}
              addonAfter={record.unit}
              style={{ width: '100%' }}
            />
          );
        }
        return `${value} ${record.unit}`;
      },
    },
    {
      title: '金额（元）',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '占比',
      key: 'ratio',
      width: 100,
      render: (_: any, record: any) => {
        const ratio = (record.amount / mockFinanceData.totalRevenue) * 100;
        return `${ratio.toFixed(2)}%`;
      },
    },
  ];

  const handleValueChange = (key: string, newValue: number) => {
    setCostData((prevData) =>
      prevData.map((item) => {
        if (item.key === key) {
          // 重新计算金额
          let newAmount = 0;
          if (item.type === 'percentage') {
            newAmount = (mockFinanceData.totalRevenue * newValue) / 100;
          } else {
            newAmount = newValue * mockFinanceData.orderCount;
          }
          return { ...item, value: newValue, amount: newAmount };
        }
        return item;
      })
    );
  };

  const handleSave = () => {
    setLoading(true);
    // TODO: 调用后端API保存成本配置
    setTimeout(() => {
      setLoading(false);
      message.success('成本配置保存成功！');
    }, 1000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // 计算总成本
  const totalCost = costData.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = mockFinanceData.totalRevenue - totalCost;
  const profitRate = (netProfit / mockFinanceData.totalRevenue) * 100;

  return (
    <div className="eleme-cost-mapping">
      <Card className="cost-mapping-card">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>饿了么 - 成本映射</h2>
          <p className="page-description">分析和管理外卖平台成本结构，优化利润率</p>
        </div>

        {/* 筛选栏 */}
        <div className="filter-bar">
          <Space size="middle" wrap>
            <span className="filter-label">选择门店：</span>
            <Select
              placeholder="请选择门店"
              style={{ width: 300 }}
              value={selectedStore}
              onChange={setSelectedStore}
              options={storeOptions}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              disabled={!selectedStore}
            >
              保存配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </div>

        {/* 财务摘要 */}
        {selectedStore && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={mockFinanceData.totalRevenue}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总成本"
                    value={totalCost}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="净利润"
                    value={netProfit}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: netProfit >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="利润率"
                    value={profitRate}
                    suffix="%"
                    precision={2}
                    valueStyle={{ color: profitRate >= 10 ? '#3f8600' : profitRate >= 5 ? '#faad14' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 成本明细表格 */}
            <Card title={<span><CalculatorOutlined /> 成本明细</span>} style={{ marginBottom: 24 }}>
              <Table
                columns={columns}
                dataSource={costData}
                pagination={false}
                loading={loading}
                bordered
                size="middle"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <strong>总计</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong>¥{totalCost.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong>{((totalCost / mockFinanceData.totalRevenue) * 100).toFixed(2)}%</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>

            {/* 成本分析 */}
            <Card title="成本分析建议">
              <div className="analysis">
                <p><strong>📊 当前成本结构：</strong></p>
                <ul>
                  <li>平台费用占比：{(((costData[0].amount + costData[1].amount) / mockFinanceData.totalRevenue) * 100).toFixed(2)}%</li>
                  <li>营销费用占比：{(((costData[2].amount + costData[3].amount) / mockFinanceData.totalRevenue) * 100).toFixed(2)}%</li>
                  <li>原材料成本占比：{((costData[5].amount / mockFinanceData.totalRevenue) * 100).toFixed(2)}%</li>
                </ul>

                <p><strong>💡 优化建议：</strong></p>
                <ul>
                  <li>平台服务费和履约费为固定成本，可通过提升客单价来降低占比</li>
                  <li>营销费用可根据ROI进行动态调整，建议控制在15%以内</li>
                  <li>原材料成本偏高，建议优化供应链或调整产品定价</li>
                  <li>目标利润率建议保持在10%以上，当前为 {profitRate.toFixed(2)}%</li>
                </ul>
              </div>
            </Card>
          </>
        )}

        {/* 未选择门店时的提示 */}
        {!selectedStore && (
          <div className="empty-state">
            <p>👆 请先选择门店查看成本映射</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ElemeCostMapping;

