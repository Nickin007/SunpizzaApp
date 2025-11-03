import React, { useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Divider, Typography, Button, Space, message, Tag } from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { CalculationResult } from '../types';
import {
  CostStructurePie,
  RevenueStructurePie,
  SensitivityLines,
  ScenarioRadar,
} from './Charts';

const { Title, Paragraph } = Typography;

interface ResultPanelProps {
  result: CalculationResult | null;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // 导出PDF
  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    try {
      message.loading({ content: '正在生成PDF，请稍候...', key: 'pdf', duration: 0 });

      // 获取内容元素
      const element = contentRef.current;
      
      // 使用html2canvas截图
      const canvas = await html2canvas(element, {
        scale: 2, // 提高清晰度
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // 计算PDF尺寸
      const imgWidth = 210; // A4宽度（mm）
      const pageHeight = 297; // A4高度（mm）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      // 添加第一页
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果内容超过一页，添加更多页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 生成文件名
      const fileName = `门店投资分析报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
      
      // 保存PDF
      pdf.save(fileName);
      
      message.success({ content: 'PDF导出成功！', key: 'pdf', duration: 2 });
    } catch (error) {
      console.error('PDF导出失败:', error);
      message.error({ content: 'PDF导出失败，请重试', key: 'pdf', duration: 2 });
    }
  };

  // 打印
  const handlePrint = () => {
    window.print();
  };

  if (!result) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert
          message="请先填写左侧表单"
          description="填写完整的投资和运营数据后，右侧将自动显示详细的财务分析报告"
          type="info"
          showIcon
        />
      </div>
    );
  }

  // 风险评估
  const getRiskLevel = (roiMonths: number) => {
    if (roiMonths > 36) {
      return { level: '高风险', type: 'error' as const, color: '#ff4d4f' };
    } else if (roiMonths > 24) {
      return { level: '中风险', type: 'warning' as const, color: '#faad14' };
    } else {
      return { level: '低风险', type: 'success' as const, color: '#52c41a' };
    }
  };

  const risk = getRiskLevel(result.roiMonths);

  // 12个月利润表数据
  const cashFlowColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (month: number) => {
        const peakMonths = [5, 6, 11, 12];
        const isPeak = peakMonths.includes(month);
        return (
          <span>
            第{month}月
            {isPeak && <Tag color="volcano" style={{ marginLeft: '8px' }}>旺季</Tag>}
            {!isPeak && <Tag color="blue" style={{ marginLeft: '8px' }}>淡季</Tag>}
          </span>
        );
      },
    },
    {
      title: '营业额（元）',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => `¥${value.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '成本（元）',
      dataIndex: 'cost',
      key: 'cost',
      render: (value: number) => `¥${value.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '利润（元）',
      dataIndex: 'profit',
      key: 'profit',
      render: (value: number) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
          ¥{value.toFixed(2)}
        </span>
      ),
      align: 'right' as const,
    },
    {
      title: '累计利润（元）',
      dataIndex: 'cumulativeProfit',
      key: 'cumulativeProfit',
      render: (value: number) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
          ¥{value.toFixed(2)}
        </span>
      ),
      align: 'right' as const,
    },
  ];

  // 场景对比表数据
  const scenarioColumns = [
    {
      title: '场景',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '月度营业额',
      dataIndex: 'monthlyRevenue',
      key: 'monthlyRevenue',
      render: (value: number) => `¥${value.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '月度利润',
      dataIndex: 'monthlyProfit',
      key: 'monthlyProfit',
      render: (value: number) => `¥${value.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '年度利润',
      dataIndex: 'yearlyProfit',
      key: 'yearlyProfit',
      render: (value: number) => `¥${value.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '利润率',
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (value: number) => `${value.toFixed(2)}%`,
      align: 'right' as const,
    },
    {
      title: '回本周期',
      dataIndex: 'roiMonths',
      key: 'roiMonths',
      render: (value: number) => {
        if (value === Infinity) return '无法回本';
        return `${value.toFixed(1)}个月`;
      },
      align: 'right' as const,
    },
  ];

  const scenarioData = [
    result.scenarios.optimistic,
    result.scenarios.normal,
    result.scenarios.pessimistic,
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 导出按钮区域 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#f0f2f5',
        padding: '16px 0',
      }}>
        <Title level={2} style={{ margin: 0 }}>
          门店投资财务分析报告
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={handleExportPDF}
          >
            导出PDF
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            打印
          </Button>
        </Space>
      </div>

      {/* 报告内容区域 */}
      <div ref={contentRef}>

      {/* 风险评估 */}
      <Alert
        message={`投资风险评级：${risk.level}`}
        description={
          result.roiMonths === Infinity
            ? '警告：根据当前数据，该投资项目无法实现盈利，请重新评估投资计划。'
            : `预计投资回报周期为 ${result.roiMonths.toFixed(1)} 个月（约${(result.roiMonths / 6).toFixed(1)}个淡旺季周期，每周期6个月：4个月淡季+2个月旺季）。${
                result.roiMonths > 36
                  ? '回本周期较长，建议谨慎投资，优化成本结构或提升营业额。'
                  : result.roiMonths > 24
                  ? '回本周期适中，需关注市场变化和运营效率。'
                  : '回本周期较短，投资回报前景良好。'
              }`
        }
        type={risk.type}
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="投资回报周期"
              value={result.roiMonths === Infinity ? '∞' : result.roiMonths.toFixed(1)}
              suffix={result.roiMonths === Infinity ? '' : '个月'}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: risk.color }}
            />
            {result.roiMonths !== Infinity && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#8c8c8c',
                lineHeight: '1.4'
              }}>
                按淡旺季周期计算
                <br />
                (约 {(result.roiMonths / 6).toFixed(1)} 个完整周期)
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="盈亏平衡点"
              value={result.breakEvenRevenue.toFixed(0)}
              prefix="¥"
              suffix="/月"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="月度净利润"
              value={result.monthlyProfit.toFixed(2)}
              prefix={result.monthlyProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
              suffix="元"
              valueStyle={{ color: result.monthlyProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="年度预计利润"
              value={result.yearlyProfit.toFixed(2)}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: result.yearlyProfit >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 成本明细 */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>成本分析</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Paragraph>
              <strong>初始投资总额：</strong>
              <span style={{ fontSize: '18px', color: '#ff4d4f' }}>
                ¥{result.totalInitialInvestment.toFixed(2)}
              </span>
            </Paragraph>
          </Col>
          <Col span={8}>
            <Paragraph>
              <strong>月固定成本：</strong>
              <span style={{ fontSize: '18px' }}>
                ¥{result.monthlyFixedCost.toFixed(2)}
              </span>
            </Paragraph>
          </Col>
          <Col span={8}>
            <Paragraph>
              <strong>月变动成本（平均）：</strong>
              <span style={{ fontSize: '18px' }}>
                ¥{result.monthlyVariableCost.toFixed(2)}
              </span>
            </Paragraph>
          </Col>
        </Row>
        <Paragraph>
          <strong>月度总成本（平均）：</strong>
          <span style={{ fontSize: '20px', color: '#1890ff' }}>
            ¥{result.monthlyTotalCost.toFixed(2)}
          </span>
        </Paragraph>
      </Card>

      {/* 淡旺季对比卡片 */}
      <Card style={{ marginBottom: '24px' }} title="淡旺季对比分析">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card type="inner" title={<span style={{ color: '#ff4d4f' }}>🔥 旺季数据</span>}>
              <Paragraph>
                <strong>月度营业额：</strong>
                <span style={{ fontSize: '18px', color: '#52c41a' }}>
                  ¥{result.peakSeasonRevenue.toFixed(2)}
                </span>
              </Paragraph>
              <Paragraph>
                <strong>月度净利润：</strong>
                <span style={{ fontSize: '18px', color: result.peakSeasonProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  ¥{result.peakSeasonProfit.toFixed(2)}
                </span>
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>盈亏平衡点：</strong>
                <span style={{ fontSize: '16px' }}>
                  ¥{result.peakSeasonBreakEven.toFixed(2)}
                </span>
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card type="inner" title={<span style={{ color: '#1890ff' }}>❄️ 淡季数据</span>}>
              <Paragraph>
                <strong>月度营业额：</strong>
                <span style={{ fontSize: '18px', color: '#52c41a' }}>
                  ¥{result.lowSeasonRevenue.toFixed(2)}
                </span>
              </Paragraph>
              <Paragraph>
                <strong>月度净利润：</strong>
                <span style={{ fontSize: '18px', color: result.lowSeasonProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  ¥{result.lowSeasonProfit.toFixed(2)}
                </span>
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>盈亏平衡点：</strong>
                <span style={{ fontSize: '16px' }}>
                  ¥{result.lowSeasonBreakEven.toFixed(2)}
                </span>
              </Paragraph>
            </Card>
          </Col>
        </Row>
        <Alert
          style={{ marginTop: 16 }}
          message="淡旺季说明"
          description={
            <div>
              <p style={{ marginBottom: 4 }}>• <strong>旺季</strong>：每天都按节假日水平计算，订单量和收入较高</p>
              <p style={{ marginBottom: 4 }}>• <strong>淡季</strong>：区分工作日和节假日，订单量和收入相对较低</p>
              <p style={{ marginBottom: 0 }}>• <strong>盈亏平衡点</strong>：该季节需要达到的最低月营业额才不会亏损</p>
            </div>
          }
          type="info"
        />
      </Card>

      <Divider />

      {/* 图表展示区 */}
      <Title level={3} style={{ marginTop: '32px', marginBottom: '24px' }}>
        可视化分析
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <CostStructurePie data={result} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <RevenueStructurePie data={result} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: '16px' }}>
        <SensitivityLines data={result} />
      </Card>

      <Card style={{ marginTop: '16px' }}>
        <ScenarioRadar data={result} />
      </Card>

      <Divider />

      {/* 详细报表区 */}
      <Title level={3} style={{ marginTop: '32px', marginBottom: '24px' }}>
        详细财务报表
      </Title>

      <Card title="12个月利润表（淡旺季周期）" style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px', color: '#8c8c8c' }}>
          <Tag color="volcano">旺季</Tag> 第5/6/11/12月（每天按节假日水平）
          <span style={{ margin: '0 12px' }}>|</span>
          <Tag color="blue">淡季</Tag> 其他月份（区分工作日和节假日）
        </div>
        <Table
          columns={cashFlowColumns}
          dataSource={result.yearlyProjection}
          rowKey="month"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>

      <Card title="多场景对比分析">
        <Table
          columns={scenarioColumns}
          dataSource={scenarioData}
          rowKey="name"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
        <Alert
          style={{ marginTop: '16px' }}
          message="场景说明"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>场景参数已根据左侧E组设置自动计算：</p>
              <ul style={{ marginBottom: 0 }}>
                <li><strong>乐观场景：</strong>订单量{result.scenarios.optimistic.name.includes('乐观') ? '变化自定义' : ''}、单均收入变化自定义、成本率变化自定义</li>
                <li><strong>正常场景：</strong>按当前输入数据（ABCD组）计算</li>
                <li><strong>悲观场景：</strong>订单量变化自定义、单均收入变化自定义、成本率变化自定义</li>
              </ul>
              <p style={{ marginTop: 8, marginBottom: 0, color: '#666', fontSize: '12px' }}>
                提示：您可以在左侧表单的"E组：场景分析参数"中自定义乐观和悲观场景的具体变化百分比
              </p>
            </div>
          }
          type="info"
        />
      </Card>

      <Divider />

      {/* 投资建议 */}
      <Card title="投资建议" style={{ marginTop: '16px' }}>
        <Paragraph>
          <strong>基于当前数据分析，给出以下建议：</strong>
        </Paragraph>
        <ul>
          {result.monthlyProfit > 0 ? (
            <>
              <li>月度利润为正，项目具有盈利能力</li>
              <li>
                预计 {result.roiMonths.toFixed(1)} 个月可收回初始投资
                {result.roiMonths < 18 && '，投资回报期较短，值得考虑'}
              </li>
            </>
          ) : (
            <>
              <li style={{ color: '#ff4d4f' }}>
                <strong>警告：月度利润为负，当前模式下无法盈利</strong>
              </li>
              <li>建议：提高客单价、增加订单量或降低成本</li>
            </>
          )}
          <li>
            月度营业额需达到 ¥{result.breakEvenRevenue.toFixed(2)} 才能实现盈亏平衡（加权平均）
          </li>
          {result.lowSeasonProfit < 0 && (
            <li style={{ color: '#faad14' }}>
              <strong>警告：淡季会出现亏损</strong>（月利润: ¥{result.lowSeasonProfit.toFixed(2)}），
              需要旺季利润弥补，建议提前做好现金流规划
            </li>
          )}
          {result.peakSeasonProfit > 0 && result.lowSeasonProfit < 0 && (
            <li>
              旺季利润可以弥补淡季亏损，全年仍可实现盈利，
              但需确保有足够的现金储备度过淡季
            </li>
          )}
          <li>
            根据敏感性分析，建议重点关注{' '}
            {Math.abs(result.sensitivity.orderCountChange[6].profitChange) > Math.abs(result.sensitivity.costRateChange[3].profitChange)
              ? '订单量变化'
              : '成本率变化'}
            ，该因素对利润影响最大
          </li>
          {result.scenarios.pessimistic.monthlyProfit < 0 && (
            <li style={{ color: '#faad14' }}>
              悲观场景下将出现亏损，建议制定应对市场不利因素的预案
            </li>
          )}
        </ul>
      </Card>
      </div>
      {/* 报告内容区域结束 */}
    </div>
  );
};

export default ResultPanel;


