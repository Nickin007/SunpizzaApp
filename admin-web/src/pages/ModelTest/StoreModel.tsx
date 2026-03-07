import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Card, Row, Col, InputNumber, Button, Table, Space,
  Modal, Input, message, Popconfirm, Tabs, Tag, Select, Tooltip, Divider,
} from 'antd';
import {
  ShopOutlined, SaveOutlined, ReloadOutlined, DeleteOutlined,
  ImportOutlined, TableOutlined,
} from '@ant-design/icons';
import {
  listStoreTemplates, createStoreTemplate, deleteStoreTemplate,
} from '../../api/modelTest';
import type { StoreModelConfig, StoreModelTemplate } from '../../api/modelTest';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Text } = Typography;

const DEFAULT_CONFIG: StoreModelConfig = {
  total_investment: 530000,
  monthly_revenue: 220000,
  costs: { rent: 15000, utility: 5000, property_fee: 2000, depreciation: 0, misc: 2000 },
  labor_efficiency: 6,
  gross_margin_rate: 65,
  marketing_rate: 5,
  management_rate: 3,
  hq: { equity_share: 30, dividend_share: 30, supply_chain_margin: 10 },
  manager: { equity_share: 10, dividend_share: 20, salary: 8000 },
  investor: { equity_share: 60, dividend_share: 50 },
  projection_months: 36,
  scenario_optimistic: 20,
  scenario_pessimistic: -20,
};

const fmt = (v: number) => `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
const fmtShort = (v: number) => {
  if (Math.abs(v) >= 10000) return `¥${(v / 10000).toFixed(1)}万`;
  return fmt(v);
};

interface MonthlyRow {
  month: number;
  revenue: number;
  cost: number;
  netProfit: number;
  cumulative: number;
}

const LABOR_FLOOR = 10000;

function calcLaborCost(revenue: number, efficiency: number) {
  if (efficiency <= 0) return LABOR_FLOOR;
  return Math.max(Math.round(revenue / efficiency), LABOR_FLOOR);
}

interface PartyResult {
  investment: number;
  monthlyIncome: number;
  paybackMonth: number | null;
  annualRoi: number | null;
  details: Record<string, number>;
}

function calcModel(cfg: StoreModelConfig, revenueMultiplier = 1) {
  const totalInvestment = cfg.total_investment;
  const baseRevenue = cfg.monthly_revenue * revenueMultiplier;
  const baseRawMaterial = baseRevenue * (1 - cfg.gross_margin_rate / 100);
  const baseMarketing = baseRevenue * (cfg.marketing_rate / 100);
  const baseManagement = baseRevenue * (cfg.management_rate / 100);
  const baseLaborCost = calcLaborCost(baseRevenue, cfg.labor_efficiency);

  const pureFixedCost =
    cfg.costs.rent + cfg.costs.utility +
    cfg.costs.property_fee + cfg.costs.depreciation + cfg.costs.misc;

  const fixedCost = pureFixedCost + baseLaborCost;

  const baseTotalCost = baseRawMaterial + baseMarketing + baseManagement + fixedCost;
  const baseNetProfit = baseRevenue - baseTotalCost;

  const varRate = cfg.gross_margin_rate / 100 - cfg.marketing_rate / 100
    - cfg.management_rate / 100
    - (cfg.labor_efficiency > 0 ? 1 / cfg.labor_efficiency : 0);

  let breakEvenRevenue: number | null = null;
  if (varRate > 0) {
    const beVar = Math.round(pureFixedCost / varRate);
    if (calcLaborCost(beVar, cfg.labor_efficiency) > LABOR_FLOOR) {
      breakEvenRevenue = beVar;
    } else {
      const rateNoLabor = cfg.gross_margin_rate / 100 - cfg.marketing_rate / 100 - cfg.management_rate / 100;
      if (rateNoLabor > 0) breakEvenRevenue = Math.round((pureFixedCost + LABOR_FLOOR) / rateNoLabor);
    }
  } else {
    const rateNoLabor = cfg.gross_margin_rate / 100 - cfg.marketing_rate / 100 - cfg.management_rate / 100;
    if (rateNoLabor > 0) breakEvenRevenue = Math.round((pureFixedCost + LABOR_FLOOR) / rateNoLabor);
  }

  const breakEvenLaborCost = breakEvenRevenue !== null
    ? calcLaborCost(breakEvenRevenue, cfg.labor_efficiency) : null;

  // --- 三方收益 ---
  const supplyChainProfit = Math.round(baseRawMaterial * cfg.hq.supply_chain_margin / 100);

  const calcParty = (equityPct: number, monthlyIncome: number): PartyResult => {
    const inv = Math.round(totalInvestment * equityPct / 100);
    const months: MonthlyRow[] = [];
    let cum = -inv;
    let pb: number | null = null;
    for (let m = 1; m <= cfg.projection_months; m++) {
      cum += monthlyIncome;
      if (pb === null && cum >= 0) pb = m;
      months.push({ month: m, revenue: 0, cost: 0, netProfit: Math.round(monthlyIncome), cumulative: Math.round(cum) });
    }
    return {
      investment: inv,
      monthlyIncome: Math.round(monthlyIncome),
      paybackMonth: pb,
      annualRoi: inv > 0 ? Math.round(monthlyIncome * 12 / inv * 1000) / 10 : null,
      details: {},
    };
  };

  const hqDividend = Math.round(baseNetProfit * cfg.hq.dividend_share / 100);
  const hqIncome = baseManagement + supplyChainProfit + (baseNetProfit > 0 ? hqDividend : 0);
  const hqResult: PartyResult = {
    ...calcParty(cfg.hq.equity_share, hqIncome),
    details: {
      managementFee: Math.round(baseManagement),
      supplyChainProfit,
      dividend: baseNetProfit > 0 ? hqDividend : 0,
    },
  };

  const mgrDividend = Math.round(baseNetProfit * cfg.manager.dividend_share / 100);
  const mgrIncome = cfg.manager.salary + (baseNetProfit > 0 ? mgrDividend : 0);
  const mgrResult: PartyResult = {
    ...calcParty(cfg.manager.equity_share, mgrIncome),
    details: {
      salary: cfg.manager.salary,
      dividend: baseNetProfit > 0 ? mgrDividend : 0,
    },
  };

  const invDividend = Math.round(baseNetProfit * cfg.investor.dividend_share / 100);
  const invIncome = baseNetProfit > 0 ? invDividend : 0;
  const invResult: PartyResult = {
    ...calcParty(cfg.investor.equity_share, invIncome),
    details: {
      dividend: baseNetProfit > 0 ? invDividend : 0,
    },
  };

  // --- 门店整体月度 ---
  const months: MonthlyRow[] = [];
  let cumulative = -totalInvestment;
  let paybackMonth: number | null = null;

  for (let m = 1; m <= cfg.projection_months; m++) {
    cumulative += baseNetProfit;
    if (paybackMonth === null && cumulative >= 0) paybackMonth = m;
    months.push({
      month: m,
      revenue: Math.round(baseRevenue),
      cost: Math.round(baseTotalCost),
      netProfit: Math.round(baseNetProfit),
      cumulative: Math.round(cumulative),
    });
  }

  const annualRoi = totalInvestment > 0
    ? Math.round(baseNetProfit * 12 / totalInvestment * 1000) / 10 : null;

  // --- 三方月度累计（用于回本曲线） ---
  const hqMonthly: number[] = [];
  const mgrMonthly: number[] = [];
  const invMonthly: number[] = [];
  let hqCum = -hqResult.investment, mgrCum = -mgrResult.investment, invCum = -invResult.investment;
  for (let m = 1; m <= cfg.projection_months; m++) {
    hqCum += hqResult.monthlyIncome; mgrCum += mgrResult.monthlyIncome; invCum += invResult.monthlyIncome;
    hqMonthly.push(Math.round(hqCum));
    mgrMonthly.push(Math.round(mgrCum));
    invMonthly.push(Math.round(invCum));
  }

  return {
    totalInvestment,
    baseRevenue: Math.round(baseRevenue),
    baseTotalCost: Math.round(baseTotalCost),
    baseNetProfit: Math.round(baseNetProfit),
    baseRawMaterial: Math.round(baseRawMaterial),
    baseMarketing: Math.round(baseMarketing),
    baseManagement: Math.round(baseManagement),
    baseLaborCost,
    breakEvenLaborCost,
    fixedCost: Math.round(fixedCost),
    breakEvenRevenue,
    paybackMonth,
    annualRoi,
    months,
    hq: hqResult,
    mgr: mgrResult,
    inv: invResult,
    hqMonthly,
    mgrMonthly,
    invMonthly,
  };
}

const MI: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; pct?: boolean; tip?: string;
}> = ({ label, value, onChange, step = 1000, min = 0, max, pct, tip }) => (
  <div style={{ marginBottom: 10 }}>
    <Tooltip title={tip}>
      <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>{label}</Text>
    </Tooltip>
    {pct ? (
      <InputNumber size="small" value={value} onChange={v => onChange(v ?? 0)}
        style={{ width: '100%' }} min={min} max={max ?? 100} step={step}
        formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
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

const StoreModel: React.FC = () => {
  const isMobile = useIsMobile();
  const [cfg, setCfg] = useState<StoreModelConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<StoreModelTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [scenarioTab, setScenarioTab] = useState<string>('neutral');
  const [avgPrice, setAvgPrice] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [mgrExtraPct, setMgrExtraPct] = useState(0);
  const [invExtraPct, setInvExtraPct] = useState(0);
  const [hqStoreSubsidyPct, setHqStoreSubsidyPct] = useState(0);

  const neutral = useMemo(() => calcModel(cfg), [cfg]);
  const optimistic = useMemo(() => calcModel(cfg, 1 + cfg.scenario_optimistic / 100), [cfg]);
  const pessimistic = useMemo(() => calcModel(cfg, 1 + cfg.scenario_pessimistic / 100), [cfg]);

  const activeResult = scenarioTab === 'optimistic' ? optimistic
    : scenarioTab === 'pessimistic' ? pessimistic : neutral;

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const resp = await listStoreTemplates();
      if (resp.data?.code === 200) setTemplates(resp.data.data || []);
    } catch { message.error('加载模板失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadTemplates(); }, []);

  const handleSave = async () => {
    if (!saveName.trim()) { message.warning('请输入模板名称'); return; }
    setSaving(true);
    try {
      const resp = await createStoreTemplate({ name: saveName.trim(), config: cfg });
      if (resp.data?.code === 200) {
        message.success('模板保存成功');
        setSaveModalOpen(false);
        setSaveName('');
        loadTemplates();
      } else { message.error(resp.data?.message || '保存失败'); }
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleLoad = (t: StoreModelTemplate) => {
    setCfg({ ...DEFAULT_CONFIG, ...t.config });
    setAvgPrice(null);
    setOrderCount(null);
    message.success(`已加载模板「${t.name}」`);
  };

  const handleDelete = async (id: number) => {
    try {
      const resp = await deleteStoreTemplate(id);
      if (resp.data?.code === 200) { message.success('已删除'); loadTemplates(); }
    } catch { message.error('删除失败'); }
  };

  const sf = (k: keyof StoreModelConfig['costs'], v: number) =>
    setCfg(p => ({ ...p, costs: { ...p.costs, [k]: v } }));
  const st = (k: keyof StoreModelConfig, v: number) =>
    setCfg(p => ({ ...p, [k]: v }));
  const sHq = (k: keyof StoreModelConfig['hq'], v: number) =>
    setCfg(p => ({ ...p, hq: { ...p.hq, [k]: v } }));
  const sMgr = (k: keyof StoreModelConfig['manager'], v: number) =>
    setCfg(p => ({ ...p, manager: { ...p.manager, [k]: v } }));
  const sInv = (k: keyof StoreModelConfig['investor'], v: number) =>
    setCfg(p => ({ ...p, investor: { ...p.investor, [k]: v } }));

  const equityTotal = cfg.hq.equity_share + cfg.manager.equity_share + cfg.investor.equity_share;
  const dividendTotal = cfg.hq.dividend_share + cfg.manager.dividend_share + cfg.investor.dividend_share;

  /* ═══ 补贴后三方收益计算 ═══ */
  const hqSubsidyPct = mgrExtraPct + invExtraPct;
  const hqBaseIncome = neutral.hq.monthlyIncome;
  const subsidyToMgr = Math.round(hqBaseIncome * mgrExtraPct / 100);
  const subsidyToInv = Math.round(hqBaseIncome * invExtraPct / 100);

  const applySubsidy = (base: PartyResult, adjust: number, extraDetail?: { key: string; label: string; value: number }): PartyResult => {
    const income = base.monthlyIncome + adjust;
    const inv = base.investment;
    let pb: number | null = null;
    let cum = -inv;
    for (let m = 1; m <= cfg.projection_months; m++) {
      cum += income;
      if (pb === null && cum >= 0) pb = m;
    }
    const details = { ...base.details };
    if (extraDetail) details[extraDetail.key] = extraDetail.value;
    return {
      investment: inv,
      monthlyIncome: Math.round(income),
      paybackMonth: pb,
      annualRoi: inv > 0 ? Math.round(income * 12 / inv * 1000) / 10 : null,
      details,
    };
  };

  const adjHq = applySubsidy(neutral.hq, -(subsidyToMgr + subsidyToInv), { key: 'subsidy', label: '补贴支出', value: -(subsidyToMgr + subsidyToInv) });
  const adjMgr = applySubsidy(neutral.mgr, subsidyToMgr, { key: 'subsidy', label: '总部补贴', value: subsidyToMgr });
  const adjInv = applySubsidy(neutral.inv, subsidyToInv, { key: 'subsidy', label: '总部补贴', value: subsidyToInv });

  const partyCard = (title: string, color: string, party: PartyResult, labels: { key: string; label: string }[]) => (
    <Card size="small" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14, color }}>{title}</Text>
      </div>
      <Row gutter={[8, 4]}>
        <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>投资额</Text><div style={{ fontSize: 15, fontWeight: 700, color }}>{fmt(party.investment)}</div></Col>
        <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>月总收入</Text><div style={{ fontSize: 15, fontWeight: 700, color: party.monthlyIncome >= 0 ? '#52c41a' : '#f5222d' }}>{fmt(party.monthlyIncome)}</div></Col>
        <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>回本周期</Text><div style={{ fontSize: 14, fontWeight: 600 }}>{party.paybackMonth !== null ? `${party.paybackMonth}个月` : <Tag color="red" style={{ margin: 0 }}>未回本</Tag>}</div></Col>
        <Col span={12}><Text type="secondary" style={{ fontSize: 11 }}>年化ROI</Text><div style={{ fontSize: 14, fontWeight: 600, color: (party.annualRoi ?? 0) >= 0 ? '#52c41a' : '#f5222d' }}>{party.annualRoi !== null ? `${party.annualRoi}%` : '—'}</div></Col>
      </Row>
      <Divider style={{ margin: '8px 0 4px' }} />
      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>收入明细</Text>
      {labels.map(l => (
        <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>{l.label}</Text>
          <Text style={{ fontSize: 12, fontWeight: 500, color: (party.details[l.key] ?? 0) < 0 ? '#f5222d' : undefined }}>{fmtShort(party.details[l.key] ?? 0)}</Text>
        </div>
      ))}
    </Card>
  );

  const resultTabs = [
    {
      key: 'parties',
      label: <span><ShopOutlined /> 三方收益</span>,
      children: (
        <div>
          <Card size="small" style={{ borderTop: '3px solid #2f54eb', marginBottom: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#2f54eb' }}>门店视角</Text>
            </div>
            <Row gutter={[8, 4]}>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>总投资</Text><div style={{ fontSize: 14, fontWeight: 700, color: '#2f54eb' }}>{fmtShort(neutral.totalInvestment)}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>月收入</Text><div style={{ fontSize: 14, fontWeight: 700, color: '#13c2c2' }}>{fmtShort(neutral.baseRevenue)}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>月成本</Text><div style={{ fontSize: 14, fontWeight: 700, color: '#fa8c16' }}>{fmtShort(neutral.baseTotalCost)}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>月净利润</Text><div style={{ fontSize: 14, fontWeight: 700, color: neutral.baseNetProfit >= 0 ? '#52c41a' : '#f5222d' }}>{fmtShort(neutral.baseNetProfit)}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>回本周期</Text><div style={{ fontSize: 14, fontWeight: 700 }}>{neutral.paybackMonth !== null ? `${neutral.paybackMonth}月` : <Tag color="red" style={{ margin: 0, fontSize: 11 }}>未回本</Tag>}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>年化ROI</Text><div style={{ fontSize: 14, fontWeight: 700, color: (neutral.annualRoi ?? 0) >= 0 ? '#52c41a' : '#f5222d' }}>{neutral.annualRoi !== null ? `${neutral.annualRoi}%` : '—'}</div></Col>
            </Row>
          </Card>
          <Row gutter={[12, 12]}>
            <Col span={8}>
              {partyCard('总部', '#1890ff', adjHq, [
                { key: 'managementFee', label: '管理费收入' },
                { key: 'supplyChainProfit', label: '供应链利润' },
                { key: 'dividend', label: '分红' },
                ...(hqSubsidyPct > 0 ? [{ key: 'subsidy', label: '补贴支出' }] : []),
              ])}
            </Col>
            <Col span={8}>
              {partyCard('店长', '#52c41a', adjMgr, [
                { key: 'salary', label: '工资收入' },
                { key: 'dividend', label: '分红' },
                ...(mgrExtraPct > 0 ? [{ key: 'subsidy', label: '总部补贴' }] : []),
              ])}
            </Col>
            <Col span={8}>
              {partyCard('投资商', '#fa8c16', adjInv, [
                { key: 'dividend', label: '分红' },
                ...(invExtraPct > 0 ? [{ key: 'subsidy', label: '总部补贴' }] : []),
              ])}
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0 12px' }} />
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px' }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>总部收入补贴设置</Text>
            <Row gutter={12} align="middle">
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>总部补贴比例</Text>
                <InputNumber size="middle" value={hqSubsidyPct}
                  onChange={v => {
                    const total = v ?? 0;
                    const oldTotal = mgrExtraPct + invExtraPct;
                    if (oldTotal > 0) {
                      const ratio = mgrExtraPct / oldTotal;
                      setMgrExtraPct(Math.round(total * ratio));
                      setInvExtraPct(total - Math.round(total * ratio));
                    } else {
                      const half = Math.round(total / 2);
                      setMgrExtraPct(half);
                      setInvExtraPct(total - half);
                    }
                  }}
                  style={{ width: '100%' }} min={0} max={100} step={5} precision={0}
                  formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>店长额外收入比例</Text>
                <InputNumber size="middle" value={mgrExtraPct} onChange={v => setMgrExtraPct(v ?? 0)}
                  style={{ width: '100%' }} min={0} max={100} step={5} precision={0}
                  formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>投资商额外收入比例</Text>
                <InputNumber size="middle" value={invExtraPct} onChange={v => setInvExtraPct(v ?? 0)}
                  style={{ width: '100%' }} min={0} max={100} step={5} precision={0}
                  formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
              </Col>
            </Row>
            {hqSubsidyPct > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#8c8c8c' }}>
                总部每月从自身收入中拿出 <Text strong style={{ color: '#f5222d' }}>{fmt(subsidyToMgr + subsidyToInv)}</Text> 补贴给店长
                {subsidyToMgr > 0 && <> ({fmt(subsidyToMgr)})</>}
                {subsidyToInv > 0 && <> 和投资商 ({fmt(subsidyToInv)})</>}
              </div>
            )}
          </div>

          <Divider style={{ margin: '16px 0 12px' }} />
          {(() => {
            const GM = cfg.gross_margin_rate / 100;
            const MKT = cfg.marketing_rate / 100;
            const MGMT = cfg.management_rate / 100;
            const SCM = cfg.hq.supply_chain_margin / 100;
            const LE = cfg.labor_efficiency;
            const pf = cfg.costs.rent + cfg.costs.utility + cfg.costs.property_fee + cfg.costs.depreciation + cfg.costs.misc;

            const calcBEWithSubsidy = (subPct: number) => {
              const sp = subPct / 100;
              const varR1 = GM - MKT - MGMT * (1 - sp) + (1 - GM) * SCM * sp - (LE > 0 ? 1 / LE : 0);
              if (varR1 > 0) {
                const be1 = Math.round(pf / varR1);
                if (calcLaborCost(be1, LE) > LABOR_FLOOR) return be1;
              }
              const varR2 = GM - MKT - MGMT * (1 - sp) + (1 - GM) * SCM * sp;
              if (varR2 > 0) return Math.round((pf + LABOR_FLOOR) / varR2);
              return null;
            };

            const origBE = neutral.breakEvenRevenue;
            const curBE = calcBEWithSubsidy(hqStoreSubsidyPct);
            const maxBE = calcBEWithSubsidy(100);

            const curHqSubsidyAtBE = curBE !== null
              ? Math.round(curBE * MGMT + curBE * (1 - GM) * SCM) * hqStoreSubsidyPct / 100
              : null;

            return (
              <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '12px 16px' }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>总部补贴门店 — 盈亏平衡点分析</Text>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>总部补贴门店比例（总部收入返还给门店）</Text>
                  <InputNumber size="middle" value={hqStoreSubsidyPct}
                    onChange={v => setHqStoreSubsidyPct(v ?? 0)}
                    style={{ width: 200 }} min={0} max={100} step={5} precision={0}
                    formatter={v => `${v}%`} parser={v => Number((v || '').replace('%', ''))} />
                </div>
                <Row gutter={[12, 8]}>
                  <Col span={8}>
                    <div style={{ background: '#fff', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>原始平衡点</Text>
                      <div style={{ fontSize: 16, fontWeight: 700, color: origBE !== null ? '#8c8c8c' : '#f5222d' }}>
                        {origBE !== null ? fmtShort(origBE) : '无法盈利'}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>无补贴</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ background: '#fff', borderRadius: 6, padding: '8px 12px', textAlign: 'center', border: hqStoreSubsidyPct > 0 ? '1px solid #1890ff' : undefined }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>补贴后平衡点</Text>
                      <div style={{ fontSize: 16, fontWeight: 700, color: curBE !== null ? '#1890ff' : '#f5222d' }}>
                        {curBE !== null ? fmtShort(curBE) : '无法盈利'}
                      </div>
                      {curBE !== null && origBE !== null && (
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          降低了 <Text strong style={{ color: '#52c41a' }}>{fmtShort(origBE - curBE)}</Text>
                        </Text>
                      )}
                      {curHqSubsidyAtBE !== null && hqStoreSubsidyPct > 0 && (
                        <div><Text type="secondary" style={{ fontSize: 10 }}>总部月补贴 {fmtShort(Math.round(curHqSubsidyAtBE))}</Text></div>
                      )}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ background: '#fff', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>最低可达平衡点</Text>
                      <div style={{ fontSize: 16, fontWeight: 700, color: maxBE !== null ? '#52c41a' : '#f5222d' }}>
                        {maxBE !== null ? fmtShort(maxBE) : '无法盈利'}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>总部100%补贴</Text>
                    </div>
                  </Col>
                </Row>
                {origBE !== null && curBE !== null && cfg.monthly_revenue > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#595959' }}>
                    当前月收入 <Text strong>{fmtShort(cfg.monthly_revenue)}</Text> 为补贴后平衡点的{' '}
                    <Text strong style={{ color: cfg.monthly_revenue >= curBE ? '#52c41a' : '#f5222d' }}>
                      {Math.round(cfg.monthly_revenue / curBE * 100)}%
                    </Text>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ),
    },
    {
      key: 'monthly',
      label: <span><TableOutlined /> 月度明细</span>,
      children: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Text style={{ marginRight: 8 }}>场景：</Text>
            <Select value={scenarioTab} onChange={setScenarioTab} style={{ width: 110 }} size="small">
              <Select.Option value="optimistic">🟢 乐观</Select.Option>
              <Select.Option value="neutral">🔵 中性</Select.Option>
              <Select.Option value="pessimistic">🔴 悲观</Select.Option>
            </Select>
          </div>
          <Table
            dataSource={activeResult.months}
            columns={[
              { title: '月份', dataIndex: 'month', width: 65, render: (v: number) => `第${v}月` },
              { title: '月收入', dataIndex: 'revenue', width: 110, render: (v: number) => fmt(v) },
              { title: '月成本', dataIndex: 'cost', width: 110, render: (v: number) => fmt(v) },
              { title: '月净利润', dataIndex: 'netProfit', width: 110,
                render: (v: number) => <Text style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 500 }}>{fmt(v)}</Text> },
              { title: '累计现金流', dataIndex: 'cumulative', width: 130,
                render: (v: number) => <Text style={{ color: v >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>{fmt(v)}</Text> },
            ]}
            rowKey="month"
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '24', '36'] }}
            scroll={{ y: 480 }}
            rowClassName={r => r.cumulative >= 0 && (r.month === 1 || activeResult.months[r.month - 2]?.cumulative < 0) ? 'payback-row' : ''}
          />
        </div>
      ),
    },
  ];

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div style={{ padding: isMobile ? '8px' : '16px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <ShopOutlined style={{ marginRight: 8 }} />单店投资回报模型
        </Title>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => { setCfg(DEFAULT_CONFIG); setAvgPrice(null); setOrderCount(null); }}>重置</Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => setSaveModalOpen(true)}>保存为模板</Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 16, minHeight: 0, overflow: isMobile ? 'auto' : undefined }}>

        {/* ══════ 左侧：参数输入 ══════ */}
        <Card size="small" style={{ width: isMobile ? '100%' : 340, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, overflow: isMobile ? 'visible' : 'auto', padding: '8px 16px 16px' }}>

          <SectionTitle color="#2f54eb">初始投资</SectionTitle>
          <MI label="总投资额" value={cfg.total_investment} onChange={v => st('total_investment', v)} step={10000} />
          <div style={{ background: '#f0f5ff', borderRadius: 6, padding: '6px 12px', marginBottom: 4, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>总投资</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2f54eb' }}>{fmt(cfg.total_investment)}</div>
          </div>

          <SectionTitle color="#52c41a">月收入</SectionTitle>
          <MI label="月总收入" value={cfg.monthly_revenue} onChange={v => {
            st('monthly_revenue', v);
            setAvgPrice(null);
            setOrderCount(null);
          }} step={5000} />
          <Row gutter={8}>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>客单价</Text>
                <InputNumber size="small"
                  value={avgPrice}
                  placeholder="—"
                  onChange={v => {
                    const p = v ?? 0;
                    setAvgPrice(p || null);
                    if (p > 0) {
                      const count = Math.round(cfg.monthly_revenue / p);
                      setOrderCount(count || null);
                    }
                  }}
                  style={{ width: '100%' }} min={0} step={1}
                  precision={1}
                  formatter={v => v ? `¥ ${v}` : ''}
                  parser={v => Number((v || '').replace(/¥\s?/g, ''))}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>月单量</Text>
                <InputNumber size="small"
                  value={orderCount}
                  placeholder="—"
                  onChange={v => {
                    const c = v ?? 0;
                    setOrderCount(c || null);
                    if (c > 0 && avgPrice && avgPrice > 0) {
                      const rev = Math.round(avgPrice * c);
                      setCfg(prev => ({ ...prev, monthly_revenue: rev }));
                    }
                  }}
                  style={{ width: '100%' }} min={0} step={100}
                  precision={0}
                />
              </div>
            </Col>
          </Row>
          <div style={{ background: '#f6ffed', borderRadius: 6, padding: '6px 12px', marginBottom: 4, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11 }}>月总收入</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{fmt(cfg.monthly_revenue)}</div>
          </div>

          <SectionTitle color="#f5222d">成本设置</SectionTitle>
          <Row gutter={8}>
            <Col span={8}><MI label="毛利率" value={cfg.gross_margin_rate} onChange={v => st('gross_margin_rate', v)} step={1} pct tip="(收入-原材料)/收入" /></Col>
            <Col span={8}><MI label="营销占比" value={cfg.marketing_rate} onChange={v => st('marketing_rate', v)} step={0.5} pct tip="营销费=收入×占比" /></Col>
            <Col span={8}><MI label="管理费率" value={cfg.management_rate} onChange={v => st('management_rate', v)} step={0.5} pct tip="管理费=收入×费率，交给总部" /></Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', margin: '2px 0 6px' }}>人工成本</Text>
          <Row gutter={8}>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Tooltip title="每1元工资产生多少营业额">
                  <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>人效</Text>
                </Tooltip>
                <InputNumber size="small" value={cfg.labor_efficiency}
                  onChange={v => st('labor_efficiency', v ?? 0)}
                  style={{ width: '100%' }} min={0.1} step={0.5} precision={1} />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>月人工成本</Text>
                <div style={{ padding: '3px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>当前</Text>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fa541c' }}>{fmtShort(neutral.baseLaborCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>平衡点</Text>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#2f54eb' }}>
                      {neutral.breakEvenLaborCost !== null ? fmtShort(neutral.breakEvenLaborCost) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', margin: '2px 0 6px' }}>其他固定成本</Text>
          <Row gutter={8}>
            <Col span={12}><MI label="房租" value={cfg.costs.rent} onChange={v => sf('rent', v)} /></Col>
            <Col span={12}><MI label="水电" value={cfg.costs.utility} onChange={v => sf('utility', v)} step={500} /></Col>
            <Col span={12}><MI label="物业费" value={cfg.costs.property_fee} onChange={v => sf('property_fee', v)} step={500} /></Col>
            <Col span={12}><MI label="折旧摊销" value={cfg.costs.depreciation} onChange={v => sf('depreciation', v)} step={500} tip="装修设备按月摊销" /></Col>
            <Col span={12}><MI label="其他杂费" value={cfg.costs.misc} onChange={v => sf('misc', v)} step={500} /></Col>
          </Row>
          <div style={{ background: '#fff2e8', borderRadius: 6, padding: '6px 12px', marginBottom: 4 }}>
            <Row gutter={[0, 0]}>
              <Col span={5}><Text type="secondary" style={{ fontSize: 10 }}>原材料</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{fmtShort(neutral.baseRawMaterial)}</div></Col>
              <Col span={5}><Text type="secondary" style={{ fontSize: 10 }}>营销</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{fmtShort(neutral.baseMarketing)}</div></Col>
              <Col span={5}><Text type="secondary" style={{ fontSize: 10 }}>管理费</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#eb2f96' }}>{fmtShort(neutral.baseManagement)}</div></Col>
              <Col span={5}><Text type="secondary" style={{ fontSize: 10 }}>人工</Text><div style={{ fontSize: 12, fontWeight: 600, color: '#fa541c' }}>{fmtShort(neutral.baseLaborCost)}</div></Col>
              <Col span={4}><Text type="secondary" style={{ fontSize: 10 }}>固定</Text><div style={{ fontSize: 12, fontWeight: 600 }}>{fmtShort(neutral.fixedCost - neutral.baseLaborCost)}</div></Col>
            </Row>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>月总成本</Text>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f5222d' }}>{fmt(neutral.baseTotalCost)}</div>
            </div>
            <Divider style={{ margin: '6px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>盈亏平衡点（月营业额）</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: neutral.breakEvenRevenue !== null ? '#2f54eb' : '#f5222d' }}>
                {neutral.breakEvenRevenue !== null ? fmt(neutral.breakEvenRevenue) : '无法盈利'}
              </div>
              {neutral.breakEvenRevenue !== null && (
                <div style={{ marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    平衡点人工成本：<span style={{ fontWeight: 600, color: '#2f54eb' }}>{fmt(neutral.breakEvenLaborCost!)}</span>
                  </Text>
                </div>
              )}
              {neutral.breakEvenRevenue !== null && cfg.monthly_revenue > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  当前收入为平衡点的 {Math.round(cfg.monthly_revenue / neutral.breakEvenRevenue * 100)}%
                </Text>
              )}
            </div>
          </div>

          <SectionTitle color="#1890ff">总部参数</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="总部占股" value={cfg.hq.equity_share} onChange={v => sHq('equity_share', v)} step={5} pct /></Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>总部投资额</Text>
                <div style={{ height: 24, lineHeight: '24px', padding: '0 8px', background: '#f0f5ff', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#1890ff' }}>
                  {fmt(neutral.hq.investment)}
                </div>
              </div>
            </Col>
            <Col span={12}><MI label="总部分红比例" value={cfg.hq.dividend_share} onChange={v => sHq('dividend_share', v)} step={5} pct /></Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>总部管理费收入</Text>
                <div style={{ height: 24, lineHeight: '24px', padding: '0 8px', background: '#f0f5ff', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#1890ff' }}>
                  {fmtShort(neutral.baseManagement)}/月
                </div>
              </div>
            </Col>
            <Col span={12}><MI label="供应链毛利率" value={cfg.hq.supply_chain_margin} onChange={v => sHq('supply_chain_margin', v)} step={1} pct tip="总部从原材料供应中赚取的利润率" /></Col>
          </Row>

          <SectionTitle color="#52c41a">店长参数</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="店长占股" value={cfg.manager.equity_share} onChange={v => sMgr('equity_share', v)} step={5} pct /></Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>店长投资额</Text>
                <div style={{ height: 24, lineHeight: '24px', padding: '0 8px', background: '#f6ffed', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#52c41a' }}>
                  {fmt(neutral.mgr.investment)}
                </div>
              </div>
            </Col>
            <Col span={12}><MI label="店长分红比例" value={cfg.manager.dividend_share} onChange={v => sMgr('dividend_share', v)} step={5} pct /></Col>
            <Col span={12}><MI label="店长工资" value={cfg.manager.salary} onChange={v => sMgr('salary', v)} step={1000} tip="已包含在人效计算的总人工成本中" /></Col>
          </Row>

          <SectionTitle color="#fa8c16">投资商参数</SectionTitle>
          <Row gutter={8}>
            <Col span={12}><MI label="投资商占股" value={cfg.investor.equity_share} onChange={v => sInv('equity_share', v)} step={5} pct /></Col>
            <Col span={12}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>投资商投资额</Text>
                <div style={{ height: 24, lineHeight: '24px', padding: '0 8px', background: '#fff7e6', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#fa8c16' }}>
                  {fmt(neutral.inv.investment)}
                </div>
              </div>
            </Col>
            <Col span={12}><MI label="投资商分红比例" value={cfg.investor.dividend_share} onChange={v => sInv('dividend_share', v)} step={5} pct /></Col>
          </Row>

          {(equityTotal !== 100 || dividendTotal !== 100) && (
            <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, padding: '6px 12px', marginBottom: 8 }}>
              {equityTotal !== 100 && (
                <Text type="danger" style={{ fontSize: 11, display: 'block' }}>
                  占股合计 {equityTotal}%，应为 100%
                </Text>
              )}
              {dividendTotal !== 100 && (
                <Text type="danger" style={{ fontSize: 11, display: 'block' }}>
                  分红比例合计 {dividendTotal}%，应为 100%
                </Text>
              )}
            </div>
          )}

          <SectionTitle color="#722ed1">模拟参数</SectionTitle>
          <Row gutter={8}>
            <Col span={24}>
              <div style={{ marginBottom: 10 }}>
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1 }}>预测期（月）</Text>
                <InputNumber size="small" value={cfg.projection_months} onChange={v => st('projection_months', v ?? 36)}
                  style={{ width: '100%' }} min={6} max={120} step={6} />
              </div>
            </Col>
            <Col span={12}><MI label="乐观偏移" value={cfg.scenario_optimistic} onChange={v => st('scenario_optimistic', v)} step={5} pct /></Col>
            <Col span={12}><MI label="悲观偏移" value={cfg.scenario_pessimistic} onChange={v => st('scenario_pessimistic', v)} step={5} pct /></Col>
          </Row>

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
          <Input placeholder="例如：标准店型A、社区小店" value={saveName}
            onChange={e => setSaveName(e.target.value)} onPressEnter={handleSave}
            style={{ marginTop: 4 }} />
        </div>
        <Card size="small" style={{ background: '#fafafa' }}>
          <Row gutter={[16, 8]}>
            <Col span={12}><Text type="secondary">总投资：</Text>{fmt(neutral.totalInvestment)}</Col>
            <Col span={12}><Text type="secondary">月净利润：</Text>
              <Text style={{ color: neutral.baseNetProfit >= 0 ? '#52c41a' : '#f5222d' }}>{fmt(neutral.baseNetProfit)}</Text>
            </Col>
            <Col span={12}><Text type="secondary">回本：</Text>
              {neutral.paybackMonth !== null ? `${neutral.paybackMonth} 个月` : '未回本'}
            </Col>
            <Col span={12}><Text type="secondary">年化ROI：</Text>
              {neutral.annualRoi !== null ? `${neutral.annualRoi}%` : '—'}
            </Col>
          </Row>
        </Card>
      </Modal>

      <style>{`
        .payback-row td { background: #f6ffed !important; }
      `}</style>
    </div>
  );
};

export default StoreModel;
