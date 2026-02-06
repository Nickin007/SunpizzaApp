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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { promoPreview, promoAggregate, promoAggregateExport } from '../../../api/excelToolkit';
import './ExcelToolkit.css';

const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;
const { Step } = Steps;

type Stage = 'upload' | 'preview' | 'result';

const ElemeExcelToolkit: React.FC = () => {
  const [activeTab, setActiveTab] = useState('promo-aggregate');

  // 推广门店聚合状态
  const [stage, setStage] = useState<Stage>('upload');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 原始数据预览
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [previewTotalRows, setPreviewTotalRows] = useState(0);

  // 聚合结果
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [resultRows, setResultRows] = useState<any[][]>([]);
  const [resultTotalRows, setResultTotalRows] = useState(0);
  const [uniqueStores, setUniqueStores] = useState(0);
  const [uniqueDates, setUniqueDates] = useState(0);

  // 上传并预览原始数据
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

  // 确认聚合
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

  // 下载聚合结果
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

  // 重新上传
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

  // 将列名数组转为 Ant Design Table columns
  const buildTableColumns = (cols: string[]): ColumnsType<any> => {
    return cols.map((col, idx) => ({
      title: col,
      dataIndex: idx.toString(),
      key: col,
      width: col.length > 6 ? 160 : 120,
      ellipsis: true,
      render: (val: any) => {
        if (val === null || val === undefined) return '-';
        if (typeof val === 'number') {
          if (!Number.isInteger(val)) return val.toFixed(2);
        }
        return val;
      },
    }));
  };

  // 将 rows 转为 Table dataSource（对象数组）
  const buildTableData = (rows: any[][]) => {
    return rows.map((row, rowIdx) => {
      const obj: Record<string, any> = { key: rowIdx };
      row.forEach((val, colIdx) => {
        obj[colIdx.toString()] = val;
      });
      return obj;
    });
  };

  // 渲染使用教程
  const renderTutorial = () => (
    <div className="tutorial-section">
      <Collapse
        ghost
        defaultActiveKey={['tutorial']}
        expandIcon={({ isActive }) => (
          <QuestionCircleOutlined rotate={isActive ? 90 : 0} />
        )}
      >
        <Panel
          header={
            <span className="tutorial-header">
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              使用教程 - 推广门店聚合
            </span>
          }
          key="tutorial"
        >
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
              <Step
                title="第一步：从饿了么后台导出推广数据"
                icon={<FileExcelOutlined />}
                description={
                  <div className="step-detail">
                    <Paragraph>
                      登录饿了么商家后台，进入「推广」相关页面，选择需要分析的日期范围，
                      导出推广数据报表。导出的文件为 <Tag>.xlsx</Tag> 格式。
                    </Paragraph>
                    <Paragraph>
                      <Text type="secondary">
                        导出的文件必须包含以下列（顺序不限）：
                      </Text>
                    </Paragraph>
                    <div className="column-tags">
                      <Tag color="blue">日期</Tag>
                      <Tag color="blue">城市</Tag>
                      <Tag color="blue">省份</Tag>
                      <Tag color="blue">门店ID</Tag>
                      <Tag color="blue">门店名称</Tag>
                      <Tag color="green">推广消费(元)</Tag>
                      <Tag color="green">推广现金消费(元)</Tag>
                      <Tag color="green">曝光提升数</Tag>
                      <Tag color="green">进店提升数</Tag>
                      <Tag color="green">订单提升数</Tag>
                      <Tag color="green">订单原价交易额(元)</Tag>
                      <Tag color="green">订单交易额(元)</Tag>
                    </div>
                    <Paragraph style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        其中 <Text strong>蓝色</Text> 为门店基础信息列，<Text strong>绿色</Text> 为需要聚合求和的推广数据列。
                        文件中可能还包含其他列（如计划ID、计划名称、资金来源等），这些列在聚合时会被自动忽略。
                      </Text>
                    </Paragraph>
                  </div>
                }
              />
              <Step
                title="第二步：上传文件并预览原始数据"
                icon={<UploadOutlined />}
                description={
                  <div className="step-detail">
                    <Paragraph>
                      点击下方的<Text strong>「上传推广数据 Excel」</Text>按钮，选择刚才导出的 .xlsx 文件。
                      上传成功后，系统会展示完整的原始数据表格。你可以在表格中自由上下滚动，
                      检查数据是否正确、完整。
                    </Paragraph>
                    <Paragraph>
                      <Text type="secondary">
                        提示：表格顶部会显示总行数，帮助你确认数据量是否与预期一致。
                      </Text>
                    </Paragraph>
                  </div>
                }
              />
              <Step
                title='第三步：确认数据无误后点击「确认聚合」'
                icon={<MergeCellsOutlined />}
                description={
                  <div className="step-detail">
                    <Paragraph>
                      核查原始数据没问题后，点击表格下方的<Text strong>「确认聚合」</Text>按钮。
                      系统会按照<Text strong>「日期 + 门店名称」</Text>两个维度进行分组聚合：
                    </Paragraph>
                    <ul className="tutorial-list">
                      <li>同一天、同一门店的多条推广记录会被合并为一条</li>
                      <li><Text strong>城市、省份、门店ID</Text> 取该组的第一条记录</li>
                      <li><Text strong>推广消费(元)、推广现金消费(元)、曝光提升数、进店提升数、订单提升数、订单原价交易额(元)、订单交易额(元)</Text> 这7列会进行<Text type="danger">求和</Text></li>
                    </ul>
                    <Paragraph>
                      <Text type="secondary">
                        例如：某门店在1月1日有3条推广计划（斗金推广花了50元、推广魔方花了30元、优选展位花了20元），
                        聚合后会合并为1条记录，推广消费 = 50 + 30 + 20 = 100元，其他数据列同理。
                      </Text>
                    </Paragraph>
                  </div>
                }
              />
              <Step
                title="第四步：查看聚合结果并下载"
                icon={<FileDoneOutlined />}
                description={
                  <div className="step-detail">
                    <Paragraph>
                      聚合完成后，页面会展示：
                    </Paragraph>
                    <ul className="tutorial-list">
                      <li><Text strong>统计卡片</Text>：显示聚合结果总行数、门店数量、日期数量、以及从多少条原始数据聚合而来</li>
                      <li><Text strong>结果表格</Text>：完整的聚合后数据表格，同样支持自由滚动查看所有行</li>
                    </ul>
                    <Paragraph>
                      确认结果无误后，点击<Text strong>「下载聚合结果」</Text>按钮，
                      系统会自动下载一个名为<Text code>推广门店聚合结果.xlsx</Text>的Excel文件。
                    </Paragraph>
                    <Paragraph>
                      <Text type="secondary">
                        如果需要处理其他文件，可以点击「重新上传」返回上传页面。
                      </Text>
                    </Paragraph>
                  </div>
                }
              />
            </Steps>

            <Divider dashed />

            <Title level={5}>注意事项</Title>
            <ul className="tutorial-list">
              <li>上传文件仅支持 <Tag>.xlsx</Tag> 格式（不支持 .xls 旧格式或 .csv）</li>
              <li>文件中的列名必须与上述要求<Text strong>完全一致</Text>（包括括号和单位），否则系统无法识别</li>
              <li>聚合结果中的数值列均为求和后的结果，如需平均值等其他统计方式，请在导出后自行在Excel中处理</li>
              <li>处理过程中数据不会被存储到服务器，仅在当前会话中保留，刷新页面或离开后数据会清除</li>
            </ul>
          </div>
        </Panel>
      </Collapse>
    </div>
  );

  // 渲染上传阶段
  const renderUploadStage = () => (
    <div className="stage-container">
      {renderTutorial()}
      <div className="upload-stage">
        <div className="upload-area">
          <Upload
            accept=".xlsx"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUploadPreview(file);
              return false;
            }}
          >
            <Button type="primary" icon={<UploadOutlined />} size="large">
              上传推广数据 Excel
            </Button>
          </Upload>
          <p className="upload-hint">
            支持 .xlsx 格式，文件需包含：日期、城市、省份、门店ID、门店名称 及推广数据列
          </p>
        </div>
      </div>
    </div>
  );

  // 渲染原始数据预览阶段
  const renderPreviewStage = () => (
    <div className="stage-container">
      <Steps size="small" current={1} style={{ marginBottom: 24 }}>
        <Step title="上传文件" icon={<UploadOutlined />} />
        <Step title="预览原始数据" icon={<FileSearchOutlined />} />
        <Step title="查看聚合结果" icon={<FileDoneOutlined />} />
      </Steps>

      <Alert
        type="info"
        showIcon
        message={
          <span>
            已上传文件: <strong>{uploadedFile?.name}</strong>，共{' '}
            <strong>{previewTotalRows}</strong> 条原始数据，请核查后点击"确认聚合"
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <div className="preview-table-wrapper">
        <Table
          columns={buildTableColumns(previewColumns)}
          dataSource={buildTableData(previewRows)}
          pagination={false}
          scroll={{ x: 'max-content', y: 500 }}
          size="small"
          bordered
        />
      </div>

      <Divider />

      <Space>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          size="large"
          onClick={handleConfirmAggregate}
          loading={loading}
        >
          确认聚合
        </Button>
        <Button icon={<ReloadOutlined />} size="large" onClick={handleReset}>
          重新上传
        </Button>
      </Space>
    </div>
  );

  // 渲染聚合结果阶段
  const renderResultStage = () => (
    <div className="stage-container">
      <Steps size="small" current={2} style={{ marginBottom: 24 }}>
        <Step title="上传文件" icon={<UploadOutlined />} />
        <Step title="预览原始数据" icon={<FileSearchOutlined />} />
        <Step title="查看聚合结果" icon={<FileDoneOutlined />} />
      </Steps>

      <Alert
        type="success"
        showIcon
        message="聚合完成！请查看结果，确认无误后点击下载"
        style={{ marginBottom: 16 }}
      />

      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="聚合结果行数" value={resultTotalRows} />
        </Col>
        <Col span={6}>
          <Statistic title="门店数量" value={uniqueStores} />
        </Col>
        <Col span={6}>
          <Statistic title="日期数量" value={uniqueDates} />
        </Col>
        <Col span={6}>
          <Statistic
            title="原始数据行数"
            value={previewTotalRows}
            suffix={`→ ${resultTotalRows}`}
          />
        </Col>
      </Row>

      <div className="preview-table-wrapper">
        <Table
          columns={buildTableColumns(resultColumns)}
          dataSource={buildTableData(resultRows)}
          pagination={false}
          scroll={{ x: 'max-content', y: 500 }}
          size="small"
          bordered
        />
      </div>

      <Divider />

      <Space>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          size="large"
          onClick={handleExport}
          loading={loading}
        >
          下载聚合结果
        </Button>
        <Button icon={<ReloadOutlined />} size="large" onClick={handleReset}>
          重新上传
        </Button>
      </Space>
    </div>
  );

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
            tab={
              <span>
                <ClusterOutlined />
                推广门店聚合
              </span>
            }
            key="promo-aggregate"
          >
            <Spin spinning={loading && stage === 'upload'}>
              {stage === 'upload' && renderUploadStage()}
              {stage === 'preview' && renderPreviewStage()}
              {stage === 'result' && renderResultStage()}
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ElemeExcelToolkit;
