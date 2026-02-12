import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Button,
  Upload,
  Table,
  message,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Divider,
  Space,
  Collapse,
  Typography,
  Steps,
  Tag,
} from 'antd';
import {
  FileExcelOutlined,
  ClusterOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  FileSearchOutlined,
  MergeCellsOutlined,
  FileDoneOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  promoPreview,
  promoAggregate,
  promoAggregateExport,
  taobaoKpiCalculate,
  taobaoKpiExport,
  dailyDashboardMerge,
} from '../../../api/excelToolkit';
import type { DateInfo, DashboardStoreRecord } from '../../../api/excelToolkit';
import DailyDashboard from './DailyDashboard';
import './ExcelToolkit.css';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;
const { Step } = Steps;

type Stage = 'upload' | 'preview' | 'result';
type KpiStage = 'upload' | 'result';

const ElemeExcelToolkit: React.FC = () => {
  const [activeTab, setActiveTab] = useState('promo-aggregate');

  // ==================== 推广门店聚合状态 ====================
  const [stage, setStage] = useState<Stage>('upload');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [previewTotalRows, setPreviewTotalRows] = useState(0);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [resultRows, setResultRows] = useState<any[][]>([]);
  const [resultTotalRows, setResultTotalRows] = useState(0);
  const [uniqueStores, setUniqueStores] = useState(0);
  const [uniqueDates, setUniqueDates] = useState(0);

  // ==================== KPI 计算状态 ====================
  const [kpiStage, setKpiStage] = useState<KpiStage>('upload');
  const [kpiLoading, setKpiLoading] = useState(false);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [kpiColumns, setKpiColumns] = useState<string[]>([]);
  const [kpiRows, setKpiRows] = useState<any[][]>([]);
  const [kpiTotalRows, setKpiTotalRows] = useState(0);
  const [kpiUniqueStores, setKpiUniqueStores] = useState(0);
  const [kpiUniqueDates, setKpiUniqueDates] = useState(0);
  const [kpiDateInfo, setKpiDateInfo] = useState<DateInfo | null>(null);

  // ==================== 运营看板状态 ====================
  type DashboardStage = 'upload' | 'dashboard';
  const [dashStage, setDashStage] = useState<DashboardStage>('upload');
  const [dashLoading, setDashLoading] = useState(false);
  const [dashKpiFile, setDashKpiFile] = useState<File | null>(null);
  const [dashSalesFile, setDashSalesFile] = useState<File | null>(null);
  const [dashPromoFile, setDashPromoFile] = useState<File | null>(null);
  const [dashData, setDashData] = useState<DashboardStoreRecord[]>([]);
  const [dashDates, setDashDates] = useState<string[]>([]);
  const [dashSelectedDate, setDashSelectedDate] = useState<string>('');

  // ==================== 公共工具函数 ====================

  const buildTableColumns = (cols: string[]): ColumnsType<any> => {
    return cols.map((col, idx) => ({
      title: col,
      dataIndex: idx.toString(),
      key: col,
      width: col.length > 10 ? 180 : col.length > 6 ? 160 : 120,
      ellipsis: true,
      render: (val: any) => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'string' && val.startsWith('N/A')) {
          return <Text type="warning">{val}</Text>;
        }
        if (typeof val === 'number') {
          if (!Number.isInteger(val)) return val.toFixed(4);
        }
        return val;
      },
    }));
  };

  const buildTableData = (rows: any[][]) => {
    return rows.map((row, rowIdx) => {
      const obj: Record<string, any> = { key: rowIdx };
      row.forEach((val, colIdx) => {
        obj[colIdx.toString()] = val;
      });
      return obj;
    });
  };

  // ==================== 推广门店聚合逻辑 ====================

  const handleUploadPreview = async (file: File) => {
    setUploadedFile(file);
    setLoading(true);
    try {
      const res = await promoPreview(file);
      const data = res.data.data;
      setPreviewColumns(data.columns);
      setPreviewRows(data.rows);
      setPreviewTotalRows(data.total_rows);
      setStage('preview');
      message.success(`文件上传成功，共 ${data.total_rows} 条数据`);
    } catch (e: any) {
      message.error('文件预览失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAggregate = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    try {
      const res = await promoAggregate(uploadedFile);
      const data = res.data.data;
      setResultColumns(data.columns);
      setResultRows(data.rows);
      setResultTotalRows(data.total_rows);
      setUniqueStores(data.unique_stores);
      setUniqueDates(data.unique_dates);
      setStage('result');
      message.success(`聚合完成，共 ${data.total_rows} 条结果`);
    } catch (e: any) {
      message.error('聚合失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await promoAggregateExport(resultColumns, resultRows);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '推广门店聚合结果.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('下载成功');
    } catch (e: any) {
      message.error('下载失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage('upload');
    setUploadedFile(null);
    setPreviewColumns([]);
    setPreviewRows([]);
    setPreviewTotalRows(0);
    setResultColumns([]);
    setResultRows([]);
    setResultTotalRows(0);
    setUniqueStores(0);
    setUniqueDates(0);
  };

  // ==================== KPI 计算逻辑 ====================

  const handleKpiCalculate = async () => {
    if (!salesFile || !promoFile) {
      message.warning('请先上传两个Excel文件');
      return;
    }
    setKpiLoading(true);
    try {
      const res = await taobaoKpiCalculate(salesFile, promoFile);
      const data = res.data.data;
      setKpiColumns(data.columns);
      setKpiRows(data.rows);
      setKpiTotalRows(data.total_rows);
      setKpiUniqueStores(data.unique_stores);
      setKpiUniqueDates(data.unique_dates);
      setKpiDateInfo(data.date_info);
      setKpiStage('result');
      message.success(`计算完成，共 ${data.total_rows} 条结果`);
    } catch (e: any) {
      message.error('计算失败: ' + (e.message || '未知错误'));
    } finally {
      setKpiLoading(false);
    }
  };

  const handleKpiExport = async () => {
    if (!kpiDateInfo) return;
    setKpiLoading(true);
    try {
      const res = await taobaoKpiExport(kpiColumns, kpiRows, kpiDateInfo);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '淘宝闪购运营核心指标.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('下载成功');
    } catch (e: any) {
      message.error('下载失败: ' + (e.message || '未知错误'));
    } finally {
      setKpiLoading(false);
    }
  };

  const handleKpiReset = () => {
    setKpiStage('upload');
    setSalesFile(null);
    setPromoFile(null);
    setKpiColumns([]);
    setKpiRows([]);
    setKpiTotalRows(0);
    setKpiUniqueStores(0);
    setKpiUniqueDates(0);
    setKpiDateInfo(null);
  };

  // ==================== 运营看板逻辑 ====================

  const handleDashGenerate = async () => {
    if (!dashKpiFile || !dashSalesFile || !dashPromoFile) {
      message.warning('请先上传三个Excel文件');
      return;
    }
    setDashLoading(true);
    try {
      const res = await dailyDashboardMerge(dashKpiFile, dashSalesFile, dashPromoFile);
      const data = res.data.data;
      setDashData(data.records);
      setDashDates(data.dates);
      if (data.dates.length > 0) {
        setDashSelectedDate(data.dates[0]);
      }
      setDashStage('dashboard');
      message.success(`数据合并成功，共 ${data.total_records} 条记录，${data.total_stores} 家门店`);
    } catch (e: any) {
      message.error('数据合并失败: ' + (e.message || '未知错误'));
    } finally {
      setDashLoading(false);
    }
  };

  const handleDashReset = () => {
    setDashStage('upload');
    setDashKpiFile(null);
    setDashSalesFile(null);
    setDashPromoFile(null);
    setDashData([]);
    setDashDates([]);
    setDashSelectedDate('');
  };

  // ==================== 推广门店聚合 - 渲染 ====================

  const renderTutorial = () => (
    <div className="tutorial-section">
      <Collapse ghost defaultActiveKey={['tutorial']}
        expandIcon={({ isActive }) => <QuestionCircleOutlined rotate={isActive ? 90 : 0} />}
      >
        <Panel header={<span className="tutorial-header"><InfoCircleOutlined style={{ marginRight: 8 }} />使用教程 - 推广门店聚合</span>} key="tutorial">
          <div className="tutorial-content">
            <Title level={5}>功能说明</Title>
            <Paragraph>
              推广门店聚合工具用于处理饿了么后台导出的<Text strong>推广数据报表</Text>。
              原始报表中，同一门店在同一天可能存在多条推广计划记录（如斗金推广、推广魔方、优选展位等）。
              本工具会自动将同一天、同一门店的所有推广计划数据<Text strong>合并为一条记录</Text>，
              方便你快速查看每个门店每天的推广总投入和总效果。
            </Paragraph>
            <Divider dashed />
            <Title level={5}>操作流程</Title>
            <Steps direction="vertical" size="small" current={-1} className="tutorial-steps">
              <Step title="第一步：从饿了么后台导出推广数据" icon={<FileExcelOutlined />}
                description={<div className="step-detail"><Paragraph>登录饿了么商家后台，进入「推广」相关页面，选择需要分析的日期范围，导出推广数据报表。导出的文件为 <Tag>.xlsx</Tag> 或 <Tag>.csv</Tag> 格式。</Paragraph><Paragraph><Text type="secondary">导出的文件必须包含以下列（顺序不限）：</Text></Paragraph><div className="column-tags"><Tag color="blue">日期</Tag><Tag color="blue">城市</Tag><Tag color="blue">省份</Tag><Tag color="blue">门店ID</Tag><Tag color="blue">门店名称</Tag><Tag color="green">推广消费(元)</Tag><Tag color="green">推广现金消费(元)</Tag><Tag color="green">曝光提升数</Tag><Tag color="green">进店提升数</Tag><Tag color="green">订单提升数</Tag><Tag color="green">订单原价交易额(元)</Tag><Tag color="green">订单交易额(元)</Tag></div></div>}
              />
              <Step title="第二步：上传文件并预览原始数据" icon={<UploadOutlined />}
                description={<div className="step-detail"><Paragraph>点击下方的<Text strong>「上传推广数据 Excel」</Text>按钮，选择刚才导出的 .xlsx 或 .csv 文件。上传成功后，系统会展示完整的原始数据表格。</Paragraph></div>}
              />
              <Step title='第三步：确认数据无误后点击「确认聚合」' icon={<MergeCellsOutlined />}
                description={<div className="step-detail"><Paragraph>系统会按照<Text strong>「日期 + 门店名称」</Text>两个维度进行分组聚合，7列推广数据<Text type="danger">求和</Text>。</Paragraph></div>}
              />
              <Step title="第四步：查看聚合结果并下载" icon={<FileDoneOutlined />}
                description={<div className="step-detail"><Paragraph>确认结果无误后，点击<Text strong>「下载聚合结果」</Text>按钮，系统会自动下载<Text code>推广门店聚合结果.xlsx</Text>。</Paragraph></div>}
              />
            </Steps>
            <Divider dashed />
            <Title level={5}>注意事项</Title>
            <ul className="tutorial-list">
              <li>上传文件支持 <Tag>.xlsx</Tag> 和 <Tag>.csv</Tag> 格式</li>
              <li>文件中的列名必须与要求<Text strong>完全一致</Text>（包括括号和单位）</li>
              <li>处理过程中数据不会被存储到服务器，刷新页面后数据会清除</li>
            </ul>
          </div>
        </Panel>
      </Collapse>
    </div>
  );

  const renderUploadStage = () => (
    <div className="stage-container">
      {renderTutorial()}
      <div className="upload-stage">
        <div className="upload-area">
          <Upload accept=".xlsx,.csv" showUploadList={false} beforeUpload={(file) => { handleUploadPreview(file); return false; }}>
            <Button type="primary" icon={<UploadOutlined />} size="large">上传推广数据 Excel</Button>
          </Upload>
          <p className="upload-hint">支持 .xlsx / .csv 格式，文件需包含：日期、城市、省份、门店ID、门店名称 及推广数据列</p>
        </div>
      </div>
    </div>
  );

  const renderPreviewStage = () => (
    <div className="stage-container">
      <Steps size="small" current={1} style={{ marginBottom: 24 }}>
        <Step title="上传文件" icon={<UploadOutlined />} />
        <Step title="预览原始数据" icon={<FileSearchOutlined />} />
        <Step title="查看聚合结果" icon={<FileDoneOutlined />} />
      </Steps>
      <Alert type="info" showIcon message={<span>已上传文件: <strong>{uploadedFile?.name}</strong>，共 <strong>{previewTotalRows}</strong> 条原始数据，请核查后点击"确认聚合"</span>} style={{ marginBottom: 16 }} />
      <div className="preview-table-wrapper">
        <Table columns={buildTableColumns(previewColumns)} dataSource={buildTableData(previewRows)} pagination={false} scroll={{ x: 'max-content', y: 500 }} size="small" bordered />
      </div>
      <Divider />
      <Space>
        <Button type="primary" icon={<CheckCircleOutlined />} size="large" onClick={handleConfirmAggregate} loading={loading}>确认聚合</Button>
        <Button icon={<ReloadOutlined />} size="large" onClick={handleReset}>重新上传</Button>
      </Space>
    </div>
  );

  const renderResultStage = () => (
    <div className="stage-container">
      <Steps size="small" current={2} style={{ marginBottom: 24 }}>
        <Step title="上传文件" icon={<UploadOutlined />} />
        <Step title="预览原始数据" icon={<FileSearchOutlined />} />
        <Step title="查看聚合结果" icon={<FileDoneOutlined />} />
      </Steps>
      <Alert type="success" showIcon message="聚合完成！请查看结果，确认无误后点击下载" style={{ marginBottom: 16 }} />
      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col span={6}><Statistic title="聚合结果行数" value={resultTotalRows} /></Col>
        <Col span={6}><Statistic title="门店数量" value={uniqueStores} /></Col>
        <Col span={6}><Statistic title="日期数量" value={uniqueDates} /></Col>
        <Col span={6}><Statistic title="原始数据行数" value={previewTotalRows} suffix={`→ ${resultTotalRows}`} /></Col>
      </Row>
      <div className="preview-table-wrapper">
        <Table columns={buildTableColumns(resultColumns)} dataSource={buildTableData(resultRows)} pagination={false} scroll={{ x: 'max-content', y: 500 }} size="small" bordered />
      </div>
      <Divider />
      <Space>
        <Button type="primary" icon={<DownloadOutlined />} size="large" onClick={handleExport} loading={loading}>下载聚合结果</Button>
        <Button icon={<ReloadOutlined />} size="large" onClick={handleReset}>重新上传</Button>
      </Space>
    </div>
  );

  // ==================== KPI - 渲染 ====================

  const renderKpiManual = () => (
    <Card className="kpi-manual-card" title={<span className="tutorial-header"><InfoCircleOutlined style={{ marginRight: 8 }} />淘宝闪购运营核心指标 - 完整说明书</span>}>
      <div className="tutorial-content">
        <Title level={5}>一、功能概述</Title>
        <Paragraph>
          本工具用于计算淘宝闪购（饿了么）运营的<Text strong>12个核心分析指标</Text>。
          需要上传两个Excel文件——「门店销售数据」和「门店推广聚合数据」，系统会按<Text strong>日期+门店名称</Text>关联两张表，
          然后自动计算每个门店每天的运营核心指标。
        </Paragraph>

        <Divider dashed />

        <Title level={5}>二、两个输入文件说明</Title>
        <Paragraph><Text strong>文件1：门店销售数据</Text>（从饿了么商家后台导出）</Paragraph>
        <div className="column-tags">
          <Tag color="blue">日期</Tag><Tag color="blue">门店名称</Tag>
          <Tag color="green">收入</Tag><Tag color="green">有效订单量</Tag>
          <Tag color="green">曝光次数</Tag><Tag color="green">曝光人数</Tag>
          <Tag color="orange">曝光同行均值前10%均值</Tag>
          <Tag color="green">进店转化率</Tag><Tag color="orange">进店转化率的同行前10%均值</Tag>
          <Tag color="green">下单转化率</Tag><Tag color="orange">下单转化率的同行前10%均值</Tag>
          <Tag color="green">近30日复购率</Tag>
        </div>
        <Paragraph style={{ marginTop: 12 }}><Text strong>文件2：门店推广聚合数据</Text>（可由本系统「推广门店聚合」功能生成）</Paragraph>
        <div className="column-tags">
          <Tag color="blue">日期</Tag><Tag color="blue">门店名称</Tag>
          <Tag color="purple">推广现金消费(元)</Tag><Tag color="purple">曝光提升数</Tag>
          <Tag color="purple">订单提升数</Tag>
        </div>

        <Divider dashed />

        <Title level={5}>三、12个核心指标定义</Title>
        <Paragraph><Text type="secondary">每个指标均分配了一个简短代号（2-3字符），便于在表格列头中引用。</Text></Paragraph>
        <table className="kpi-formula-table">
          <thead>
            <tr><th>代号</th><th>指标名称</th><th>计算公式</th><th>含义</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><Tag color="red">CR1</Tag></td>
              <td>推广成本率</td>
              <td><Text code>推广现金消费(元) / 收入</Text></td>
              <td>推广花费占总收入的比例，反映推广成本效率</td>
            </tr>
            <tr>
              <td><Tag color="red">UC1</Tag></td>
              <td>单均推广成本</td>
              <td><Text code>推广现金消费(元) / 有效订单量</Text></td>
              <td>平均每笔有效订单的推广成本</td>
            </tr>
            <tr>
              <td><Tag color="red">EC1</Tag></td>
              <td>千次曝光成本</td>
              <td><Text code>(推广现金消费(元) / 曝光提升数) * 1000</Text></td>
              <td>每获得1000次推广曝光需要花费的成本（CPM）</td>
            </tr>
            <tr>
              <td><Tag color="volcano">CV1</Tag></td>
              <td>综合转化率</td>
              <td><Text code>进店转化率 * 下单转化率</Text></td>
              <td>从曝光到最终下单的综合转化效率</td>
            </tr>
            <tr>
              <td><Tag color="volcano">FC1</Tag></td>
              <td>推广流量贡献度</td>
              <td><Text code>曝光提升数 / 曝光次数</Text></td>
              <td>推广带来的曝光占总曝光的比例</td>
            </tr>
            <tr>
              <td><Tag color="volcano">PC1</Tag></td>
              <td>推广流量综合转化率</td>
              <td><Text code>订单提升数 / 曝光提升数</Text></td>
              <td>推广流量从曝光到成交的转化效率</td>
            </tr>
            <tr>
              <td><Tag color="volcano">NC1</Tag></td>
              <td>自然流量综合转化率</td>
              <td><Text code>(有效订单量 - 订单提升数) / (曝光次数 - 曝光提升数)</Text></td>
              <td>非推广流量的成交转化效率</td>
            </tr>
            <tr>
              <td><Tag color="blue">EA1</Tag></td>
              <td>曝光前10%优势</td>
              <td><Text code>(曝光人数 - 曝光同行前10%均值) / 曝光同行前10%均值</Text></td>
              <td>相对行业前10%的曝光优劣势，正值表示领先</td>
            </tr>
            <tr>
              <td><Tag color="blue">VA1</Tag></td>
              <td>进店转化前10%优势</td>
              <td><Text code>(进店转化率 - 进店转化前10%均值) / 进店转化前10%均值</Text></td>
              <td>相对行业前10%的进店转化优劣势</td>
            </tr>
            <tr>
              <td><Tag color="blue">OA1</Tag></td>
              <td>下单转化前10%优势</td>
              <td><Text code>(下单转化率 - 下单转化前10%均值) / 下单转化前10%均值</Text></td>
              <td>相对行业前10%的下单转化优劣势</td>
            </tr>
            <tr>
              <td><Tag color="green">LV1</Tag></td>
              <td>用户生命周期价值</td>
              <td><Text code>(收入 / 有效订单量) / (1 - 近30日复购率)</Text></td>
              <td>考虑复购后单个用户的预期总贡献收入</td>
            </tr>
            <tr>
              <td><Tag color="green">CT1</Tag></td>
              <td>单均推广成本阈值</td>
              <td><Text code>LV1 * 0.15</Text></td>
              <td>建议的单均推广成本上限（生命周期价值的15%）</td>
            </tr>
          </tbody>
        </table>

        <Divider dashed />

        <Title level={5}>四、数据合并与计算规则</Title>
        <ul className="tutorial-list">
          <li>以<Text strong>门店销售数据为主表</Text>，按「日期 + 门店名称」与推广聚合数据进行关联</li>
          <li>如果某门店某天在销售数据中有记录但推广数据中没有，推广相关字段按 <Tag>0</Tag> 计算</li>
          <li>如果计算过程中出现除数为0的情况（如收入为0、曝光为0等），对应指标会显示 <Tag color="warning">N/A(除数为0)</Tag></li>
          <li>导出的Excel包含两个Sheet：Sheet1为指标计算结果，Sheet2为日期覆盖说明（标注哪些日期两表都有、哪些日期推广数据缺失）</li>
        </ul>

        <Divider dashed />

        <Title level={5}>五、注意事项</Title>
        <ul className="tutorial-list">
          <li>两个文件支持 <Tag>.xlsx</Tag> 和 <Tag>.csv</Tag> 格式</li>
          <li>列名必须与上述要求<Text strong>完全一致</Text>，包括括号、百分号等</li>
          <li>「门店推广聚合数据」可以使用本系统「推广门店聚合」功能从原始推广数据生成</li>
          <li>比率类指标（CR1、FC1、PC1、NC1、EA1、VA1、OA1）输出为小数形式，如需百分比请在Excel中自行格式化</li>
          <li>数据不会存储在服务器上，刷新页面后需重新上传</li>
        </ul>
      </div>
    </Card>
  );

  const renderKpiUpload = () => (
    <div className="stage-container">
      <div className="kpi-upload-section">
        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title="文件1：门店销售数据" className="upload-card">
              <Upload
                accept=".xlsx,.csv"
                showUploadList={false}
                beforeUpload={(file) => {
                  setSalesFile(file);
                  message.success(`已选择: ${file.name}`);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} type={salesFile ? 'default' : 'primary'}>
                  {salesFile ? '重新选择' : '选择文件'}
                </Button>
              </Upload>
              {salesFile && (
                <div className="selected-file">
                  <Tag color="success">{salesFile.name}</Tag>
                </div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="文件2：门店推广聚合数据" className="upload-card">
              <Upload
                accept=".xlsx,.csv"
                showUploadList={false}
                beforeUpload={(file) => {
                  setPromoFile(file);
                  message.success(`已选择: ${file.name}`);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} type={promoFile ? 'default' : 'primary'}>
                  {promoFile ? '重新选择' : '选择文件'}
                </Button>
              </Upload>
              {promoFile && (
                <div className="selected-file">
                  <Tag color="success">{promoFile.name}</Tag>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            size="large"
            onClick={handleKpiCalculate}
            loading={kpiLoading}
            disabled={!salesFile || !promoFile}
          >
            开始计算指标
          </Button>
        </div>
      </div>

      <Divider />

      {renderKpiManual()}
    </div>
  );

  const renderKpiResult = () => (
    <div className="stage-container">
      <Alert type="success" showIcon message="指标计算完成！请查看结果，确认无误后点击下载" style={{ marginBottom: 16 }} />

      {/* 日期覆盖信息 */}
      {kpiDateInfo && (
        <div style={{ marginBottom: 16 }}>
          {kpiDateInfo.matched_dates.length > 0 && (
            <Alert
              type="info"
              showIcon
              message={`两表均有数据的日期 (${kpiDateInfo.matched_dates.length}天)`}
              description={
                <div className="column-tags">
                  {kpiDateInfo.matched_dates.map((d) => <Tag key={d} color="green">{d}</Tag>)}
                </div>
              }
              style={{ marginBottom: 8 }}
            />
          )}
          {kpiDateInfo.missing_promo_dates.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`推广数据缺失的日期 (${kpiDateInfo.missing_promo_dates.length}天，推广指标按0计算)`}
              description={
                <div className="column-tags">
                  {kpiDateInfo.missing_promo_dates.map((d) => <Tag key={d} color="orange">{d}</Tag>)}
                </div>
              }
              style={{ marginBottom: 8 }}
            />
          )}
        </div>
      )}

      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col span={8}><Statistic title="计算结果行数" value={kpiTotalRows} /></Col>
        <Col span={8}><Statistic title="门店数量" value={kpiUniqueStores} /></Col>
        <Col span={8}><Statistic title="日期数量" value={kpiUniqueDates} /></Col>
      </Row>

      <div className="preview-table-wrapper">
        <Table
          columns={buildTableColumns(kpiColumns)}
          dataSource={buildTableData(kpiRows)}
          pagination={false}
          scroll={{ x: 'max-content', y: 500 }}
          size="small"
          bordered
        />
      </div>

      <Divider />

      <Space>
        <Button type="primary" icon={<DownloadOutlined />} size="large" onClick={handleKpiExport} loading={kpiLoading}>
          下载计算结果
        </Button>
        <Button icon={<ReloadOutlined />} size="large" onClick={handleKpiReset}>
          重新上传
        </Button>
      </Space>

      <Divider />

      {renderKpiManual()}
    </div>
  );

  // ==================== 运营看板 - 渲染 ====================

  const renderDashUpload = () => (
    <div className="stage-container">
      <div className="kpi-upload-section">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" title="文件1：门店核心指标" className="upload-card"
              extra={<Text type="secondary" style={{ fontSize: 11 }}>KPI计算结果</Text>}>
              <Upload accept=".xlsx,.csv" showUploadList={false}
                beforeUpload={(file) => { setDashKpiFile(file); message.success(`已选择: ${file.name}`); return false; }}>
                <Button icon={<UploadOutlined />} type={dashKpiFile ? 'default' : 'primary'}>
                  {dashKpiFile ? '重新选择' : '选择文件'}
                </Button>
              </Upload>
              {dashKpiFile && <div className="selected-file"><Tag color="success">{dashKpiFile.name}</Tag></div>}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="文件2：门店销售数据" className="upload-card"
              extra={<Text type="secondary" style={{ fontSize: 11 }}>原始销售数据</Text>}>
              <Upload accept=".xlsx,.csv" showUploadList={false}
                beforeUpload={(file) => { setDashSalesFile(file); message.success(`已选择: ${file.name}`); return false; }}>
                <Button icon={<UploadOutlined />} type={dashSalesFile ? 'default' : 'primary'}>
                  {dashSalesFile ? '重新选择' : '选择文件'}
                </Button>
              </Upload>
              {dashSalesFile && <div className="selected-file"><Tag color="success">{dashSalesFile.name}</Tag></div>}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="文件3：门店推广原始数据" className="upload-card"
              extra={<Text type="secondary" style={{ fontSize: 11 }}>未聚合推广数据</Text>}>
              <Upload accept=".xlsx,.csv" showUploadList={false}
                beforeUpload={(file) => { setDashPromoFile(file); message.success(`已选择: ${file.name}`); return false; }}>
                <Button icon={<UploadOutlined />} type={dashPromoFile ? 'default' : 'primary'}>
                  {dashPromoFile ? '重新选择' : '选择文件'}
                </Button>
              </Upload>
              {dashPromoFile && <div className="selected-file"><Tag color="success">{dashPromoFile.name}</Tag></div>}
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button
            type="primary"
            icon={<DashboardOutlined />}
            size="large"
            onClick={handleDashGenerate}
            loading={dashLoading}
            disabled={!dashKpiFile || !dashSalesFile || !dashPromoFile}
          >
            生成运营看板
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDashResult = () => (
    <div className="stage-container">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={handleDashReset}>重新上传</Button>
      </Space>
      <DailyDashboard
        data={dashData}
        dates={dashDates}
        selectedDate={dashSelectedDate}
        onDateChange={setDashSelectedDate}
      />
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <div className="excel-toolkit">
      <Card className="excel-toolkit-container">
        <div className="page-header">
          <h2>
            <FileExcelOutlined style={{ marginRight: 8 }} />
            饿了么 - 数据分析库
          </h2>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={<span><ClusterOutlined /> 推广门店聚合</span>}
            key="promo-aggregate"
          >
            <Spin spinning={loading && stage === 'upload'}>
              {stage === 'upload' && renderUploadStage()}
              {stage === 'preview' && renderPreviewStage()}
              {stage === 'result' && renderResultStage()}
            </Spin>
          </TabPane>

          <TabPane
            tab={<span><BarChartOutlined /> 淘宝闪购运营核心指标计算</span>}
            key="taobao-kpi"
          >
            <Spin spinning={kpiLoading && kpiStage === 'upload'}>
              {kpiStage === 'upload' && renderKpiUpload()}
              {kpiStage === 'result' && renderKpiResult()}
            </Spin>
          </TabPane>

          <TabPane
            tab={<span><DashboardOutlined /> 一图看清当日运营</span>}
            key="daily-dashboard"
          >
            <Spin spinning={dashLoading}>
              {dashStage === 'upload' && renderDashUpload()}
              {dashStage === 'dashboard' && renderDashResult()}
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ElemeExcelToolkit;
