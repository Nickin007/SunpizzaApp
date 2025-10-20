import React, { useState } from 'react';
import { Card, Table, Select, Button, Space, Tag, Alert, Progress, Statistic, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import './Diagnosis.css';

/**
 * 饿了么 - 门店诊断
 * 对门店进行问题诊断和健康度评估
 */
const ElemeDiagnosis: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // 模拟门店列表
  const storeOptions = [
    { label: '圣比萨（朝阳店）', value: 'store_1' },
    { label: '圣比萨（海淀店）', value: 'store_2' },
    { label: '圣比萨（昌平店）', value: 'store_3' },
  ];

  // 模拟诊断数据
  const diagnosticData = [
    {
      key: '1',
      category: '订单指标',
      indicator: '有效订单数',
      status: 'normal',
      value: '156单',
      benchmark: '≥150单/日',
      score: 85,
    },
    {
      key: '2',
      category: '订单指标',
      indicator: '商家取消率',
      status: 'warning',
      value: '8.5%',
      benchmark: '≤5%',
      score: 60,
    },
    {
      key: '3',
      category: '服务质量',
      indicator: '超时订单率',
      status: 'danger',
      value: '12%',
      benchmark: '≤3%',
      score: 35,
    },
    {
      key: '4',
      category: '服务质量',
      indicator: '门店评分',
      status: 'normal',
      value: '4.7分',
      benchmark: '≥4.5分',
      score: 90,
    },
    {
      key: '5',
      category: '营销转化',
      indicator: '访问转化率',
      status: 'warning',
      value: '18%',
      benchmark: '≥25%',
      score: 70,
    },
    {
      key: '6',
      category: '商品运营',
      indicator: '缺货商品数',
      status: 'danger',
      value: '8个',
      benchmark: '≤2个',
      score: 40,
    },
  ];

  const columns = [
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '指标名称',
      dataIndex: 'indicator',
      key: 'indicator',
      width: 150,
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
    },
    {
      title: '健康标准',
      dataIndex: 'benchmark',
      key: 'benchmark',
      width: 150,
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
          format={(percent) => `${percent}分`}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
          normal: { color: 'success', text: '正常', icon: <CheckCircleOutlined /> },
          warning: { color: 'warning', text: '预警', icon: <WarningOutlined /> },
          danger: { color: 'error', text: '异常', icon: <WarningOutlined /> },
        };
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
  ];

  const handleDiagnose = () => {
    if (!selectedStore) {
      return;
    }
    setLoading(true);
    // TODO: 调用后端API进行诊断
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // 计算综合得分
  const overallScore = Math.round(
    diagnosticData.reduce((sum, item) => sum + item.score, 0) / diagnosticData.length
  );

  const issueCount = diagnosticData.filter((item) => item.status !== 'normal').length;

  return (
    <div className="eleme-diagnosis">
      <Card className="diagnosis-card">
        {/* 页面标题 */}
        <div className="page-header">
          <h2>饿了么 - 门店诊断</h2>
          <p className="page-description">智能诊断门店运营问题，提供优化建议</p>
        </div>

        {/* 筛选栏 */}
        <div className="filter-bar">
          <Space size="middle" wrap>
            <span className="filter-label">选择门店：</span>
            <Select
              placeholder="请选择要诊断的门店"
              style={{ width: 300 }}
              value={selectedStore}
              onChange={setSelectedStore}
              options={storeOptions}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleDiagnose}
              loading={loading}
              disabled={!selectedStore}
            >
              开始诊断
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </div>

        {/* 综合评估 */}
        {selectedStore && (
          <>
            <Alert
              message="诊断提示"
              description={`发现 ${issueCount} 个问题需要关注，建议及时优化以提升门店运营效率。`}
              type={issueCount > 3 ? 'error' : issueCount > 0 ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="综合健康度"
                    value={overallScore}
                    suffix="/ 100"
                    valueStyle={{
                      color: overallScore >= 80 ? '#3f8600' : overallScore >= 60 ? '#faad14' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="正常指标"
                    value={diagnosticData.filter((item) => item.status === 'normal').length}
                    suffix={`/ ${diagnosticData.length}`}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="异常指标"
                    value={issueCount}
                    suffix="个"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 诊断详情表格 */}
            <Table
              columns={columns}
              dataSource={diagnosticData}
              pagination={false}
              loading={loading}
              bordered
              size="middle"
            />

            {/* 优化建议 */}
            <Card title="优化建议" style={{ marginTop: 24 }}>
              <div className="suggestions">
                <p><strong>1. 超时订单率过高（12%）：</strong></p>
                <ul>
                  <li>建议优化备餐流程，提高出餐速度</li>
                  <li>合理安排高峰时段人员配置</li>
                  <li>检查设备是否运行正常</li>
                </ul>

                <p><strong>2. 商家取消率偏高（8.5%）：</strong></p>
                <ul>
                  <li>及时更新商品库存状态</li>
                  <li>设置合理的营业时间和配送范围</li>
                  <li>加强员工培训，提高接单效率</li>
                </ul>

                <p><strong>3. 缺货商品数较多（8个）：</strong></p>
                <ul>
                  <li>及时下架缺货商品</li>
                  <li>建立商品库存监控机制</li>
                  <li>优化供应链管理</li>
                </ul>
              </div>
            </Card>
          </>
        )}

        {/* 未选择门店时的提示 */}
        {!selectedStore && (
          <div className="empty-state">
            <p>👆 请先选择要诊断的门店</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ElemeDiagnosis;

