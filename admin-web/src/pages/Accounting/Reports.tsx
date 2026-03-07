import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, DatePicker, Button, Select, Space,
  Typography, Alert, message, Empty,
} from 'antd';
import {
  DownloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  getTrialBalance, getItemBalance, getBalanceSheet,
  getIncomeStatement, getCashFlowStatement, exportReport,
  listItemCategories,
} from '../../api/finance';
import type {
  TrialBalanceRow, ItemBalanceRow, BalanceSheetData,
  IncomeRow, CashFlowData, AccountItemCategory,
} from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import './accounting.css';

const { Title } = Typography;

const formatNum = (v: number | null | undefined): string => {
  if (v == null) return '-';
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numCell = (v: number | null | undefined) => {
  if (v == null) return <span className="acct-num">-</span>;
  const cls = v < 0 ? 'acct-num acct-num-negative' : 'acct-num';
  return <span className={cls}>{formatNum(v)}</span>;
};

const ReportHeader: React.FC<{ title: string; bookName: string; period: string }> = ({ title, bookName, period }) => (
  <div className="acct-report-title">
    <h3>{title}</h3>
    <div className="report-meta">{bookName} &nbsp;|&nbsp; 会计期间：{period}</div>
  </div>
);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ===================== 科目余额表 =====================

const TrialBalanceTab: React.FC<{ bookId: number; bookName: string }> = ({ bookId, bookName }) => {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrialBalance(bookId, period.format('YYYY-MM'));
      if (res.data.code === 200) {
        setData(res.data.data);
        setQueried(true);
      } else {
        message.error(res.data.message || '查询失败');
      }
    } catch {
      message.error('查询科目余额表失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, period]);

  const handleExport = async () => {
    try {
      const res = await exportReport(bookId, 'trial_balance', period.format('YYYY-MM'));
      downloadBlob(new Blob([res.data]), `科目余额表_${period.format('YYYY-MM')}.xlsx`);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<TrialBalanceRow> = [
    {
      title: '科目编码', dataIndex: 'code', width: 120,
      render: (v, r) => <span className={`acct-indent-${r.level}`}>{v}</span>,
    },
    { title: '科目名称', dataIndex: 'name', width: 180 },
    { title: '方向', dataIndex: 'balance_direction', width: 60, align: 'center',
      render: (v: string) => v === 'debit' ? '借' : '贷' },
    { title: '期初余额', dataIndex: 'opening_balance', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '本期借方', dataIndex: 'period_debit', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '本期贷方', dataIndex: 'period_credit', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '期末余额', dataIndex: 'closing_balance', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker picker="month" value={period} onChange={(v) => v && setPeriod(v)}
          allowClear={false} style={{ width: 160 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch} loading={loading}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={data.length === 0}>导出 Excel</Button>
      </Space>
      {queried && data.length > 0 && (
        <ReportHeader title="科目余额表" bookName={bookName} period={period.format('YYYY-MM')} />
      )}
      {queried && data.length === 0 && !loading ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          className="acct-table"
          columns={columns}
          dataSource={data}
          rowKey="subject_id"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 900 : undefined }}
          bordered
        />
      )}
    </>
  );
};

// ===================== 核算项目余额表 =====================

const ItemBalanceTab: React.FC<{ bookId: number; bookName: string }> = ({ bookId, bookName }) => {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Dayjs>(dayjs());
  const [categories, setCategories] = useState<AccountItemCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [data, setData] = useState<ItemBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  useEffect(() => {
    listItemCategories(bookId).then((res) => {
      if (res.data.code === 200) {
        setCategories(res.data.data);
        if (res.data.data.length > 0) setCategoryId(res.data.data[0].id);
      }
    }).catch(() => message.error('加载核算项目分类失败'));
  }, [bookId]);

  const fetch = useCallback(async () => {
    if (!categoryId) { message.warning('请先选择核算项目分类'); return; }
    setLoading(true);
    try {
      const res = await getItemBalance(bookId, period.format('YYYY-MM'), categoryId);
      if (res.data.code === 200) {
        setData(res.data.data);
        setQueried(true);
      } else {
        message.error(res.data.message || '查询失败');
      }
    } catch {
      message.error('查询核算项目余额表失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, period, categoryId]);

  const handleExport = async () => {
    try {
      const res = await exportReport(bookId, 'item_balance', period.format('YYYY-MM'));
      downloadBlob(new Blob([res.data]), `核算项目余额表_${period.format('YYYY-MM')}.xlsx`);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<ItemBalanceRow> = [
    { title: '科目编码', dataIndex: 'subject_code', width: 120 },
    { title: '科目名称', dataIndex: 'subject_name', width: 140 },
    { title: '项目编码', dataIndex: 'item_code', width: 120 },
    { title: '项目名称', dataIndex: 'item_name', width: 140 },
    { title: '期初余额', dataIndex: 'opening_balance', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '本期借方', dataIndex: 'period_debit', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '本期贷方', dataIndex: 'period_credit', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
    { title: '期末余额', dataIndex: 'closing_balance', width: 140, align: 'right',
      render: (v: number) => numCell(v) },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker picker="month" value={period} onChange={(v) => v && setPeriod(v)}
          allowClear={false} style={{ width: 160 }} />
        <Select
          placeholder="选择核算项目分类"
          value={categoryId}
          onChange={setCategoryId}
          style={{ width: 200 }}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch} loading={loading}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={data.length === 0}>导出 Excel</Button>
      </Space>
      {queried && data.length > 0 && (
        <ReportHeader title="核算项目余额表" bookName={bookName} period={period.format('YYYY-MM')} />
      )}
      {queried && data.length === 0 && !loading ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          className="acct-table"
          columns={columns}
          dataSource={data}
          rowKey={(r) => `${r.subject_id}-${r.item_id}`}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 1000 : undefined }}
          bordered
        />
      )}
    </>
  );
};

// ===================== 资产负债表 =====================

interface BSFlatRow {
  key: string;
  name: string;
  amount: number | null;
  isGroup?: boolean;
  isTotal?: boolean;
}

const BalanceSheetTab: React.FC<{ bookId: number; bookName: string }> = ({ bookId, bookName }) => {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet(bookId, period.format('YYYY-MM'));
      if (res.data.code === 200) {
        setData(res.data.data);
        setQueried(true);
      } else {
        message.error(res.data.message || '查询失败');
      }
    } catch {
      message.error('查询资产负债表失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, period]);

  const handleExport = async () => {
    try {
      const res = await exportReport(bookId, 'balance_sheet', period.format('YYYY-MM'));
      downloadBlob(new Blob([res.data]), `资产负债表_${period.format('YYYY-MM')}.xlsx`);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const buildRows = (): BSFlatRow[] => {
    if (!data) return [];
    const rows: BSFlatRow[] = [];

    rows.push({ key: 'asset-title', name: '资产', amount: null, isGroup: true });
    data.assets.forEach((group, gi) => {
      rows.push({ key: `ag-${gi}`, name: group.name, amount: null, isGroup: true });
      group.items.forEach((item, ii) => {
        rows.push({ key: `ai-${gi}-${ii}`, name: `  ${item.name}`, amount: item.amount });
      });
    });
    rows.push({ key: 'total-assets', name: '资产合计', amount: data.total_assets, isTotal: true });

    rows.push({ key: 'liability-title', name: '负债', amount: null, isGroup: true });
    data.liabilities.forEach((group, gi) => {
      rows.push({ key: `lg-${gi}`, name: group.name, amount: null, isGroup: true });
      group.items.forEach((item, ii) => {
        rows.push({ key: `li-${gi}-${ii}`, name: `  ${item.name}`, amount: item.amount });
      });
    });
    rows.push({ key: 'total-liabilities', name: '负债合计', amount: data.total_liabilities, isTotal: true });

    rows.push({ key: 'equity-title', name: '所有者权益', amount: null, isGroup: true });
    data.equity.forEach((item, i) => {
      rows.push({ key: `ei-${i}`, name: `  ${item.name}`, amount: item.amount });
    });
    rows.push({ key: 'total-equity', name: '所有者权益合计', amount: data.total_equity, isTotal: true });
    rows.push({ key: 'total-le', name: '负债和所有者权益合计', amount: data.total_liabilities_equity, isTotal: true });

    return rows;
  };

  const columns: ColumnsType<BSFlatRow> = [
    { title: '项目', dataIndex: 'name', width: 300,
      render: (v, r) => r.isGroup || r.isTotal ? <strong>{v}</strong> : v },
    { title: '金额', dataIndex: 'amount', width: 200, align: 'right',
      render: (v: number | null) => v != null ? numCell(v) : '' },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker picker="month" value={period} onChange={(v) => v && setPeriod(v)}
          allowClear={false} style={{ width: 160 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch} loading={loading}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!data}>导出 Excel</Button>
      </Space>
      {queried && data && (
        <ReportHeader title="资产负债表" bookName={bookName} period={period.format('YYYY-MM')} />
      )}
      {queried && !data && !loading ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          className="acct-table"
          columns={columns}
          dataSource={buildRows()}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 500 : undefined }}
          bordered
          rowClassName={(r) => {
            if (r.isTotal) return 'acct-total-row';
            if (r.isGroup) return 'acct-group-row';
            return '';
          }}
        />
      )}
    </>
  );
};

// ===================== 利润表 =====================

interface IncomeDisplayRow extends IncomeRow {
  key: string;
}

const IncomeStatementTab: React.FC<{ bookId: number; bookName: string }> = ({ bookId, bookName }) => {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<IncomeDisplayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIncomeStatement(bookId, period.format('YYYY-MM'));
      if (res.data.code === 200) {
        const displayRows = res.data.data.rows.map((r, i) => ({ ...r, key: `income-${i}` }));
        setRows(displayRows);
        setQueried(true);
      } else {
        message.error(res.data.message || '查询失败');
      }
    } catch {
      message.error('查询利润表失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, period]);

  const handleExport = async () => {
    try {
      const res = await exportReport(bookId, 'income_statement', period.format('YYYY-MM'));
      downloadBlob(new Blob([res.data]), `利润表_${period.format('YYYY-MM')}.xlsx`);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<IncomeDisplayRow> = [
    {
      title: '项目', dataIndex: 'name', width: 300,
      render: (v: string, r) => {
        const indent = r.level > 1 ? `acct-indent-${Math.min(r.level - 1, 3)}` : '';
        const bold = r.level === 0;
        return <span className={indent} style={bold ? { fontWeight: 700 } : undefined}>{v}</span>;
      },
    },
    { title: '本期金额', dataIndex: 'amount', width: 200, align: 'right',
      render: (v: number) => numCell(v) },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker picker="month" value={period} onChange={(v) => v && setPeriod(v)}
          allowClear={false} style={{ width: 160 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch} loading={loading}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={rows.length === 0}>导出 Excel</Button>
      </Space>
      {queried && rows.length > 0 && (
        <ReportHeader title="利润表" bookName={bookName} period={period.format('YYYY-MM')} />
      )}
      {queried && rows.length === 0 && !loading ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          className="acct-table"
          columns={columns}
          dataSource={rows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 500 : undefined }}
          bordered
          rowClassName={(r) => r.level === 0 ? 'acct-total-row' : ''}
        />
      )}
    </>
  );
};

// ===================== 现金流量表 =====================

interface CFlatRow {
  key: string;
  name: string;
  amount: number | null;
  isSection?: boolean;
  isTotal?: boolean;
}

const CashFlowTab: React.FC<{ bookId: number; bookName: string }> = ({ bookId, bookName }) => {
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCashFlowStatement(bookId, period.format('YYYY-MM'));
      if (res.data.code === 200) {
        setData(res.data.data);
        setQueried(true);
      } else {
        message.error(res.data.message || '查询失败');
      }
    } catch {
      message.error('查询现金流量表失败');
    } finally {
      setLoading(false);
    }
  }, [bookId, period]);

  const handleExport = async () => {
    try {
      const res = await exportReport(bookId, 'cashflow', period.format('YYYY-MM'));
      downloadBlob(new Blob([res.data]), `现金流量表_${period.format('YYYY-MM')}.xlsx`);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const buildRows = (): CFlatRow[] => {
    if (!data) return [];
    const rows: CFlatRow[] = [];
    data.sections.forEach((sec, si) => {
      rows.push({ key: `sec-${si}`, name: sec.name, amount: null, isSection: true });
      sec.items.forEach((item, ii) => {
        rows.push({ key: `cf-${si}-${ii}`, name: `  ${item.name}`, amount: item.amount });
      });
    });
    rows.push({ key: 'net-increase', name: '现金及现金等价物净增加额', amount: data.net_increase, isTotal: true });
    rows.push({ key: 'opening-cash', name: '期初现金及现金等价物余额', amount: data.opening_cash, isTotal: true });
    rows.push({ key: 'closing-cash', name: '期末现金及现金等价物余额', amount: data.closing_cash, isTotal: true });
    return rows;
  };

  const columns: ColumnsType<CFlatRow> = [
    { title: '项目', dataIndex: 'name', width: 360,
      render: (v, r) => r.isSection || r.isTotal ? <strong>{v}</strong> : v },
    { title: '金额', dataIndex: 'amount', width: 200, align: 'right',
      render: (v: number | null) => v != null ? numCell(v) : '' },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker picker="month" value={period} onChange={(v) => v && setPeriod(v)}
          allowClear={false} style={{ width: 160 }} />
        <Button type="primary" icon={<SearchOutlined />} onClick={fetch} loading={loading}>查询</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!data}>导出 Excel</Button>
      </Space>
      {queried && data && (
        <ReportHeader title="现金流量表" bookName={bookName} period={period.format('YYYY-MM')} />
      )}
      {queried && !data && !loading ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          className="acct-table"
          columns={columns}
          dataSource={buildRows()}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: isMobile ? 560 : undefined }}
          bordered
          rowClassName={(r) => {
            if (r.isTotal) return 'acct-total-row';
            if (r.isSection) return 'acct-group-row';
            return '';
          }}
        />
      )}
    </>
  );
};

// ===================== 主组件 =====================

const Reports: React.FC = () => {
  const { currentBookId, currentBookName } = useFinanceStore();

  if (!currentBookId) {
    return (
      <Card className="acct-card">
        <Alert type="warning" showIcon message="请先在「账套管理」中选择一个账套" />
      </Card>
    );
  }

  const tabItems = [
    { key: 'trial', label: '科目余额表',
      children: <TrialBalanceTab bookId={currentBookId} bookName={currentBookName} /> },
    { key: 'item', label: '核算项目余额表',
      children: <ItemBalanceTab bookId={currentBookId} bookName={currentBookName} /> },
    { key: 'bs', label: '资产负债表',
      children: <BalanceSheetTab bookId={currentBookId} bookName={currentBookName} /> },
    { key: 'income', label: '利润表',
      children: <IncomeStatementTab bookId={currentBookId} bookName={currentBookName} /> },
    { key: 'cashflow', label: '现金流量表',
      children: <CashFlowTab bookId={currentBookId} bookName={currentBookName} /> },
  ];

  return (
    <Card className="acct-card" title="财务报表" style={{ margin: 0 }}>
      <Tabs items={tabItems} destroyInactiveTabPane />
    </Card>
  );
};

export default Reports;
