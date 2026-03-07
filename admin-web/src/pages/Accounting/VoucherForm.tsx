import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, DatePicker, Input, InputNumber, Select, TreeSelect, Space, Table, message, Typography, Tag, Empty, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as financeApi from '../../api/finance';
import type { AccountSubject, VoucherEntry, AccountItemCategory } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import './accounting.css';

const { Title, Text } = Typography;

interface EntryItemSelection {
  category_id: number;
  item_id: number;
}

interface EntryRow {
  key: string;
  summary: string;
  subject_id: number | null;
  debit_amount: number;
  credit_amount: number;
  items: EntryItemSelection[];
}

const VoucherForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentBookId, currentBookName } = useFinanceStore();
  const user = useAuthStore((s) => s.user);

  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<AccountSubject[]>([]);
  const [categories, setCategories] = useState<AccountItemCategory[]>([]);

  // 凭证头字段
  const [voucherWord, setVoucherWord] = useState('记');
  const [voucherNo, setVoucherNo] = useState<number>(0);
  const [voucherDate, setVoucherDate] = useState<dayjs.Dayjs>(dayjs());
  const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [entries, setEntries] = useState<EntryRow[]>([
    { key: '1', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0, items: [] },
    { key: '2', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0, items: [] },
  ]);

  useEffect(() => {
    if (!currentBookId) return;
    financeApi.listSubjects(currentBookId).then((res) => {
      if (res.data.code === 200) {
        setSubjects(res.data.data.filter((s) => s.is_enabled));
      }
    });
    financeApi.listItemCategories(currentBookId).then((res) => {
      if (res.data.code === 200) setCategories(res.data.data);
    });
  }, [currentBookId]);

  const subjectMap = useMemo(() => {
    const m = new Map<number, AccountSubject>();
    subjects.forEach(s => m.set(s.id, s));
    return m;
  }, [subjects]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    financeApi.getVoucher(parseInt(id)).then((res) => {
      if (res.data.code === 200) {
        const v = res.data.data;
        setVoucherWord(v.voucher_word);
        setVoucherNo(v.voucher_no);
        setVoucherDate(dayjs(v.date));
        setPeriod(v.period);
        setAttachmentCount(v.attachment_count);
        if (v.entries) {
          setEntries(v.entries.map((e: VoucherEntry, i: number) => ({
            key: String(i + 1),
            summary: e.summary,
            subject_id: e.subject_id,
            debit_amount: e.debit_amount,
            credit_amount: e.credit_amount,
            items: (e.items || []).map(it => ({ category_id: it.category_id, item_id: it.item_id })),
          })));
        }
      }
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  // 获取下一个凭证号（新建模式）
  useEffect(() => {
    if (isEdit || !currentBookId || !period) return;
    financeApi.getNextVoucherNo(currentBookId, period, voucherWord).then((res) => {
      if (res.data.code === 200) {
        setVoucherNo(res.data.data.next_no);
      }
    });
  }, [currentBookId, period, voucherWord, isEdit]);

  // 日期变化自动更新期间
  const handleDateChange = (d: dayjs.Dayjs | null) => {
    if (d) {
      setVoucherDate(d);
      setPeriod(d.format('YYYY-MM'));
    }
  };

  // 构建科目 TreeSelect 数据
  const subjectTreeData = useMemo(() => {
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const s of subjects) {
      map.set(s.id, {
        value: s.id,
        title: `${s.code} ${s.name}`,
        children: [],
      });
    }
    for (const s of subjects) {
      const node = map.get(s.id);
      if (s.parent_id && map.has(s.parent_id)) {
        map.get(s.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }, [subjects]);

  // 更新分录行
  const updateEntry = useCallback((key: string, field: keyof EntryRow, value: unknown) => {
    setEntries((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  }, []);

  const addRow = () => {
    const nextKey = String(entries.length + 1 + Math.random());
    setEntries((prev) => [...prev, { key: nextKey, summary: '', subject_id: null, debit_amount: 0, credit_amount: 0, items: [] }]);
  };

  const updateEntryItem = useCallback((key: string, categoryId: number, itemId: number) => {
    setEntries(prev => prev.map(row => {
      if (row.key !== key) return row;
      const items = row.items.filter(i => i.category_id !== categoryId);
      if (itemId) items.push({ category_id: categoryId, item_id: itemId });
      return { ...row, items };
    }));
  }, []);

  // 删除行
  const removeRow = (key: string) => {
    if (entries.length <= 2) {
      message.warning('至少保留两条分录');
      return;
    }
    setEntries((prev) => prev.filter((r) => r.key !== key));
  };

  // 合计
  const totalDebit = entries.reduce((s, e) => s + (e.debit_amount || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit_amount || 0), 0);
  const diff = Math.round((totalDebit - totalCredit) * 100) / 100;
  const isBalanced = diff === 0 && totalDebit > 0;

  // 保存
  const handleSave = async () => {
    if (!currentBookId) return;
    if (!isBalanced) {
      message.error('借贷不平衡，无法保存');
      return;
    }
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].subject_id) {
        message.error(`第 ${i + 1} 行未选择科目`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        voucher_word: voucherWord,
        date: voucherDate.format('YYYY-MM-DD'),
        period,
        attachment_count: attachmentCount,
        created_by: user?.real_name || user?.username || '',
        entries: entries.map((e) => ({
          summary: e.summary,
          subject_id: e.subject_id!,
          debit_amount: e.debit_amount || 0,
          credit_amount: e.credit_amount || 0,
          items: e.items.filter(it => it.item_id),
        })),
      };

      let res;
      if (isEdit) {
        res = await financeApi.updateVoucher(parseInt(id!), payload);
      } else {
        res = await financeApi.createVoucher(currentBookId, payload);
      }

      if (res.data.code === 200) {
        message.success(res.data.message || '保存成功');
        if (!isEdit) {
          // 新建后清空，准备下一张
          setEntries([
            { key: '1', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0, items: [] },
            { key: '2', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0, items: [] },
          ]);
          // 刷新凭证号
          financeApi.getNextVoucherNo(currentBookId, period, voucherWord).then((r) => {
            if (r.data.code === 200) setVoucherNo(r.data.data.next_no);
          });
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<EntryRow> = [
    {
      title: '序号',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      width: 200,
      render: (val: string, record) => (
        <Input
          value={val}
          onChange={(e) => updateEntry(record.key, 'summary', e.target.value)}
          placeholder="摘要"
          size="small"
        />
      ),
    },
    {
      title: '会计科目',
      dataIndex: 'subject_id',
      width: 260,
      render: (val: number | null, record) => (
        <TreeSelect
          value={val}
          onChange={(v) => {
            updateEntry(record.key, 'subject_id', v);
            updateEntry(record.key, 'items', []);
          }}
          treeData={subjectTreeData}
          placeholder="选择科目"
          showSearch
          treeNodeFilterProp="title"
          style={{ width: '100%' }}
          size="small"
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        />
      ),
    },
    {
      title: '核算项目',
      width: 200,
      render: (_, record) => {
        if (!record.subject_id) return null;
        const subj = subjectMap.get(record.subject_id);
        if (!subj || !subj.linked_category_ids || subj.linked_category_ids.length === 0) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {subj.linked_category_ids.map(cid => {
              const cat = categories.find(c => c.id === cid);
              if (!cat) return null;
              const selected = record.items.find(i => i.category_id === cid);
              return (
                <Select
                  key={cid}
                  value={selected?.item_id}
                  onChange={(v) => updateEntryItem(record.key, cid, v)}
                  placeholder={cat.name}
                  size="small"
                  style={{ width: '100%' }}
                  allowClear
                  options={(cat.items || []).filter(it => it.is_enabled).map(it => ({ value: it.id, label: `${it.code} ${it.name}` }))}
                />
              );
            })}
          </Space>
        );
      },
    },
    {
      title: '借方金额',
      dataIndex: 'debit_amount',
      width: 150,
      render: (val: number, record) => (
        <InputNumber
          value={val || undefined}
          onChange={(v) => {
            updateEntry(record.key, 'debit_amount', v || 0);
            if (v) updateEntry(record.key, 'credit_amount', 0);
          }}
          placeholder="0.00"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: '贷方金额',
      dataIndex: 'credit_amount',
      width: 150,
      render: (val: number, record) => (
        <InputNumber
          value={val || undefined}
          onChange={(v) => {
            updateEntry(record.key, 'credit_amount', v || 0);
            if (v) updateEntry(record.key, 'debit_amount', 0);
          }}
          placeholder="0.00"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_, record) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
      ),
    },
  ];

  if (!currentBookId) {
    return (
      <Card>
        <Empty description="请先在「账套管理」中创建并选择一个账套" />
      </Card>
    );
  }

  return (
    <div>
      <Card loading={loading}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            {isEdit && (
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accounting/vouchers')}>返回</Button>
            )}
            <Title level={4} style={{ margin: 0 }}>
              {isEdit ? '编辑凭证' : '凭证录入'} - {currentBookName}
            </Title>
          </Space>
        </div>

        <div className="acct-voucher-header">
          <h2>记 账 凭 证</h2>
          <div className="meta-row">
            <span>{currentBookName}</span>
            <span>日期：{voucherDate.format('YYYY年MM月DD日')}</span>
            <span>{voucherWord}字第 {String(voucherNo).padStart(4, '0')} 号</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: '#fafafa' }}>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>凭证字</Text>
            <Select value={voucherWord} onChange={setVoucherWord} style={{ width: 80 }} size="small"
              options={[
                { value: '记', label: '记' },
                { value: '收', label: '收' },
                { value: '付', label: '付' },
                { value: '转', label: '转' },
              ]}
            />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>凭证号</Text>
            <Tag color="blue" style={{ fontSize: 14, padding: '2px 12px' }}>{String(voucherNo).padStart(4, '0')}</Tag>
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>日期</Text>
            <DatePicker value={voucherDate} onChange={handleDateChange} size="small" />
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>会计期间</Text>
            <Tag>{period}</Tag>
          </div>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>附件张数</Text>
            <InputNumber value={attachmentCount} onChange={(v) => setAttachmentCount(v || 0)} min={0} size="small" style={{ width: 80 }} />
          </div>
        </div>

        <Table
          className="acct-table"
          columns={columns}
          dataSource={entries}
          rowKey="key"
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 800 }}
          footer={() => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} size="small">添加分录行</Button>
              <Space size="large">
                <Text>借方合计：<Text strong style={{ color: '#1890ff', fontSize: 16 }}>{totalDebit.toFixed(2)}</Text></Text>
                <Text>贷方合计：<Text strong style={{ color: '#52c41a', fontSize: 16 }}>{totalCredit.toFixed(2)}</Text></Text>
                {diff !== 0 && (
                  <Text type="danger" strong>差额：{diff.toFixed(2)}</Text>
                )}
                {isBalanced && <Tag color="success">借贷平衡 ✓</Tag>}
              </Space>
            </div>
          )}
        />

        {!isBalanced && totalDebit > 0 && (
          <Alert message={`借贷不平衡，差额 ${diff.toFixed(2)} 元，无法保存`} type="error" showIcon style={{ marginTop: 12 }} />
        )}

        {/* 操作按钮 */}
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => navigate('/accounting/vouchers')}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!isBalanced}>
              保存凭证
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default VoucherForm;
