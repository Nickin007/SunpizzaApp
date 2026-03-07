import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Input, Descriptions, Space, message } from 'antd';
import { SendOutlined, EyeOutlined } from '@ant-design/icons';
import { warehouseListOrders, warehouseShipOrder, shopOrderDetail } from '../../api/supplyChain';
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

const WarehouseShip: React.FC = () => {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<SCOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [shipVisible, setShipVisible] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<number | null>(null);
  const [shipOrderNo, setShipOrderNo] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [shipLoading, setShipLoading] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<SCOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseListOrders({ page, per_page: pageSize, status: 'approved' });
      const d = res.data.data;
      setOrders(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      message.error('加载待发货订单失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openShipModal = (order: SCOrder) => {
    setShipOrderId(order.id);
    setShipOrderNo(order.order_no);
    setTrackingNo('');
    setShipVisible(true);
  };

  const handleShip = async () => {
    if (!shipOrderId) return;
    setShipLoading(true);
    try {
      await warehouseShipOrder(shipOrderId, trackingNo.trim() || undefined);
      message.success('发货成功');
      setShipVisible(false);
      fetchOrders();
    } catch {
      message.error('发货失败');
    } finally {
      setShipLoading(false);
    }
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

  const expandedRowRender = (record: SCOrder) => {
    const items = record.items ?? [];
    if (!items.length) {
      return <p style={{ margin: 0, color: '#999' }}>展开后加载详情查看明细</p>;
    }
    return (
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '商品', dataIndex: 'product_name', key: 'product_name' },
          { title: '规格', dataIndex: 'spec_info', key: 'spec_info', render: (v: string | null) => v || '-' },
          { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
          { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'center' as const },
          { title: '小计', dataIndex: 'subtotal', key: 'subtotal', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
        ]}
        pagination={false}
        size="small"
      />
    );
  };

  const handleExpand = async (expanded: boolean, record: SCOrder) => {
    if (!expanded || record.items?.length) return;
    try {
      const res = await shopOrderDetail(record.id);
      const detail: SCOrder = res.data.data;
      setOrders((prev) => prev.map((o) => (o.id === record.id ? { ...o, items: detail.items } : o)));
    } catch {
      message.error('加载明细失败');
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
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 120,
      render: (v: string | null) => v || '-',
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
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: SCOrder) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small">
            详情
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => openShipModal(record)}
            size="small"
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            发货
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="仓库发货">
      <Table
        rowKey="id"
        dataSource={orders}
        columns={columns}
        loading={loading}
        scroll={{ x: 800 }}
        expandable={{
          expandedRowRender,
          onExpand: handleExpand,
        }}
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

      {/* 发货弹窗 */}
      <Modal
        title={`发货 - ${shipOrderNo}`}
        open={shipVisible}
        onCancel={() => setShipVisible(false)}
        onOk={handleShip}
        confirmLoading={shipLoading}
        okText="确认发货"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
      >
        <p style={{ marginBottom: 8 }}>物流单号（选填）：</p>
        <Input
          value={trackingNo}
          onChange={(e) => setTrackingNo(e.target.value)}
          placeholder="请输入物流单号，可留空"
          maxLength={50}
        />
      </Modal>

      {/* 订单详情弹窗 */}
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
              <Descriptions.Item label="下单人">{currentOrder.creator_name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentOrder.created_at}</Descriptions.Item>
              {currentOrder.remark && (
                <Descriptions.Item label="备注" span={2}>{currentOrder.remark}</Descriptions.Item>
              )}
            </Descriptions>
            <Table
              rowKey="id"
              dataSource={currentOrder.items ?? []}
              columns={[
                { title: '商品', dataIndex: 'product_name', key: 'product_name' },
                { title: '规格', dataIndex: 'spec_info', key: 'spec_info', render: (v: string | null) => v || '-' },
                { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
                { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'center' as const },
                { title: '小计', dataIndex: 'subtotal', key: 'subtotal', width: 90, render: (v: number) => `¥${v.toFixed(2)}` },
              ]}
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

export default WarehouseShip;
