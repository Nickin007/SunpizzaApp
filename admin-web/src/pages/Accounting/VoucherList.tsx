import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Input, Space, Tag, Modal, message, Typography, Empty, Popconfirm, Descriptions } from 'antd';
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as financeApi from '../../api/finance';
import type { Voucher, VoucherEntry } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

const VoucherList: React.FC = () => {
  const navigate = useNavigate();
  const { currentBookId, currentBookName } = useFinanceStore();
  const user = useAuthStore((s) => s.user);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState(dayjs().format('YYYY-MM'));
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterKeyword, setFilterKeyword] = useState('');

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadVouchers = async () => {
    if (!currentBookId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterPeriod) params.period = filterPeriod;
      if (filterStatus) params.status = filterStatus;
      if (filterKeyword) params.keyword = filterKeyword;

      const res = await financeApi.listVouchers(currentBookId, params);
      if (res.data.code === 200) {
        setVouchers(res.data.data);
      }
    } catch {
      message.error('加载凭证列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [currentBookId]);

  const handleViewDetail = async (record: Voucher) => {
    setDetailLoading(true);
    setDetailVisible(true);
    try {
      const res = await financeApi.getVoucher(record.id);
      if (res.data.code === 200) {
        setDetailVoucher(res.data.data);
      }
    } catch {
      message.error('加载凭证详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (record: Voucher) => {
    try {
      const res = await financeApi.approveVoucher(record.id, user?.real_name || user?.username || '');
      if (res.data.code === 200) {
        message.success('审核通过');
        loadVouchers();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '审核失败');
    }
  };

  const handleUnapprove = async (record: Voucher) => {
    try {
      const res = await financeApi.unapproveVoucher(record.id);
      if (res.data.code === 200) {
        message.success('反审核成功');
        loadVouchers();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '反审核失败');
    }
  };

  const handleDelete = async (record: Voucher) => {
    try {
      const res = await financeApi.deleteVoucher(record.id);
      if (res.data.code === 200) {
        message.success('删除成功');
        loadVouchers();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<Voucher> = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 110,
    },
    {
      title: '凭证字号',
      width: 110,
      render: (_, record) => (
        <Text>{record.voucher_word}-{String(record.voucher_no).padStart(4, '0')}</Text>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'first_summary',
      ellipsis: true,
    },
    {
      title: '借方合计',
      dataIndex: 'debit_total',
      width: 120,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#1890ff' }}>{v?.toFixed(2)}</Text>,
    },
    {
      title: '贷方合计',
      dataIndex: 'credit_total',
      width: 120,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{v?.toFixed(2)}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) =>
        status === 'approved' ? (
          <Tag color="green">已审核</Tag>
        ) : (
          <Tag color="orange">草稿</Tag>
        ),
    },
    {
      title: '制单',
      dataIndex: 'created_by',
      width: 80,
    },
    {
      title: '审核',
      dataIndex: 'approved_by',
      width: 80,
      render: (v: string | null) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          {record.status === 'draft' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />}
                onClick={() => navigate(`/accounting/voucher/edit/${record.id}`)}
              >
                编辑
              </Button>
              <Popconfirm title="确定审核此凭证？" onConfirm={() => handleApprove(record)} okText="审核" cancelText="取消">
                <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}>
                  审核
                </Button>
              </Popconfirm>
              <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record)} okText="确定" cancelText="取消">
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'approved' && (
            <Popconfirm title="确定反审核？" onConfirm={() => handleUnapprove(record)} okText="确定" cancelText="取消">
              <Button type="link" size="small" icon={<CloseCircleOutlined />} style={{ color: '#fa8c16' }}>
                反审核
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 详情弹窗中的分录表列
  const entryColumns: ColumnsType<VoucherEntry> = [
    { title: '#', dataIndex: 'line_no', width: 40 },
    { title: '摘要', dataIndex: 'summary', ellipsis: true },
    {
      title: '科目',
      dataIndex: 'subject_full_name',
      width: 200,
    },
    {
      title: '借方',
      dataIndex: 'debit_amount',
      width: 120,
      align: 'right',
      render: (v: number) => v > 0 ? <Text style={{ color: '#1890ff' }}>{v.toFixed(2)}</Text> : '',
    },
    {
      title: '贷方',
      dataIndex: 'credit_amount',
      width: 120,
      align: 'right',
      render: (v: number) => v > 0 ? <Text style={{ color: '#52c41a' }}>{v.toFixed(2)}</Text> : '',
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
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <SearchOutlined style={{ marginRight: 8 }} />
            凭证查询 - {currentBookName}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/accounting/voucher/new')}>
            新建凭证
          </Button>
        </div>

        {/* 筛选栏 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="会计期间 (YYYY-MM)"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            style={{ width: 160 }}
            size="small"
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 120 }}
            size="small"
            options={[
              { value: '', label: '全部状态' },
              { value: 'draft', label: '草稿' },
              { value: 'approved', label: '已审核' },
            ]}
          />
          <Input
            placeholder="搜索摘要/科目"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            style={{ width: 200 }}
            size="small"
          />
          <Button type="primary" size="small" icon={<SearchOutlined />} onClick={loadVouchers}>
            查询
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={vouchers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 张凭证` }}
          size="small"
        />
      </Card>

      {/* 凭证详情弹窗 */}
      <Modal
        title={detailVoucher ? `${detailVoucher.voucher_word}-${String(detailVoucher.voucher_no).padStart(4, '0')} 凭证详情` : '凭证详情'}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {detailVoucher && (
          <div>
            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="凭证字号">{detailVoucher.voucher_word}-{String(detailVoucher.voucher_no).padStart(4, '0')}</Descriptions.Item>
              <Descriptions.Item label="日期">{detailVoucher.date}</Descriptions.Item>
              <Descriptions.Item label="期间">{detailVoucher.period}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {detailVoucher.status === 'approved' ? <Tag color="green">已审核</Tag> : <Tag color="orange">草稿</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="制单">{detailVoucher.created_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核">{detailVoucher.approved_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="附件">{detailVoucher.attachment_count} 张</Descriptions.Item>
            </Descriptions>

            <Table
              columns={entryColumns}
              dataSource={detailVoucher.entries || []}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              loading={detailLoading}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right"><Text strong>合计</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong style={{ color: '#1890ff' }}>{detailVoucher.debit_total?.toFixed(2)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong style={{ color: '#52c41a' }}>{detailVoucher.credit_total?.toFixed(2)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VoucherList;
