import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Tag,
  Typography,
  Divider,
  Button,
  message,
  Space,
  Tooltip,
} from 'antd';
import {
  CameraOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import html2canvas from 'html2canvas';
import type { DashboardStoreRecord } from '../../../api/excelToolkit';
import './DailyDashboard.css';

const { Text, Paragraph, Title } = Typography;

// ==================== 指标元数据 ====================

interface MetricMeta {
  code: string;
  name: string;
  formula: string;
  meaning: string;
  interpret: string;
  source: string;
  group: string;
  reverse?: boolean; // true = 越低越好
  format?: 'percent' | 'number' | 'currency' | 'integer';
}

const ALL_METRICS: MetricMeta[] = [
  // 推广效率
  { code: 'CR1', name: '推广成本率', formula: '推广现金消费(元) / 收入', meaning: '推广花费占总收入的比例', interpret: '越低越好，建议低于15%', source: '计算得出', group: '推广效率', reverse: true, format: 'percent' },
  { code: 'UC1', name: '单均推广成本', formula: '推广现金消费(元) / 有效订单量', meaning: '平均每笔有效订单的推广成本', interpret: '越低越好，应低于CT1阈值', source: '计算得出', group: '推广效率', reverse: true, format: 'currency' },
  { code: 'EC1', name: '千次曝光成本', formula: '(推广现金消费(元) / 曝光提升数) * 1000', meaning: '每获得1000次推广曝光的成本（CPM）', interpret: '越低越好，同行对比参考', source: '计算得出', group: '推广效率', reverse: true, format: 'currency' },
  { code: 'PE1', name: '推广ROI', formula: '订单交易额(元) / 推广现金消费(元)', meaning: '推广投入产出比', interpret: '越高越好，>1表示推广有正回报', source: '计算得出', group: '推广效率', format: 'number' },
  { code: 'PE2', name: '推广计划数量', formula: '统计该门店当天推广计划行数', meaning: '当天有几个推广计划在跑', interpret: '参考值，非越多越好', source: '推广数据聚合', group: '推广效率', format: 'integer' },
  { code: 'CT1', name: '单均推广成本阈值', formula: 'LV1 * 0.15', meaning: '建议的单均推广成本上限', interpret: 'UC1应低于此值，否则推广不划算', source: '计算得出', group: '推广效率', format: 'currency' },
  // 转化漏斗
  { code: 'CV1', name: '综合转化率', formula: '进店转化率 * 下单转化率', meaning: '从曝光到下单的综合转化效率', interpret: '越高越好', source: '计算得出', group: '转化漏斗', format: 'percent' },
  { code: 'FC1', name: '推广流量贡献度', formula: '曝光提升数 / 曝光次数', meaning: '推广带来的曝光占总曝光的比例', interpret: '合理区间参考同行，过高说明过度依赖推广', source: '计算得出', group: '转化漏斗', format: 'percent' },
  { code: 'PC1', name: '推广流量综合转化率', formula: '订单提升数 / 曝光提升数', meaning: '推广流量从曝光到成交的转化效率', interpret: '越高越好，与NC1对比看推广质量', source: '计算得出', group: '转化漏斗', format: 'percent' },
  { code: 'NC1', name: '自然流量综合转化率', formula: '(有效订单量-订单提升数) / (曝光次数-曝光提升数)', meaning: '非推广流量的成交转化效率', interpret: '越高越好，与PC1对比看自然流量质量', source: '计算得出', group: '转化漏斗', format: 'percent' },
  // 行业对标
  { code: 'MR1', name: '商圈排名百分位', formula: '商圈收入排名 / 商圈同行数量', meaning: '在商圈中的收入排名位置', interpret: '越低越好，0=第一名，0.1=前10%', source: '销售数据', group: '行业对标', reverse: true, format: 'percent' },
  { code: 'MR2', name: '商圈CR10%距离', formula: '商圈CR10% - MR1', meaning: '与商圈前10%的距离', interpret: '正值=在CR10%范围内，负值=未达CR10%', source: '计算得出', group: '行业对标', format: 'number' },
  { code: 'EA1', name: '曝光前10%优势', formula: '(曝光人数-曝光同行前10%均值) / 曝光同行前10%均值', meaning: '相对行业前10%的曝光优劣势', interpret: '正值=领先行业前10%，负值=落后', source: '计算得出', group: '行业对标', format: 'percent' },
  { code: 'VA1', name: '进店转化前10%优势', formula: '(进店转化率-进店转化前10%均值) / 进店转化前10%均值', meaning: '相对行业前10%的进店转化优劣势', interpret: '正值=领先，负值=落后', source: '计算得出', group: '行业对标', format: 'percent' },
  { code: 'OA1', name: '下单转化前10%优势', formula: '(下单转化率-下单转化前10%均值) / 下单转化前10%均值', meaning: '相对行业前10%的下单转化优劣势', interpret: '正值=领先，负值=落后', source: '计算得出', group: '行业对标', format: 'percent' },
  { code: 'FQ2', name: '曝光同行差距', formula: '(曝光人数-曝光同行均值) / 曝光同行均值', meaning: '与同行平均曝光的差距', interpret: '正值=高于同行均值', source: '计算得出', group: '行业对标', format: 'percent' },
  // 用户结构
  { code: 'US1', name: '新客占比', formula: '直接取值', meaning: '新客户占总下单用户的比例', interpret: '适度为佳，过高说明老客流失，过低说明拉新不足', source: '销售数据', group: '用户结构', format: 'percent' },
  { code: 'US2', name: '复购动量', formula: '近30日复购率 - 近7日复购率', meaning: '复购趋势变化', interpret: '正值=复购在增长，负值=复购在下降', source: '计算得出', group: '用户结构', format: 'percent' },
  { code: 'LV1', name: '用户生命周期价值', formula: '(收入/有效订单量) / (1-近30日复购率)', meaning: '考虑复购后单个用户的预期总贡献收入', interpret: '越高越好', source: '计算得出', group: '用户结构', format: 'currency' },
  // 运营健康度
  { code: 'OH1', name: '出餐时长', formula: '直接取值（分钟）', meaning: '平均出餐时长', interpret: '越低越好，建议<25分钟', source: '销售数据', group: '运营健康度', reverse: true, format: 'number' },
  { code: 'OH2', name: '商责问题率', formula: '商责取消率 + 商责退单率', meaning: '商家责任导致的订单问题比例', interpret: '越低越好，建议<3%', source: '计算得出', group: '运营健康度', reverse: true, format: 'percent' },
  { code: 'OH3', name: '差评回复率', formula: '直接取值', meaning: '对差评的回复比例', interpret: '越高越好，建议100%', source: '销售数据', group: '运营健康度', format: 'percent' },
  { code: 'OH4', name: '异常关店时长', formula: '直接取值（分钟）', meaning: '异常关店的总时长', interpret: '越低越好，理想为0', source: '销售数据', group: '运营健康度', reverse: true, format: 'number' },
  { code: 'FQ1', name: '进店深度', formula: '进店次数 / 进店人数', meaning: '平均每个访客进店几次', interpret: '适度为佳，过高可能表示浏览犹豫', source: '计算得出', group: '运营健康度', format: 'number' },
];

const BASIC_FIELDS: { key: string; name: string; format: string }[] = [
  { key: 'revenue', name: '收入', format: 'currency' },
  { key: 'valid_orders', name: '有效订单量', format: 'integer' },
  { key: 'avg_paid', name: '单均实付', format: 'currency' },
  { key: 'exposure_count', name: '曝光次数', format: 'integer' },
  { key: 'store_score', name: '店铺分值', format: 'number' },
  { key: 'store_rating', name: '店铺评分', format: 'number' },
];

// 热力图核心列
const HEATMAP_COLS = ['revenue', 'valid_orders', 'MR1', 'CR1', 'UC1', 'CV1', 'FC1', 'NC1', 'EA1', 'PE1', 'OH2', 'LV1'];

// 雷达图维度
const RADAR_DIMS = [
  { code: 'CR1', name: '推广成本率', reverse: true },
  { code: 'CV1', name: '综合转化率', reverse: false },
  { code: 'FC1', name: '推广贡献度', reverse: false },
  { code: 'EA1', name: '曝光优势', reverse: false },
  { code: 'VA1', name: '进店转化优势', reverse: false },
  { code: 'OA1', name: '下单转化优势', reverse: false },
  { code: 'PE1', name: '推广ROI', reverse: false },
  { code: 'MR1', name: '商圈排名', reverse: true },
];

// ==================== 工具函数 ====================

function getNumVal(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    if (val.includes('N/A')) return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'number') return isNaN(val) ? null : val;
  return null;
}

function formatVal(val: any, fmt?: string): string {
  const n = getNumVal(val);
  if (n === null) return typeof val === 'string' ? val : '-';
  switch (fmt) {
    case 'percent': return (n * 100).toFixed(2) + '%';
    case 'currency': return '¥' + n.toFixed(2);
    case 'integer': return Math.round(n).toLocaleString();
    default: return n.toFixed(4);
  }
}

function heatColor(val: number, min: number, max: number, reverse: boolean): string {
  if (max === min) return '#ffffff';
  let ratio = (val - min) / (max - min); // 0=min, 1=max
  if (reverse) ratio = 1 - ratio;
  // ratio: 0=bad(red), 1=good(green)
  const r = Math.round(255 - ratio * 115); // 255 -> 140
  const g = Math.round(140 + ratio * 115); // 140 -> 255
  const b = Math.round(140);
  return `rgba(${r}, ${g}, ${b}, 0.3)`;
}

// 计算百分位排名（用于雷达图归一化）
function percentileRank(val: number, allVals: number[], reverse: boolean): number {
  const sorted = [...allVals].sort((a, b) => a - b);
  const idx = sorted.findIndex(v => v >= val);
  let rank = idx >= 0 ? (idx / Math.max(sorted.length - 1, 1)) * 100 : 50;
  if (reverse) rank = 100 - rank;
  return Math.round(Math.max(0, Math.min(100, rank)));
}

// ==================== 组件 Props ====================

interface DailyDashboardProps {
  data: DashboardStoreRecord[];
  dates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

// ==================== 主组件 ====================

const DailyDashboard: React.FC<DailyDashboardProps> = ({
  data,
  dates,
  selectedDate,
  onDateChange,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // ---- 当日数据 ----
  const dayData = useMemo(() => {
    return data.filter(r => r.date === selectedDate);
  }, [data, selectedDate]);

  const storeNames = useMemo(() => [...new Set(dayData.map(r => r.store_name))], [dayData]);

  // ---- 汇总统计 ----
  const summary = useMemo(() => {
    if (dayData.length === 0) return null;
    const sum = (key: string) => dayData.reduce((s, r) => s + (getNumVal(r[key]) || 0), 0);
    const avg = (key: string) => {
      const vals = dayData.map(r => getNumVal(r[key])).filter(v => v !== null) as number[];
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };
    return {
      totalRevenue: sum('revenue'),
      totalOrders: sum('valid_orders'),
      avgPaid: avg('avg_paid'),
      storeCount: dayData.length,
      totalPromo: sum('promo_cash'),
      avgCR1: avg('CR1'),
      avgEC1: avg('EC1'),
      avgPE1: avg('PE1'),
      avgCV1: avg('CV1'),
      totalExposure: sum('exposure_count'),
      avgOH2: avg('OH2'),
      avgUS1: avg('US1'),
    };
  }, [dayData]);

  // ---- 热力图 min/max ----
  const heatmapBounds = useMemo(() => {
    const bounds: Record<string, { min: number; max: number }> = {};
    for (const col of HEATMAP_COLS) {
      const vals = dayData.map(r => getNumVal(r[col])).filter(v => v !== null) as number[];
      if (vals.length > 0) {
        bounds[col] = { min: Math.min(...vals), max: Math.max(...vals) };
      } else {
        bounds[col] = { min: 0, max: 1 };
      }
    }
    return bounds;
  }, [dayData]);

  // ---- 单店数据 ----
  const selectedStoreData = useMemo(() => {
    if (!selectedStore) return null;
    return dayData.find(r => r.store_name === selectedStore) || null;
  }, [dayData, selectedStore]);

  // ---- PNG 导出 ----
  const handleExportPng = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      message.loading({ content: '正在生成图片...', key: 'png-export' });
      // 获取 ECharts 实例并转换为图片
      const echartsDoms = captureRef.current.querySelectorAll('[_echarts_instance_]');
      const originals: { el: HTMLElement; canvas: HTMLCanvasElement; img: HTMLImageElement }[] = [];

      echartsDoms.forEach((el) => {
        const canvas = el.querySelector('canvas');
        if (canvas) {
          const img = document.createElement('img');
          img.src = canvas.toDataURL('image/png');
          img.style.width = canvas.style.width;
          img.style.height = canvas.style.height;
          (el as HTMLElement).style.position = 'relative';
          originals.push({ el: el as HTMLElement, canvas, img });
          canvas.style.display = 'none';
          el.appendChild(img);
        }
      });

      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#f5f7fa',
        useCORS: true,
        logging: false,
      });

      // 恢复
      originals.forEach(({ canvas: c, img }) => {
        c.style.display = '';
        img.remove();
      });

      const link = document.createElement('a');
      link.download = `运营日报_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success({ content: '图片已导出', key: 'png-export' });
    } catch (err) {
      message.error({ content: '导出失败', key: 'png-export' });
      console.error(err);
    }
  }, [selectedDate]);

  // ==================== 渲染：汇总卡片 ====================
  const renderSummaryCards = () => {
    if (!summary) return null;
    const cards = [
      { label: '总收入', value: summary.totalRevenue, prefix: '¥', color: '' },
      { label: '总有效订单', value: summary.totalOrders, color: 'green' },
      { label: '平均单均实付', value: summary.avgPaid, prefix: '¥', precision: 2, color: 'orange' },
      { label: '门店数量', value: summary.storeCount, color: 'purple' },
      { label: '推广总消费', value: summary.totalPromo, prefix: '¥', precision: 2, color: 'red' },
      { label: '平均推广成本率', value: summary.avgCR1 * 100, suffix: '%', precision: 2, color: '' },
      { label: '平均千次曝光成本', value: summary.avgEC1, prefix: '¥', precision: 2, color: 'orange' },
      { label: '平均推广ROI', value: summary.avgPE1, precision: 2, color: 'green' },
      { label: '平均综合转化率', value: summary.avgCV1 * 100, suffix: '%', precision: 2, color: 'purple' },
      { label: '总曝光次数', value: summary.totalExposure, color: 'cyan' },
      { label: '平均商责问题率', value: summary.avgOH2 * 100, suffix: '%', precision: 2, color: 'red' },
      { label: '平均新客占比', value: summary.avgUS1 * 100, suffix: '%', precision: 2, color: 'green' },
    ];

    return (
      <div className="summary-cards-section">
        <div className="section-title">当日全局概览</div>
        <Row gutter={[16, 16]}>
          {cards.map((c, i) => (
            <Col key={i} xs={12} sm={8} md={6} lg={4}>
              <div className={`summary-card ${c.color}`}>
                <Statistic
                  title={c.label}
                  value={c.value}
                  prefix={c.prefix}
                  suffix={c.suffix}
                  precision={c.precision ?? 0}
                />
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  // ==================== 渲染：收入柱状图 ====================
  const renderRevenueBar = () => {
    const sorted = [...dayData].sort((a, b) => (getNumVal(b.revenue) || 0) - (getNumVal(a.revenue) || 0));
    const option = {
      tooltip: { trigger: 'axis' as const, formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>收入: ¥${(p.value || 0).toFixed(2)}`;
      }},
      grid: { left: 60, right: 20, bottom: 80, top: 20 },
      xAxis: {
        type: 'category' as const,
        data: sorted.map(r => r.store_name.length > 8 ? r.store_name.slice(0, 8) + '...' : r.store_name),
        axisLabel: { rotate: 45, fontSize: 10 },
      },
      yAxis: { type: 'value' as const, axisLabel: { formatter: '¥{value}' } },
      series: [{
        type: 'bar' as const,
        data: sorted.map(r => getNumVal(r.revenue) || 0),
        itemStyle: {
          color: {
            type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      }],
    };
    return (
      <Card className="chart-card" title="门店收入对比" size="small">
        <ReactECharts option={option} style={{ height: 350 }} />
      </Card>
    );
  };

  // ==================== 渲染：推广效率散点图 ====================
  const renderEfficiencyScatter = () => {
    const avgCR1 = summary ? summary.avgCR1 : 0;
    const avgCV1 = summary ? summary.avgCV1 : 0;

    const scatterData = dayData.map(r => {
      const cr1 = getNumVal(r.CR1);
      const cv1 = getNumVal(r.CV1);
      const rev = getNumVal(r.revenue) || 1;
      return cr1 !== null && cv1 !== null ? [cr1 * 100, cv1 * 100, rev, r.store_name] : null;
    }).filter(Boolean);

    const option = {
      tooltip: {
        formatter: (params: any) => {
          const d = params.data;
          return `<strong>${d[3]}</strong><br/>推广成本率: ${d[0].toFixed(2)}%<br/>综合转化率: ${d[1].toFixed(2)}%<br/>收入: ¥${d[2].toFixed(2)}`;
        },
      },
      grid: { left: 60, right: 40, bottom: 60, top: 40 },
      xAxis: {
        type: 'value' as const,
        name: 'CR1 推广成本率(%)',
        nameLocation: 'center' as const,
        nameGap: 35,
        axisLabel: { formatter: '{value}%' },
      },
      yAxis: {
        type: 'value' as const,
        name: 'CV1 综合转化率(%)',
        nameLocation: 'center' as const,
        nameGap: 45,
        axisLabel: { formatter: '{value}%' },
      },
      series: [
        {
          type: 'scatter' as const,
          data: scatterData,
          symbolSize: (val: any) => Math.max(10, Math.min(40, val[2] / (summary?.totalRevenue || 1) * 500)),
          itemStyle: { color: '#1890ff', opacity: 0.7 },
          label: {
            show: scatterData.length <= 12,
            formatter: (p: any) => {
              const name = p.data[3];
              return name.length > 6 ? name.slice(0, 6) + '..' : name;
            },
            position: 'top' as const,
            fontSize: 10,
            color: '#666',
          },
        },
        // 均值参考线 - X
        {
          type: 'line' as const,
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed' as const, color: '#ff7875' },
            data: [{ xAxis: avgCR1 * 100 }],
            label: { formatter: '平均CR1', position: 'end' as const, fontSize: 10 },
          },
          data: [],
        },
        // 均值参考线 - Y
        {
          type: 'line' as const,
          markLine: {
            silent: true,
            lineStyle: { type: 'dashed' as const, color: '#95de64' },
            data: [{ yAxis: avgCV1 * 100 }],
            label: { formatter: '平均CV1', position: 'end' as const, fontSize: 10 },
          },
          data: [],
        },
      ],
    };
    return (
      <Card className="chart-card" title="推广效率散点图（CR1 vs CV1）" size="small"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>气泡大小=收入，右下=高转化低成本（最优）</Text>}
      >
        <ReactECharts option={option} style={{ height: 400 }} />
      </Card>
    );
  };

  // ==================== 渲染：热力图排名表 ====================
  const renderHeatmapTable = () => {
    const isReverse = (col: string) => {
      const m = ALL_METRICS.find(m => m.code === col);
      return m?.reverse || false;
    };
    const getFormat = (col: string) => {
      if (col === 'revenue') return 'currency';
      if (col === 'valid_orders') return 'integer';
      return ALL_METRICS.find(m => m.code === col)?.format;
    };
    const getLabel = (col: string) => {
      if (col === 'revenue') return '收入';
      if (col === 'valid_orders') return '有效订单量';
      return ALL_METRICS.find(m => m.code === col)?.code || col;
    };
    const getFullLabel = (col: string) => {
      if (col === 'revenue') return '收入';
      if (col === 'valid_orders') return '有效订单量';
      const m = ALL_METRICS.find(m => m.code === col);
      return m ? `${m.code} ${m.name}` : col;
    };

    const columns = [
      {
        title: '门店名称',
        dataIndex: 'store_name',
        key: 'store_name',
        fixed: 'left' as const,
        width: 160,
        render: (name: string) => (
          <span className="store-name-cell" onClick={() => setSelectedStore(name)}>
            {name}
          </span>
        ),
      },
      ...HEATMAP_COLS.map(col => ({
        title: <Tooltip title={getFullLabel(col)}>{getLabel(col)}</Tooltip>,
        dataIndex: col,
        key: col,
        width: 100,
        sorter: (a: any, b: any) => {
          const av = getNumVal(a[col]);
          const bv = getNumVal(b[col]);
          return (av ?? -Infinity) - (bv ?? -Infinity);
        },
        render: (val: any) => {
          const n = getNumVal(val);
          if (n === null) return <span style={{ color: '#bfbfbf' }}>-</span>;
          const bounds = heatmapBounds[col];
          const bg = bounds ? heatColor(n, bounds.min, bounds.max, isReverse(col)) : '#fff';
          return (
            <span className="heatmap-cell" style={{ background: bg }}>
              {formatVal(n, getFormat(col))}
            </span>
          );
        },
      })),
    ];

    const tableData = dayData.map((r, i) => ({
      key: i,
      ...r,
    }));

    return (
      <div className="heatmap-section">
        <div className="section-title">门店指标热力排名（点击门店名查看详情）</div>
        <div className="heatmap-table-wrapper">
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            scroll={{ x: 'max-content', y: 500 }}
            size="small"
            bordered
            rowClassName={(record) => record.store_name === selectedStore ? 'selected-row' : ''}
          />
        </div>
      </div>
    );
  };

  // ==================== 渲染：单店详情 ====================
  const renderStoreDetail = () => {
    if (!selectedStoreData) return null;
    const s = selectedStoreData;

    // ---- 雷达图 ----
    const radarIndicator = RADAR_DIMS.map(d => ({ name: d.name, max: 100 }));
    const radarData = RADAR_DIMS.map(d => {
      const val = getNumVal(s[d.code]);
      if (val === null) return 50;
      const allVals = dayData.map(r => getNumVal(r[d.code])).filter(v => v !== null) as number[];
      return percentileRank(val, allVals, d.reverse);
    });

    const radarOption = {
      tooltip: {},
      radar: {
        indicator: radarIndicator,
        shape: 'polygon' as const,
        splitArea: { areaStyle: { color: ['rgba(24,144,255,0.02)', 'rgba(24,144,255,0.05)'] } },
        axisName: { fontSize: 11, color: '#666' },
      },
      series: [{
        type: 'radar' as const,
        data: [{
          value: radarData,
          name: s.store_name,
          areaStyle: { color: 'rgba(24,144,255,0.2)' },
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
        }],
      }],
    };

    // ---- 指标分组 ----
    const groups = [
      { key: 'promo-eff', title: '推广效率指标', cls: 'promo-eff', codes: ['CR1', 'UC1', 'EC1', 'PE1', 'PE2', 'CT1'] },
      { key: 'conversion', title: '转化漏斗指标', cls: 'conversion', codes: ['CV1', 'FC1', 'PC1', 'NC1'] },
      { key: 'benchmark', title: '行业对标指标', cls: 'benchmark', codes: ['MR1', 'MR2', 'EA1', 'VA1', 'OA1', 'FQ2'] },
      { key: 'user-struct', title: '用户结构指标', cls: 'user-struct', codes: ['US1', 'US2', 'LV1'] },
      { key: 'ops-health', title: '运营健康度指标', cls: 'ops-health', codes: ['OH1', 'OH2', 'OH3', 'OH4', 'FQ1'] },
    ];

    const renderMetricItem = (code: string) => {
      const meta = ALL_METRICS.find(m => m.code === code);
      if (!meta) return null;
      const val = getNumVal(s[code]);
      let highlight = '';
      if (val !== null && meta.reverse !== undefined) {
        // 简单判断好坏
        const allVals = dayData.map(r => getNumVal(r[code])).filter(v => v !== null) as number[];
        if (allVals.length > 0) {
          const avg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
          if (meta.reverse) {
            highlight = val < avg ? 'highlight-good' : val > avg * 1.2 ? 'highlight-bad' : '';
          } else {
            highlight = val > avg ? 'highlight-good' : val < avg * 0.8 ? 'highlight-bad' : '';
          }
        }
      }

      return (
        <Col key={code} xs={12} sm={8} md={6}>
          <Tooltip title={`${meta.name}: ${meta.interpret}`}>
            <div className={`metric-item ${highlight}`}>
              <div className="metric-code">{meta.code}</div>
              <div className="metric-value">{formatVal(s[code], meta.format)}</div>
              <div className="metric-label">{meta.name}</div>
            </div>
          </Tooltip>
        </Col>
      );
    };

    // UC1 vs CT1 对比
    const uc1Val = getNumVal(s.UC1);
    const ct1Val = getNumVal(s.CT1);
    const overThreshold = uc1Val !== null && ct1Val !== null && uc1Val > ct1Val;

    return (
      <div className="store-detail-section">
        <div className="section-title">
          门店详情：{s.store_name}
          <Button size="small" type="link" onClick={() => setSelectedStore(null)} style={{ marginLeft: 12 }}>
            关闭详情
          </Button>
        </div>
        <div className="store-detail-card">
          <Row gutter={24}>
            {/* 雷达图 */}
            <Col span={10}>
              <div className="radar-chart-container">
                <ReactECharts option={radarOption} style={{ height: 350, width: '100%' }} />
              </div>
            </Col>
            {/* 基础数据 */}
            <Col span={14}>
              <div className="metric-group">
                <div className="metric-group-title basic-data">基础数据</div>
                <Row gutter={[12, 12]}>
                  {BASIC_FIELDS.map(f => (
                    <Col key={f.key} xs={12} sm={8}>
                      <div className="metric-item">
                        <div className="metric-value">
                          {formatVal(s[f.key], f.format)}
                        </div>
                        <div className="metric-label">{f.name}</div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* UC1 vs CT1 */}
              {uc1Val !== null && ct1Val !== null && (
                <div className={`uc1-ct1-compare ${overThreshold ? 'over-threshold' : ''}`}>
                  {overThreshold ? (
                    <span><ArrowUpOutlined style={{ color: '#f5222d' }} /> 单均推广成本 UC1=¥{uc1Val.toFixed(2)} <strong>超过</strong>阈值 CT1=¥{ct1Val.toFixed(2)}，推广投入需优化</span>
                  ) : (
                    <span><ArrowDownOutlined style={{ color: '#52c41a' }} /> 单均推广成本 UC1=¥{uc1Val.toFixed(2)} 低于阈值 CT1=¥{ct1Val.toFixed(2)}，推广投入合理</span>
                  )}
                </div>
              )}
            </Col>
          </Row>

          <Divider />

          {/* 分组指标卡片 */}
          {groups.map(g => (
            <div key={g.key} className="metric-group">
              <div className={`metric-group-title ${g.cls}`}>{g.title}</div>
              <Row gutter={[12, 12]}>
                {g.codes.map(code => renderMetricItem(code))}
              </Row>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== 渲染：指标说明书 ====================
  const renderManual = () => {
    const groups = [
      { title: '推广效率指标（6个）', codes: ['CR1', 'UC1', 'EC1', 'PE1', 'PE2', 'CT1'] },
      { title: '转化漏斗指标（4个）', codes: ['CV1', 'FC1', 'PC1', 'NC1'] },
      { title: '行业对标指标（6个）', codes: ['MR1', 'MR2', 'EA1', 'VA1', 'OA1', 'FQ2'] },
      { title: '用户结构指标（3个）', codes: ['US1', 'US2', 'LV1'] },
      { title: '运营健康度指标（5个）', codes: ['OH1', 'OH2', 'OH3', 'OH4', 'FQ1'] },
      { title: '基础数据（6个）', codes: [] },
    ];

    return (
      <div className="dashboard-manual-section">
        <Card
          className="dashboard-manual-card"
          title={
            <span>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              运营看板指标完整说明书（共26个指标）
            </span>
          }
        >
          <div className="tutorial-content">
            <Title level={5}>一、指标总览</Title>
            <Paragraph>
              本看板共包含 <Text strong>26个运营指标</Text>，分为6大类：推广效率（6个）、转化漏斗（4个）、
              行业对标（6个）、用户结构（3个）、运营健康度（5个）、基础数据（6个）。
              其中12个核心指标（CR1-CT1）来自「淘宝闪购运营核心指标计算」模块的输出文件，
              14个观察指标从门店销售数据和推广原始数据中直接提取或计算得出。
            </Paragraph>

            <Divider dashed />

            {groups.slice(0, 5).map((g, gi) => (
              <div key={gi} className="manual-group-section">
                <h4>{g.title}</h4>
                <table className="indicator-table">
                  <thead>
                    <tr>
                      <th>代号</th>
                      <th>指标名称</th>
                      <th>计算公式</th>
                      <th>含义</th>
                      <th>判读方法</th>
                      <th>数据来源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.codes.map(code => {
                      const m = ALL_METRICS.find(x => x.code === code);
                      if (!m) return null;
                      return (
                        <tr key={code}>
                          <td><Tag color={
                            m.group === '推广效率' ? 'red' :
                            m.group === '转化漏斗' ? 'volcano' :
                            m.group === '行业对标' ? 'blue' :
                            m.group === '用户结构' ? 'green' :
                            'default'
                          }>{m.code}</Tag></td>
                          <td>{m.name}</td>
                          <td><Text code>{m.formula}</Text></td>
                          <td>{m.meaning}</td>
                          <td>{m.interpret}</td>
                          <td><Tag>{m.source}</Tag></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {/* 基础数据 */}
            <div className="manual-group-section">
              <h4>基础数据（6个）</h4>
              <table className="indicator-table">
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>说明</th>
                    <th>数据来源</th>
                  </tr>
                </thead>
                <tbody>
                  {BASIC_FIELDS.map(f => (
                    <tr key={f.key}>
                      <td><Tag color="purple">{f.name}</Tag></td>
                      <td>{
                        f.key === 'revenue' ? '门店当日总收入' :
                        f.key === 'valid_orders' ? '当日有效订单数量' :
                        f.key === 'avg_paid' ? '每笔订单平均实际支付金额' :
                        f.key === 'exposure_count' ? '门店当日总曝光次数' :
                        f.key === 'store_score' ? '门店分值（平台评估）' :
                        '门店用户评分'
                      }</td>
                      <td><Tag>销售数据</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Divider dashed />

            <Title level={5}>二、数据合并规则</Title>
            <ul className="tutorial-list">
              <li>需要上传3个文件：「门店核心指标」（KPI计算结果）、「门店销售数据」（原始销售数据）、「门店推广原始数据」（未聚合的推广计划数据）</li>
              <li>推广原始数据会先按「日期+门店名称」自动聚合（推广数值列求和，同时统计推广计划数量PE2）</li>
              <li>以销售数据为主表，通过「日期+门店名称」关联核心指标和推广聚合数据（Left Join）</li>
              <li>如果某门店某天缺少推广数据，推广相关字段按0计算</li>
              <li>如果某门店某天缺少核心指标数据，KPI列显示N/A</li>
            </ul>

            <Divider dashed />

            <Title level={5}>三、热力图颜色说明</Title>
            <ul className="tutorial-list">
              <li><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: 'rgba(140,255,140,0.3)', verticalAlign: 'middle', marginRight: 6 }} />
                <Text strong>绿色</Text> = 该指标表现好（在当日所有门店中排名靠前）</li>
              <li><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: 'rgba(255,140,140,0.3)', verticalAlign: 'middle', marginRight: 6 }} />
                <Text strong>红色</Text> = 该指标表现差（在当日所有门店中排名靠后）</li>
              <li>反向指标（如CR1推广成本率、MR1商圈排名、OH2商责问题率）颜色逻辑翻转：数值越<Text strong>低</Text>越绿</li>
            </ul>

            <Divider dashed />

            <Title level={5}>四、雷达图归一化方法</Title>
            <Paragraph>
              雷达图的每个维度值为当日所有门店中该指标的<Text strong>百分位排名</Text>（0-100分），而非原始数值。
              100分代表当日最优，0分代表当日最差。对于反向指标（如CR1、MR1），已自动翻转，
              即成本率最低的门店得分100。这样可以在同一张雷达图上直观对比不同量纲的指标。
            </Paragraph>

            <Divider dashed />

            <Title level={5}>五、散点图四象限说明</Title>
            <ul className="tutorial-list">
              <li><Text strong>右下区域（低成本 + 高转化）</Text>：最优区域，推广效率高</li>
              <li><Text strong>右上区域（高成本 + 高转化）</Text>：转化好但推广成本高，可优化投放策略</li>
              <li><Text strong>左下区域（低成本 + 低转化）</Text>：推广投入少且转化低，需提升运营能力</li>
              <li><Text strong>左上区域（高成本 + 低转化）</Text>：需重点关注，推广投入高但转化差</li>
            </ul>

            <Divider dashed />

            <Title level={5}>六、注意事项</Title>
            <ul className="tutorial-list">
              <li>文件中可能包含多天数据，通过顶部日期选择器切换查看不同日期</li>
              <li>导出的PNG图片只包含图表区域，不包含上传区和说明书</li>
              <li>数据不会存储在服务器，刷新页面后需重新上传</li>
              <li>如果上传的KPI文件是由本系统「淘宝闪购运营核心指标计算」模块生成的，列名会自动匹配</li>
              <li>三个文件支持 .xlsx 和 .csv 格式</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  };

  // ==================== 主渲染 ====================
  return (
    <div className="daily-dashboard">
      {/* 日期选择器 + 导出按钮 */}
      <div className="date-selector-bar">
        <Space>
          <span className="date-label">选择日期：</span>
          <Select
            value={selectedDate}
            onChange={onDateChange}
            style={{ width: 200 }}
            options={dates.map(d => ({ label: d, value: d }))}
          />
          <Tag color="blue">{dayData.length} 家门店</Tag>
        </Space>
        <Button icon={<CameraOutlined />} onClick={handleExportPng} type="primary">
          导出PNG
        </Button>
      </div>

      {/* 可截图区域 */}
      <div ref={captureRef} className="dashboard-capture-area">
        {/* 导出时的标题头 */}
        <div className="dashboard-export-header">
          <h2>淘宝闪购运营日报</h2>
          <span className="header-meta">{selectedDate} | {dayData.length}家门店</span>
        </div>

        {renderSummaryCards()}

        <Row gutter={24}>
          <Col span={12}>{renderRevenueBar()}</Col>
          <Col span={12}>{renderEfficiencyScatter()}</Col>
        </Row>

        {renderHeatmapTable()}

        {selectedStoreData && renderStoreDetail()}

        {/* PNG 导出底部水印 */}
        <div className="dashboard-export-footer">
          SunPizza 运营分析系统 | 数据日期: {selectedDate} | 生成时间: {new Date().toLocaleString()}
        </div>
      </div>

      {/* 说明书（不在截图区域内） */}
      {renderManual()}
    </div>
  );
};

export default DailyDashboard;
