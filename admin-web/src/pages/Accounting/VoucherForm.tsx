import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, DatePicker, Input, InputNumber, Select, TreeSelect, Space, Table, message, Typography, Tag, Empty, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as financeApi from '../../api/finance';
import type { AccountSubject, VoucherEntry } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

interface EntryRow {
  key: string;
  summary: string;
  subject_id: number | null;
  debit_amount: number;
  credit_amount: number;
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

  // 凭证头字段
  const [voucherWord, setVoucherWord] = useState('记');
  const [voucherNo, setVoucherNo] = useState<number>(0);
  const [voucherDate, setVoucherDate] = useState<dayjs.Dayjs>(dayjs());
  const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));
  const [attachmentCount, setAttachmentCount] = useState(0);

  // 分录行
  const [entries, setEntries] = useState<EntryRow[]>([
    { key: '1', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0 },
    { key: '2', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0 },
  ]);

  // 加载科目树
  useEffect(() => {
    if (!currentBookId) return;
    financeApi.listSubjects(currentBookId).then((res) => {
      if (res.data.code === 200) {
        setSubjects(res.data.data.filter((s) => s.is_enabled));
      }
    });
  }, [currentBookId]);

  // 加载已有凭证（编辑模式）
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

  // 添加行
  const addRow = () => {
    const nextKey = String(entries.length + 1 + Math.random());
    setEntries((prev) => [...prev, { key: nextKey, summary: '', subject_id: null, debit_amount: 0, credit_amount: 0 }]);
  };

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
            { key: '1', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0 },
            { key: '2', summary: '', subject_id: null, debit_amount: 0, credit_amount: 0 },
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
          onChange={(v) => updateEntry(record.key, 'subject_id', v)}
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

        {/* 凭证头 */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
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

        {/* 分录表 */}
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="key"
          pagination={false}
          size="small"
          bordered
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
