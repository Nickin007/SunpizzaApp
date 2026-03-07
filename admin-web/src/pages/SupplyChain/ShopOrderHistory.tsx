import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Descriptions, Space, Select, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { shopListOrders, shopOrderDetail } from '../../api/supplyChain';
import type { SCOrder, SCOrderItemType } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending:   { color: 'processing', label: '待审核' },
  approved:  { color: 'blue',       label: '已审核' },
  rejected:  { color: 'red',        label: '已驳回' },
  shipping:  { color: 'orange',     label: '配送中' },
  shipped:   { color: 'green',      label: '已发货' },
  completed: { color: 'default',    label: '已完成' },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已审核' },
  { value: 'rejected', label: '已驳回' },
  { value: 'shipping', label: '配送中' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
];

const ShopOrderHistory: React.FC = () => {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<SCOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<SCOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, per_page: pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await shopListOrders(params);
      const d = res.data.data;
      setOrders(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const showDetail = async (order: SCOrder) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await shopOrderDetail(order.id);
      setCurrentOrder(res.data.data);
    } catch {
      message.error('加载订单详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const m = STATUS_MAP[s] ?? { color: 'default', label: s };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 100,
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '品项数',
      dataIndex: 'item_count',
      key: 'item_count',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: SCOrder) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => showDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  const itemColumns = [
    { title: '商品', dataIndex: 'product_name', key: 'product_name' },
    { title: '规格', dataIndex: 'spec_info', key: 'spec_info', render: (v: string | null) => v || '-' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'center' as const },
    { title: '小计', dataIndex: 'subtotal', key: 'subtotal', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
  ];

  return (
    <Card
      title="订货历史"
      extra={
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          style={{ width: isMobile ? 120 : 150 }}
        />
      }
    >
      <Table
        rowKey="id"
        dataSource={orders}
        columns={columns}
        loading={loading}
        scroll={{ x: 700 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          size: isMobile ? 'small' : 'default',
        }}
        size={isMobile ? 'small' : 'middle'}
      />

      <Modal
        title={currentOrder ? `订单详情 - ${currentOrder.order_no}` : '订单详情'}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setCurrentOrder(null); }}
        footer={null}
        width={isMobile ? '95vw' : 700}
        loading={detailLoading}
      >
        {currentOrder && (
          <>
            <Descriptions column={isMobile ? 1 : 2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="订单编号">{currentOrder.order_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentOrder.status]?.color}>{STATUS_MAP[currentOrder.status]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="门店">{currentOrder.store_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="仓库">{currentOrder.warehouse_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{currentOrder.total_amount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentOrder.created_at}</Descriptions.Item>
              {currentOrder.remark && (
                <Descriptions.Item label="备注" span={2}>{currentOrder.remark}</Descriptions.Item>
              )}
              {currentOrder.reject_reason && (
                <Descriptions.Item label="驳回原因" span={2}>
                  <span style={{ color: '#f5222d' }}>{currentOrder.reject_reason}</span>
                </Descriptions.Item>
              )}
              {currentOrder.tracking_no && (
                <Descriptions.Item label="物流单号" span={2}>{currentOrder.tracking_no}</Descriptions.Item>
              )}
            </Descriptions>
            <Table
              rowKey="id"
              dataSource={currentOrder.items ?? []}
              columns={itemColumns}
              pagination={false}
              size="small"
              scroll={{ x: 450 }}
            />
          </>
        )}
      </Modal>
    </Card>
  );
};

export default ShopOrderHistory;
