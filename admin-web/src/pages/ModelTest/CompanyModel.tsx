import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Card, Row, Col, InputNumber, Button, Table, Space,
  Modal, Input, message, Popconfirm, Tabs, Tag, Tooltip, Divider, Progress,
} from 'antd';
import {
  BankOutlined, SaveOutlined, ReloadOutlined, DeleteOutlined,
  ImportOutlined, TableOutlined, PieChartOutlined, DashboardOutlined,
  AimOutlined, ShopOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import {
  listCompanyTemplates, createCompanyTemplate, deleteCompanyTemplate,
} from '../../api/modelTest';
import type { CompanyModelConfig, CompanyModelTemplate } from '../../api/modelTest';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text } = Typography;

const DEFAULT_CONFIG: CompanyModelConfig = {
  franchise_stores: 20,
  direct_stores: 3,
  avg_store_revenue: 220000,
  gross_margin_rate: 65,
  supply_chain_margin: 10,
  management_fee_rate: 3,
  direct_store_profit: 90000,
  direct_store_equity: 30,
  other_commission: 0,
  hr_cost: 150000,
  office_rent: 30000,
  other_expense: 20000,
  dept_supply_chain_pct: 10,
  dept_operation_pct: 10,
  dept_management_pct: 10,
  projection_months: 24,
  monthly_new_franchise: 2,
  monthly_new_direct: 0,
};

const fmt = (v: number) => `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
const fmtShort = (v: number) => {
  if (Math.abs(v) >= 10000) return `¥${(v / 10000).toFixed(1)}万`;
  return fmt(v);
};

interface CompanyResult {
  totalStores: number;
  supplyChainRevenue: number;
  managementFeeRevenue: number;
  directStoreRevenue: number;
  otherCommissionRevenue: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  scDividend: number;
  dsDividend: number;
  mfDividend: number;
  totalDividend: number;
  netProfit: number;
  breakEvenFranchise: number | null;
}

function calcCompany(cfg: CompanyModelConfig) {
  const totalStores = cfg.franchise_stores + cfg.direct_stores;
  const rawMaterialRate = 1 - cfg.gross_margin_rate / 100;

  const supplyChainRevenue = Math.round(
    totalStores * cfg.avg_store_revenue * rawMaterialRate * cfg.supply_chain_margin / 100
  );
  const managementFeeRevenue = Math.round(
    cfg.franchise_stores * cfg.avg_store_revenue * cfg.management_fee_rate / 100
  );
  const directStoreRevenue = Math.round(cfg.direct_store_profit * cfg.direct_store_equity / 100);
  const otherCommissionRevenue = Math.round(cfg.other_commission);

  const totalRevenue = supplyChainRevenue + managementFeeRevenue + directStoreRevenue + otherCommissionRevenue;
  const totalCost = cfg.hr_cost + cfg.office_rent + cfg.other_expense;
  const grossProfit = totalRevenue - totalCost;

  const scDividend = Math.round(supplyChainRevenue * cfg.dept_supply_chain_pct / 100);
  const dsDividend = Math.round(directStoreRevenue * cfg.dept_operation_pct / 100);
  const mfDividend = Math.round(managementFeeRevenue * cfg.dept_management_pct / 100);
  const totalDividend = grossProfit > 0 ? scDividend + dsDividend + mfDividend : 0;
  const netProfit = grossProfit - totalDividend;

  const scPerFranchise = cfg.avg_store_revenue * rawMaterialRate * cfg.supply_chain_margin / 100;
  const mfPerFranchise = cfg.avg_store_revenue * cfg.management_fee_rate / 100;
  const effectiveScPerStore = scPerFranchise * (1 - cfg.dept_supply_chain_pct / 100);
  const effectiveMfPerStore = mfPerFranchise * (1 - cfg.dept_management_pct / 100);
  const effectivePerStore = effectiveScPerStore + effectiveMfPerStore;

  const directScRev = cfg.direct_stores * cfg.avg_store_revenue * rawMaterialRate * cfg.supply_chain_margin / 100;
  const directEffective = directStoreRevenue * (1 - cfg.dept_operation_pct / 100)
    + directScRev * (1 - cfg.dept_supply_chain_pct / 100)
    + otherCommissionRevenue;
  const costAfterDirect = totalCost - directEffective;
  let breakEvenFranchise: number | null = null;
  if (effectivePerStore > 0) {
    breakEvenFranchise = Math.ceil(Math.max(0, costAfterDirect) / effectivePerStore);
  }

  return {
    totalStores,
    supplyChainRevenue,
    managementFeeRevenue,
    directStoreRevenue,
    otherCommissionRevenue,
    totalRevenue,
    totalCost,
    grossProfit,
    scDividend,
    dsDividend,
    mfDividend,
    totalDividend,
    netProfit,
    breakEvenFranchise,
  };
}

interface GrowthRow {
  month: number;
  franchiseStores: number;
  directStores: number;
  totalStores: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  dividend: number;
  netProfit: number;
  cumulative: number;
}

function calcGrowth(cfg: CompanyModelConfig): GrowthRow[] {
  const rows: GrowthRow[] = [];
  let cum = 0;
  const rawMaterialRate = 1 - cfg.gross_margin_rate / 100;

  for (let m = 1; m <= cfg.projection_months; m++) {
    const fs = cfg.franchise_stores + cfg.monthly_new_franchise * (m - 1);
    const ds = cfg.direct_stores + cfg.monthly_new_direct * (m - 1);
    const ts = fs + ds;

    const scRev = Math.round(ts * cfg.avg_store_revenue * rawMaterialRate * cfg.supply_chain_margin / 100);
    const mfRev = Math.round(fs * cfg.avg_store_revenue * cfg.management_fee_rate / 100);
    const dsRevPerStore = cfg.direct_stores > 0 ? cfg.direct_store_profit / cfg.direct_stores : 0;
    const dsRev = Math.round(ds * dsRevPerStore * cfg.direct_store_equity / 100);
    const ocRev = Math.round(cfg.other_commission);
    const rev = scRev + mfRev + dsRev + ocRev;
    const cost = cfg.hr_cost + cfg.office_rent + cfg.other_expense;
    const gp = rev - cost;
    const scDiv = Math.round(scRev * cfg.dept_supply_chain_pct / 100);
    const dsDiv = Math.round(dsRev * cfg.dept_operation_pct / 100);
    const mfDiv = Math.round(mfRev * cfg.dept_management_pct / 100);
    const div = gp > 0 ? scDiv + dsDiv + mfDiv : 0;
    const np = gp - div;
    cum += np;

    rows.push({
      month: m,
      franchiseStores: fs,
      directStores: ds,
      totalStores: ts,
      revenue: rev,
      cost,
      grossProfit: gp,
      dividend: div,
      netProfit: np,
      cumulative: Math.round(cum),
    });
  }
  return rows;
}

const MI: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; pct?: boolean; tip?: string; integer?: boolean;
}> = ({ label, value, onChange, step = 1000, min = 0, max, pct, tip, integer }) => (
  <div style={{ marginBottom: 10 }}>
    <Tooltip title={tip}>
      <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>{label}</Text>
    </Tooltip>
    {pct ? (
      <InputNumber size="small" value={value} onChange={v => onChange(v ?? 0)}
        style={{ width: '100%' }} min={min} max={max ?? 100} step={step}
        formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
    ) : integer ? (
      <InputNumber size="small" value={value} onChange={v => onChange(v ?? 0)}
        style={{ width: '100%' }} min={min} max={max} step={step} precision={0} />
    ) : (
      <InputNumber size="small" value={value} onChange={v => onChange(v ?? 0)}
        style={{ width: '100%' }} min={min} max={max} step={step}
        formatter={v => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        parser={v => Number((v || '').replace(/¥\s?|(,*)/g, ''))} />
    )}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#2f54eb' }) => (
  <Divider orientation="left" orientationMargin={0}
    style={{ margin: '4px 0 12px', fontSize: 13, color, borderColor: color + '40' }}>
    {children}
  </Divider>
);

const CompanyModel: React.FC = () => {
  const isMobile = useIsMobile();
  const [cfg, setCfg] = useState<CompanyModelConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<CompanyModelTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => calcCompany(cfg), [cfg]);
  const growth = useMemo(() => calcGrowth(cfg), [cfg]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const resp = await listCompanyTemplates();
      if (resp.data?.code === 200) setTemplates(resp.data.data || []);
    } catch { message.error('加载模板失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTemplates(); }, []);

  const handleSave = async () => {
    if (!saveName.trim()) { message.warning('请输入模板名称'); return; }
    setSaving(true);
    try {
      const resp = await createCompanyTemplate({ name: saveName.trim(), config: cfg });
      if (resp.data?.code === 200) {
        message.success('模板保存成功');
        setSaveModalOpen(false);
        setSaveName('');
        loadTemplates();
      } else { message.error(resp.data?.message || '保存失败'); }
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleLoad = (t: CompanyModelTemplate) => {
    setCfg({ ...DEFAULT_CONFIG, ...t.config });
    message.success(`已加载模板「${t.name}」`);
  };

  const handleDelete = async (id: number) => {
    try {
      const resp = await deleteCompanyTemplate(id);
      if (resp.data?.code === 200) { message.success('已删除'); loadTemplates(); }
    } catch { message.error('删除失败'); }
  };

  const st = (k: keyof CompanyModelConfig, v: number) =>
    setCfg(p => ({ ...p, [k]: v }));

  /* ═══ 图表 ═══ */
  const revenuePieOption: any = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['30%', '55%'], center: ['50%', '45%'],
      data: [
        { value: result.supplyChainRevenue, name: '供应链' },
        { value: result.managementFeeRevenue, name: '管理费' },
        { value: result.directStoreRevenue, name: '直营店' },
        { value: result.otherCommissionRevenue, name: '其他抽佣' },
      ].filter(d => d.value > 0),
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
    }],
  };

  const growthChartOption: any = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        let s = `第 ${params[0].axisValue} 月<br/>`;
        params.forEach((p: any) => { s += `${p.marker}${p.seriesName}: ${fmtShort(p.value)}<br/>`; });
        return s;
      },
    },
    legend: { bottom: 0 },
    grid: { left: 70, right: 30, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: growth.map(r => r.month), name: '月' },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => fmtShort(v) } },
    series: [
      { name: '月收入', type: 'line', data: growth.map(r => r.revenue), smooth: true, lineStyle: { color: '#52c41a' }, itemStyle: { color: '#52c41a' } },
      { name: '月净利润', type: 'line', data: growth.map(r => r.netProfit), smooth: true, lineStyle: { color: '#2f54eb' }, itemStyle: { color: '#2f54eb' } },
      { name: '累计净利润', type: 'line', data: growth.map(r => r.cumulative), smooth: true, lineStyle: { color: '#fa8c16', type: 'dashed' }, itemStyle: { color: '#fa8c16' } },
    ],
  };

  const storeGrowthOption: any = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 50, right: 30, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: growth.map(r => r.month), name: '月' },
    yAxis: { type: 'value', name: '门店数' },
    series: [
      { name: '加盟店', type: 'bar', stack: 'total', data: growth.map(r => r.franchiseStores), itemStyle: { color: '#1890ff' } },
      { name: '直营店', type: 'bar', stack: 'total', data: growth.map(r => r.directStores), itemStyle: { color: '#52c41a' } },
    ],
  };

  /* ═══ 右侧 Tabs ═══ */
  const resultTabs = [
    {
      key: 'pnl',
      label: <span><DashboardOutlined /> 损益概览</span>,
      children: (
        <div>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {[
              { title: '门店总数', value: result.totalStores, prefix: '', suffix: '家', color: '#2f54eb' },
              { title: '月总收入', value: result.totalRevenue, color: '#52c41a' },
              { title: '月总成本', value: result.totalCost, color: '#fa8c16' },
              { title: '月毛利', value: result.grossProfit, color: result.grossProfit >= 0 ? '#52c41a' : '#f5222d' },
              { title: '平均部门分红', value: result.totalDividend, color: '#722ed1' },
              { title: '月净利润', value: result.netProfit, color: result.netProfit >= 0 ? '#52c41a' : '#f5222d' },
            ].map((item, i) => (
              <Col span={8} key={i}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.title}</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>
                    {item.prefix === '' ? '' : '¥'}{item.value.toLocaleString()}{item.suffix || ''}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card size="small" title="收入构成" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: '供应链', value: result.supplyChainRevenue, color: '#1890ff' },
                { label: '管理费', value: result.managementFeeRevenue, color: '#52c41a' },
                { label: '直营店', value: result.directStoreRevenue, color: '#fa8c16' },
                { label: '其他抽佣', value: result.otherCommissionRevenue, color: '#eb2f96' },
              ].filter(item => item.value > 0 || item.label !== '其他抽佣').map(item => (
                <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#fafafa', borderRadius: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{item.label}</Text>
                  <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>{fmtShort(item.value)}</div>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {result.totalRevenue > 0 ? `${Math.round(item.value / result.totalRevenue * 100)}%` : '—'}
                  </Text>
                </div>
              ))}
            </div>
          </Card>

          <Card size="small" title="成本构成">
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: '人力成本', value: cfg.hr_cost, color: '#f5222d' },
                { label: '办公室租金', value: cfg.office_rent, color: '#fa8c16' },
                { label: '其他运营', value: cfg.other_expense, color: '#8c8c8c' },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#fafafa', borderRadius: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{item.label}</Text>
                  <div style={{ fontSize: 16, fontWeight: 600, color: item.color }}>{fmtShort(item.value)}</div>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {result.totalCost > 0 ? `${Math.round(item.value / result.totalCost * 100)}%` : '—'}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'split',
      label: <span><PieChartOutlined /> 业务线拆分</span>,
      children: (
        <div>
          <ReactECharts option={revenuePieOption} style={{ height: 280 }} />
          <Divider style={{ margin: '12px 0' }} />
          <Table
            dataSource={[
              { key: 'sc', label: '供应链', stores: result.totalStores, formula: `${result.totalStores}店 × ¥${cfg.avg_store_revenue.toLocaleString()} × ${(100 - cfg.gross_margin_rate).toFixed(0)}% × ${cfg.supply_chain_margin}%`, revenue: result.supplyChainRevenue, pct: result.totalRevenue > 0 ? (result.supplyChainRevenue / result.totalRevenue * 100).toFixed(1) : '0' },
              { key: 'mf', label: '管理费', stores: cfg.franchise_stores, formula: `${cfg.franchise_stores}店 × ¥${cfg.avg_store_revenue.toLocaleString()} × ${cfg.management_fee_rate}%`, revenue: result.managementFeeRevenue, pct: result.totalRevenue > 0 ? (result.managementFeeRevenue / result.totalRevenue * 100).toFixed(1) : '0' },
              { key: 'ds', label: '直营店', stores: cfg.direct_stores, formula: `整体净利 ¥${cfg.direct_store_profit.toLocaleString()} × ${cfg.direct_store_equity}%占股`, revenue: result.directStoreRevenue, pct: result.totalRevenue > 0 ? (result.directStoreRevenue / result.totalRevenue * 100).toFixed(1) : '0' },
              ...(result.otherCommissionRevenue > 0 ? [{ key: 'oc', label: '其他抽佣', stores: 0 as number, formula: `固定月收入 ¥${cfg.other_commission.toLocaleString()}`, revenue: result.otherCommissionRevenue, pct: result.totalRevenue > 0 ? (result.otherCommissionRevenue / result.totalRevenue * 100).toFixed(1) : '0' }] : []),
              { key: 'total', label: '合计', stores: result.totalStores, formula: '', revenue: result.totalRevenue, pct: '100' },
            ]}
            columns={[
              { title: '业务线', dataIndex: 'label', width: 80, render: (v: string, r: any) => r.key === 'total' ? <Text strong>{v}</Text> : v },
              { title: '计算公式', dataIndex: 'formula', ellipsis: true, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
              { title: '月收入', dataIndex: 'revenue', width: 110, render: (v: number, r: any) => <Text strong={r.key === 'total'} style={{ color: r.key === 'total' ? '#2f54eb' : undefined }}>{fmtShort(v)}</Text> },
              { title: '占比', dataIndex: 'pct', width: 60, render: (v: string) => `${v}%` },
            ]}
            pagination={false}
            size="small"
            rowClassName={r => (r as any).key === 'total' ? 'total-row' : ''}
          />
        </div>
      ),
    },
    {
      key: 'growth',
      label: <span><TableOutlined /> 增长预测</span>,
      children: (
        <div>
          <ReactECharts option={storeGrowthOption} style={{ height: 200 }} />
          <ReactECharts option={growthChartOption} style={{ height: 260, marginTop: 8 }} />
          <Divider style={{ margin: '12px 0' }} />
          <Table
            dataSource={growth}
            columns={[
              { title: '月', dataIndex: 'month', width: 50, render: (v: number) => `第${v}月` },
              { title: '加盟', dataIndex: 'franchiseStores', width: 55 },
              { title: '直营', dataIndex: 'directStores', width: 55 },
              { title: '月收入', dataIndex: 'revenue', width: 100, render: (v: number) => fmtShort(v) },
              { title: '月净利润', dataIndex: 'netProfit', width: 100,
                render: (v: number) => <Text style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 500 }}>{fmtShort(v)}</Text> },
              { title: '累计净利润', dataIndex: 'cumulative', width: 110,
                render: (v: number) => <Text style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>{fmtShort(v)}</Text> },
            ]}
            rowKey="month"
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '24', '36'] }}
            scroll={{ y: 300 }}
          />
        </div>
      ),
    },
    {
      key: 'breakeven',
      label: <span><AimOutlined /> 盈亏平衡</span>,
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 16, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>公司盈亏平衡最低加盟店数</Text>
            <div style={{ fontSize: 36, fontWeight: 700, color: result.breakEvenFranchise !== null ? '#2f54eb' : '#f5222d', margin: '8px 0' }}>
              {result.breakEvenFranchise !== null ? `${result.breakEvenFranchise} 家` : '无法覆盖'}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              保持 {cfg.direct_stores} 家直营店不变，最少需要的加盟店数
            </Text>
          </Card>

          {result.breakEvenFranchise !== null && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>当前安全边际</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary">当前加盟店</Text>
                <Text strong style={{ fontSize: 16 }}>{cfg.franchise_stores} 家</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary">平衡点</Text>
                <Text strong style={{ fontSize: 16, color: '#2f54eb' }}>{result.breakEvenFranchise} 家</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text type="secondary">安全余量</Text>
                <Text strong style={{ fontSize: 16, color: cfg.franchise_stores > result.breakEvenFranchise ? '#52c41a' : '#f5222d' }}>
                  {cfg.franchise_stores - result.breakEvenFranchise} 家
                </Text>
              </div>
              <Progress
                percent={Math.min(100, Math.round(cfg.franchise_stores / result.breakEvenFranchise * 100))}
                status={cfg.franchise_stores >= result.breakEvenFranchise ? 'success' : 'exception'}
                format={pct => `${pct}%`}
              />
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                当前加盟店数为平衡点的 {Math.round(cfg.franchise_stores / result.breakEvenFranchise * 100)}%
              </Text>
            </Card>
          )}

          <Card size="small" title="敏感性分析">
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              不同成本/收入条件下的最低加盟店数
            </Text>
            <Table
              dataSource={(() => {
                const scenarios = [
                  { key: 'base', label: '当前', hrMul: 1, revMul: 1 },
                  { key: 'hr+20', label: '人力+20%', hrMul: 1.2, revMul: 1 },
                  { key: 'hr+50', label: '人力+50%', hrMul: 1.5, revMul: 1 },
                  { key: 'rev-10', label: '店均营收-10%', hrMul: 1, revMul: 0.9 },
                  { key: 'rev-20', label: '店均营收-20%', hrMul: 1, revMul: 0.8 },
                  { key: 'both', label: '人力+20% & 营收-10%', hrMul: 1.2, revMul: 0.9 },
                ];
                return scenarios.map(s => {
                  const testCfg = {
                    ...cfg,
                    hr_cost: Math.round(cfg.hr_cost * s.hrMul),
                    avg_store_revenue: Math.round(cfg.avg_store_revenue * s.revMul),
                  };
                  const r = calcCompany(testCfg);
                  return { ...s, breakEven: r.breakEvenFranchise, netProfit: r.netProfit };
                });
              })()}
              columns={[
                { title: '场景', dataIndex: 'label', width: 160 },
                { title: '最低加盟店', dataIndex: 'breakEven', width: 100,
                  render: (v: number | null) => v !== null ? <Text strong>{v} 家</Text> : <Tag color="red">无法覆盖</Tag> },
                { title: '当前净利润', dataIndex: 'netProfit', width: 110,
                  render: (v: number) => <Text style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 500 }}>{fmtShort(v)}</Text> },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '8px' : '16px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: 8 }} />公司财务模型
        </Title>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => setCfg(DEFAULT_CONFIG)}>重置</Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => setSaveModalOpen(true)}>保存为模板</Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 16, minHeight: 0, overflow: isMobile ? 'auto' : undefined }}>

        {/* ══════ 左侧：参数输入 ══════ */}
        <Card size="small" style={{ width: isMobile ? '100%' : 340, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, overflow: isMobile ? 'visible' : 'auto', padding: '8px 16px 16px' }}>

          <SectionTitle color="#2f54eb"><ShopOutlined /> 门店规模</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="加盟店数" value={cfg.franchise_stores} onChange={v => st('franchise_stores', v)} step={1} integer min={0} /></Col>
            <Col span={12}><MI label="直营店数" value={cfg.direct_stores} onChange={v => st('direct_stores', v)} step={1} integer min={0} /></Col>
          </Row>
          <MI label="每店月均营业额" value={cfg.avg_store_revenue} onChange={v => st('avg_store_revenue', v)} step={10000} />
          <div style={{ background: '#f0f5ff', borderRadius: 6, padding: '6px 12px', marginBottom: 4, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>门店总数</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2f54eb' }}>{result.totalStores} 家</div>
          </div>

          <SectionTitle color="#52c41a">收入参数</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="毛利率" value={cfg.gross_margin_rate} onChange={v => st('gross_margin_rate', v)} step={1} pct tip="(收入-原材料)/收入" /></Col>
            <Col span={12}><MI label="供应链毛利率" value={cfg.supply_chain_margin} onChange={v => st('supply_chain_margin', v)} step={1} pct tip="总部从原材料中赚取的利润率" /></Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}><MI label="管理费率" value={cfg.management_fee_rate} onChange={v => st('management_fee_rate', v)} step={0.5} pct tip="加盟店向总部缴纳" /></Col>
            <Col span={12}><MI label="直营店整体月净利" value={cfg.direct_store_profit} onChange={v => st('direct_store_profit', v)} step={10000} tip="所有直营店每月贡献的总净利润（未计占股）" /></Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}><MI label="直营门店平均占股" value={cfg.direct_store_equity} onChange={v => st('direct_store_equity', v)} step={5} pct tip="总部在直营店的平均持股比例" /></Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>总部直营店月收入</Text>
                <div style={{ height: 24, lineHeight: '24px', padding: '0 8px', background: '#fff7e6', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#fa8c16' }}>
                  {fmtShort(result.directStoreRevenue)}
                </div>
              </div>
            </Col>
          </Row>
          <MI label="其他抽佣（月）" value={cfg.other_commission} onChange={v => st('other_commission', v)} step={5000} tip="其他渠道的月度抽佣收入" />
          <div style={{ background: '#f6ffed', borderRadius: 6, padding: '6px 12px', marginBottom: 4 }}>
            <Row gutter={[0, 0]}>
              <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>供应链</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>{fmtShort(result.supplyChainRevenue)}</div></Col>
              <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>管理费</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#52c41a' }}>{fmtShort(result.managementFeeRevenue)}</div></Col>
              <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>直营店</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#fa8c16' }}>{fmtShort(result.directStoreRevenue)}</div></Col>
              <Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>其他抽佣</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#eb2f96' }}>{fmtShort(result.otherCommissionRevenue)}</div></Col>
            </Row>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>月总收入</Text>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{fmt(result.totalRevenue)}</div>
            </div>
          </div>

          <SectionTitle color="#f5222d">公司成本</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="人力成本" value={cfg.hr_cost} onChange={v => st('hr_cost', v)} step={10000} /></Col>
            <Col span={12}><MI label="办公室租金" value={cfg.office_rent} onChange={v => st('office_rent', v)} step={5000} /></Col>
          </Row>
          <MI label="其他运营费" value={cfg.other_expense} onChange={v => st('other_expense', v)} step={5000} />
          <div style={{ background: '#fff2e8', borderRadius: 6, padding: '6px 12px', marginBottom: 4, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>月总成本</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f5222d' }}>{fmt(result.totalCost)}</div>
          </div>

          <SectionTitle color="#722ed1">平均部门分红</SectionTitle>
          <Row gutter={8}>
            <Col span={8}><MI label="供应链收入分红" value={cfg.dept_supply_chain_pct} onChange={v => st('dept_supply_chain_pct', v)} step={5} pct tip="供应链收入中用于部门分红的比例" /></Col>
            <Col span={8}><MI label="直营门店收入分红" value={cfg.dept_operation_pct} onChange={v => st('dept_operation_pct', v)} step={5} pct tip="直营门店收入中用于部门分红的比例" /></Col>
            <Col span={8}><MI label="管理费收入分红" value={cfg.dept_management_pct} onChange={v => st('dept_management_pct', v)} step={5} pct tip="管理费收入中用于部门分红的比例" /></Col>
          </Row>
          <div style={{ background: '#f9f0ff', borderRadius: 6, padding: '6px 12px', marginBottom: 4 }}>
            <Row gutter={[0, 4]}>
              <Col span={16}><Text type="secondary" style={{ fontSize: 11 }}>供应链分红（{fmtShort(result.supplyChainRevenue)} × {cfg.dept_supply_chain_pct}%）</Text></Col>
              <Col span={8} style={{ textAlign: 'right' }}><Text strong style={{ color: '#722ed1', fontSize: 12 }}>{fmtShort(result.scDividend)}</Text></Col>
              <Col span={16}><Text type="secondary" style={{ fontSize: 11 }}>直营门店分红（{fmtShort(result.directStoreRevenue)} × {cfg.dept_operation_pct}%）</Text></Col>
              <Col span={8} style={{ textAlign: 'right' }}><Text strong style={{ color: '#722ed1', fontSize: 12 }}>{fmtShort(result.dsDividend)}</Text></Col>
              <Col span={16}><Text type="secondary" style={{ fontSize: 11 }}>管理费分红（{fmtShort(result.managementFeeRevenue)} × {cfg.dept_management_pct}%）</Text></Col>
              <Col span={8} style={{ textAlign: 'right' }}><Text strong style={{ color: '#722ed1', fontSize: 12 }}>{fmtShort(result.mfDividend)}</Text></Col>
            </Row>
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>月分红总额</Text>
              <Text strong style={{ color: '#722ed1' }}>{fmtShort(result.totalDividend)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>月净利润</Text>
              <Text strong style={{ fontSize: 14, color: result.netProfit >= 0 ? '#52c41a' : '#f5222d' }}>{fmt(result.netProfit)}</Text>
            </div>
          </div>

          <SectionTitle color="#13c2c2">增长预测</SectionTitle>
          <Row gutter={8}>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>预测期（月）</Text>
                <InputNumber size="small" value={cfg.projection_months} onChange={v => st('projection_months', v ?? 24)}
                  style={{ width: '100%' }} min={6} max={120} step={6} />
              </div>
            </Col>
            <Col span={12} />
            <Col span={12}><MI label="每月新增加盟店" value={cfg.monthly_new_franchise} onChange={v => st('monthly_new_franchise', v)} step={1} integer min={0} /></Col>
            <Col span={12}><MI label="每月新增直营店" value={cfg.monthly_new_direct} onChange={v => st('monthly_new_direct', v)} step={1} integer min={0} /></Col>
          </Row>
          {(cfg.monthly_new_franchise > 0 || cfg.monthly_new_direct > 0) && growth.length > 0 && (
            <div style={{ background: '#e6fffb', borderRadius: 6, padding: '6px 12px', marginBottom: 4, fontSize: 11 }}>
              <Text type="secondary">第{cfg.projection_months}月预计：</Text>
              <Text strong> {growth[growth.length - 1].totalStores}家店</Text>
              <Text type="secondary">，月净利润 </Text>
              <Text strong style={{ color: growth[growth.length - 1].netProfit >= 0 ? '#52c41a' : '#f5222d' }}>
                {fmtShort(growth[growth.length - 1].netProfit)}
              </Text>
            </div>
          )}

          <SectionTitle color="#8c8c8c">已保存模板</SectionTitle>
          {templates.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>暂无模板</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#fafafa', borderRadius: 4 }}>
                  <Text style={{ fontSize: 13, flex: 1 }} ellipsis>{t.name}</Text>
                  <Space size={4}>
                    <Button size="small" type="link" icon={<ImportOutlined />} onClick={() => handleLoad(t)} style={{ padding: 0, height: 'auto' }}>加载</Button>
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(t.id)}>
                      <Button size="small" type="link" danger icon={<DeleteOutlined />} style={{ padding: 0, height: 'auto' }} />
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ══════ 右侧：分析结果 ══════ */}
        <Card size="small" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 500 : undefined }}
          bodyStyle={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 8px 8px' : '0 16px 16px' }}>
          <Tabs items={resultTabs} size="small" />
        </Card>
      </div>

      <Modal title="保存为模板" open={saveModalOpen}
        onCancel={() => setSaveModalOpen(false)} onOk={handleSave}
        confirmLoading={saving} okText="保存">
        <div style={{ marginBottom: 12 }}>
          <Text>模板名称</Text>
          <Input placeholder="例如：当前门店规模、扩张计划A" value={saveName}
            onChange={e => setSaveName(e.target.value)} onPressEnter={handleSave}
            style={{ marginTop: 4 }} />
        </div>
        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col span={12}><Text type="secondary">门店：</Text>{result.totalStores}家（加盟{cfg.franchise_stores}+直营{cfg.direct_stores}）</Col>
            <Col span={12}><Text type="secondary">月净利润：</Text>
              <Text style={{ color: result.netProfit >= 0 ? '#52c41a' : '#f5222d' }}>{fmt(result.netProfit)}</Text>
            </Col>
          </Row>
        </Card>
      </Modal>

      <style>{`
        .total-row td { background: #f0f5ff !important; font-weight: 600; }
      `}</style>
    </div>
  );
};

export default CompanyModel;
