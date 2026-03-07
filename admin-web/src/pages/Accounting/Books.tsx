import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, DatePicker, Space, Tag, message,
  Popconfirm, Typography, Steps, InputNumber, Spin, Alert,
} from 'antd';
import {
  PlusOutlined, BookOutlined, CheckCircleOutlined, DeleteOutlined,
  EditOutlined, CheckCircleFilled, WarningFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import * as financeApi from '../../api/finance';
import { listSubjects, setInitialBalances } from '../../api/finance';
import type { AccountBook, AccountSubject } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import './accounting.css';

const { Text, Title } = Typography;

interface BalanceRow {
  key: string;
  subjectId: number;
  code: string;
  name: string;
  debit: number;
  credit: number;
  isGroup: boolean;
  level: number;
}

const Books: React.FC = () => {
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // 编辑 Modal 状态（仅用于编辑已有账套）
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<AccountBook | null>(null);
  const [editForm] = Form.useForm();

  // 新建向导状态
  const [wizardVisible, setWizardVisible] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [createForm] = Form.useForm();
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);

  // 期初余额状态
  const [subjects, setSubjects] = useState<AccountSubject[]>([]);
  const [balanceMap, setBalanceMap] = useState<Record<number, { debit: number; credit: number }>>({});
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { currentBookId, setCurrentBook } = useFinanceStore();

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await financeApi.listBooks();
      if (res.data.code === 200) {
        setBooks(res.data.data);
      }
    } catch {
      message.error('加载账套列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  // ========== 编辑已有账套 ==========
  const handleEdit = (record: AccountBook) => {
    setEditingBook(record);
    editForm.setFieldsValue({
      name: record.name,
      currency: record.currency,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (!editingBook) return;
      const res = await financeApi.updateBook(editingBook.id, {
        name: values.name,
        currency: values.currency,
      });
      if (res.data.code === 200) {
        message.success('更新成功');
        if (currentBookId === editingBook.id) {
          setCurrentBook(editingBook.id, values.name);
        }
      }
      setEditModalVisible(false);
      loadBooks();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  // ========== 删除 ==========
  const handleDelete = async (id: number) => {
    try {
      const res = await financeApi.deleteBook(id);
      if (res.data.code === 200) {
        message.success('删除成功');
        if (currentBookId === id) setCurrentBook(null, '');
        loadBooks();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleSwitch = (record: AccountBook) => {
    setCurrentBook(record.id, record.name);
    message.success(`已切换到账套「${record.name}」`);
  };

  // ========== 新建账套向导 ==========
  const handleCreateOpen = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ currency: 'CNY' });
    setWizardStep(0);
    setCreatedBookId(null);
    setSubjects([]);
    setBalanceMap({});
    setWizardVisible(true);
  };

  const handleWizardNext = async () => {
    try {
      const values = await createForm.validateFields();
      const payload = {
        name: values.name,
        start_date: values.start_date.format('YYYY-MM-DD'),
        currency: values.currency || 'CNY',
      };

      setCreatingBook(true);
      const res = await financeApi.createBook(payload);
      if (res.data.code === 200) {
        const bookId = res.data.data.id;
        setCreatedBookId(bookId);
        setWizardStep(1);
        await loadSubjects(bookId);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    } finally {
      setCreatingBook(false);
    }
  };

  const loadSubjects = async (bookId: number) => {
    setBalanceLoading(true);
    try {
      const subRes = await listSubjects(bookId);
      const subjectList: AccountSubject[] = subRes.data.data ?? [];
      setSubjects(subjectList);
      setBalanceMap({});
    } catch {
      message.error('加载科目列表失败');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleWizardFinish = async () => {
    if (!createdBookId) return;

    const leafRows = balanceTableData.filter((r) => !r.isGroup);
    const balances = leafRows
      .filter((r) => {
        const bal = balanceMap[r.subjectId];
        return bal && (bal.debit !== 0 || bal.credit !== 0);
      })
      .map((r) => ({
        subject_id: r.subjectId,
        item_id: null,
        debit_amount: balanceMap[r.subjectId]?.debit ?? 0,
        credit_amount: balanceMap[r.subjectId]?.credit ?? 0,
      }));

    if (balances.length > 0 && !isBalanced) {
      message.warning('借贷不平衡，请调整后再完成创建');
      return;
    }

    setSaving(true);
    try {
      if (balances.length > 0) {
        await setInitialBalances(createdBookId, balances);
      }
      message.success('账套创建成功');
      setWizardVisible(false);
      loadBooks();
    } catch {
      message.error('保存期初余额失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleWizardCancel = async () => {
    if (wizardStep === 1 && createdBookId) {
      Modal.confirm({
        title: '确定取消？',
        content: '已创建的账套将被删除。',
        okText: '确定取消',
        cancelText: '继续设置',
        onOk: async () => {
          try {
            await financeApi.deleteBook(createdBookId);
          } catch { /* ignore */ }
          setWizardVisible(false);
          setCreatedBookId(null);
        },
      });
    } else {
      setWizardVisible(false);
    }
  };

  // ========== 期初余额表格逻辑 ==========
  const parentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const s of subjects) {
      if (s.parent_id) ids.add(s.parent_id);
    }
    return ids;
  }, [subjects]);

  const balanceTableData = useMemo(() => {
    const leafSubjects = subjects.filter((s) => !parentIds.has(s.id) && s.is_enabled);
    const topGroups = subjects.filter(
      (s) => s.level === 1 && parentIds.has(s.id) && s.is_enabled
    );

    const rows: BalanceRow[] = [];

    for (const group of topGroups) {
      const children = leafSubjects.filter((s) => s.code.startsWith(group.code));
      if (children.length === 0) continue;

      rows.push({
        key: `g-${group.id}`,
        subjectId: group.id,
        code: group.code,
        name: group.name,
        debit: 0,
        credit: 0,
        isGroup: true,
        level: group.level,
      });

      for (const child of children.sort((a, b) => a.code.localeCompare(b.code))) {
        const bal = balanceMap[child.id];
        rows.push({
          key: `s-${child.id}`,
          subjectId: child.id,
          code: child.code,
          name: child.name,
          debit: bal?.debit ?? 0,
          credit: bal?.credit ?? 0,
          isGroup: false,
          level: child.level,
        });
      }
    }

    const ungrouped = leafSubjects.filter((s) => s.level === 1);
    for (const s of ungrouped.sort((a, b) => a.code.localeCompare(b.code))) {
      const bal = balanceMap[s.id];
      rows.push({
        key: `s-${s.id}`,
        subjectId: s.id,
        code: s.code,
        name: s.name,
        debit: bal?.debit ?? 0,
        credit: bal?.credit ?? 0,
        isGroup: false,
        level: s.level,
      });
    }

    return rows;
  }, [subjects, parentIds, balanceMap]);

  const { totalDebit, totalCredit } = useMemo(() => {
    let d = 0, c = 0;
    for (const r of balanceTableData) {
      if (!r.isGroup) {
        d += r.debit;
        c += r.credit;
      }
    }
    return { totalDebit: d, totalCredit: c };
  }, [balanceTableData]);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005;

  const handleValueChange = useCallback((subjectId: number, field: 'debit' | 'credit', value: number | null) => {
    setBalanceMap((prev) => {
      const old = prev[subjectId] ?? { debit: 0, credit: 0 };
      return { ...prev, [subjectId]: { ...old, [field]: value ?? 0 } };
    });
  }, []);

  const fmt = (v: number) =>
    v === 0 ? '' : v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const balanceColumns: ColumnsType<BalanceRow> = [
    {
      title: '科目编码',
      dataIndex: 'code',
      key: 'code',
      width: isMobile ? 90 : 140,
      render: (code: string, row) =>
        row.isGroup ? <Text strong>{code}</Text> : <span style={{ paddingLeft: (row.level - 1) * 16 }}>{code}</span>,
    },
    {
      title: '科目名称',
      dataIndex: 'name',
      key: 'name',
      width: isMobile ? 100 : 200,
      render: (name: string, row) =>
        row.isGroup ? <Text strong>{name}</Text> : <span style={{ paddingLeft: (row.level - 1) * 16 }}>{name}</span>,
    },
    {
      title: '借方期初',
      dataIndex: 'debit',
      key: 'debit',
      width: isMobile ? 120 : 180,
      className: 'acct-num',
      render: (_: number, row) => {
        if (row.isGroup) return null;
        const val = balanceMap[row.subjectId]?.debit ?? 0;
        return (
          <InputNumber
            className="acct-balance-input"
            value={val || undefined}
            placeholder="0.00"
            min={0}
            precision={2}
            controls={false}
            style={{ width: '100%' }}
            onChange={(v) => handleValueChange(row.subjectId, 'debit', v)}
          />
        );
      },
    },
    {
      title: '贷方期初',
      dataIndex: 'credit',
      key: 'credit',
      width: isMobile ? 120 : 180,
      className: 'acct-num',
      render: (_: number, row) => {
        if (row.isGroup) return null;
        const val = balanceMap[row.subjectId]?.credit ?? 0;
        return (
          <InputNumber
            className="acct-balance-input"
            value={val || undefined}
            placeholder="0.00"
            min={0}
            precision={2}
            controls={false}
            style={{ width: '100%' }}
            onChange={(v) => handleValueChange(row.subjectId, 'credit', v)}
          />
        );
      },
    },
  ];

  // ========== 账套列表表格 ==========
  const columns: ColumnsType<AccountBook> = [
    {
      title: '账套名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AccountBook) => (
        <Space>
          <Text strong>{name}</Text>
          {currentBookId === record.id && <Tag color="green">当前使用</Tag>}
        </Space>
      ),
    },
    { title: '启用日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '本位币', dataIndex: 'currency', key: 'currency', width: 100 },
    {
      title: '最后结账期间',
      dataIndex: 'last_closed_period',
      key: 'last_closed_period',
      render: (v: string | null) => v || <Text type="secondary">未结账</Text>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: AccountBook) => (
        <Space>
          {currentBookId !== record.id ? (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleSwitch(record)}>
              切换使用
            </Button>
          ) : (
            <Tag color="green">使用中</Tag>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此账套？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const hasAnyBalance = totalDebit > 0 || totalCredit > 0;

  return (
    <div>
      <Card style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: 8 }} />
            账套管理
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOpen}>
            新建账套
          </Button>
        </div>

        {currentBookId && (
          <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <Text>当前账套：<Text strong>{useFinanceStore.getState().currentBookName}</Text></Text>
          </div>
        )}

        <Table columns={columns} dataSource={books} rowKey="id" loading={loading} pagination={false} scroll={{ x: 600 }} />
      </Card>

      {/* 编辑账套 Modal */}
      <Modal
        title="编辑账套"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="账套名称" rules={[{ required: true, message: '请输入账套名称' }]}>
            <Input placeholder="如：圣比萨2026年账套" />
          </Form.Item>
          <Form.Item name="currency" label="本位币">
            <Input placeholder="CNY" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建账套向导 Modal */}
      <Modal
        title="新建账套"
        open={wizardVisible}
        onCancel={handleWizardCancel}
        width={isMobile ? '95vw' : 900}
        footer={null}
        destroyOnClose
        maskClosable={false}
      >
        <Steps
          current={wizardStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: '基本信息' },
            { title: '设置期初余额' },
          ]}
        />

        {wizardStep === 0 && (
          <div>
            <Form form={createForm} layout="vertical">
              <Form.Item name="name" label="账套名称" rules={[{ required: true, message: '请输入账套名称' }]}>
                <Input placeholder="如：圣比萨2026年账套" />
              </Form.Item>
              <Form.Item name="start_date" label="启用日期" rules={[{ required: true, message: '请选择启用日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="currency" label="本位币">
                <Input placeholder="CNY" />
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={() => setWizardVisible(false)}>取消</Button>
                <Button type="primary" loading={creatingBook} onClick={handleWizardNext}>
                  下一步
                </Button>
              </Space>
            </div>
          </div>
        )}

        {wizardStep === 1 && (
          <div>
            <Alert
              type="info"
              showIcon
              message="设置期初余额（可选）"
              description="如果您是从其他系统迁移过来，请在此设置各科目的期初余额。如无需设置可直接点击「完成创建」。"
              style={{ marginBottom: 16 }}
            />

            <Spin spinning={balanceLoading}>
              <Table<BalanceRow>
                className="acct-table"
                columns={balanceColumns}
                dataSource={balanceTableData}
                rowKey="key"
                pagination={false}
                size="small"
                scroll={{ x: isMobile ? 440 : undefined, y: 400 }}
                rowClassName={(row) => (row.isGroup ? 'acct-group-row' : '')}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="acct-total-row">
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>合计</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} className="acct-num">
                        <Text strong>{fmt(totalDebit)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} className="acct-num">
                        <Text strong>{fmt(totalCredit)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />

              {hasAnyBalance && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: isBalanced ? '#f6ffed' : '#fff2f0',
                    border: `1px solid ${isBalanced ? '#b7eb8f' : '#ffccc7'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Space>
                    {isBalanced ? (
                      <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
                    ) : (
                      <WarningFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
                    )}
                    <Text strong>{isBalanced ? '试算平衡' : '借贷不平衡'}</Text>
                  </Space>
                  <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                    <Text>
                      借方合计：<Text strong className="acct-num">{fmt(totalDebit) || '0.00'}</Text>
                    </Text>
                    <Text>
                      贷方合计：<Text strong className="acct-num">{fmt(totalCredit) || '0.00'}</Text>
                    </Text>
                    {!isBalanced && (
                      <Text type="danger">
                        差额：<Text strong className="acct-num" type="danger">{fmt(Math.abs(totalDebit - totalCredit))}</Text>
                      </Text>
                    )}
                  </Space>
                </div>
              )}
            </Spin>

            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Space>
                <Button onClick={handleWizardCancel}>取消</Button>
                <Button
                  type="primary"
                  loading={saving}
                  disabled={hasAnyBalance && !isBalanced}
                  onClick={handleWizardFinish}
                >
                  完成创建
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Books;
