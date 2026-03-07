import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, InputNumber, Select, Space, Tag, Input, message, Tabs, Descriptions } from 'antd';
import { PlusOutlined, WarningOutlined, HistoryOutlined } from '@ant-design/icons';
import { listInventory, adjustInventory, listInventoryLogs, listWarehouses, listProducts } from '../../api/supplyChain';
import type { InventoryItem, InventoryLogItem, SCWarehouse, Product } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const InventoryManage: React.FC = () => {
  const isMobile = useIsMobile();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLogItem[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [warehouses, setWarehouses] = useState<SCWarehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [form] = Form.useForm();

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await listWarehouses();
      setWarehouses(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await listProducts({ per_page: 500 });
      setProducts(res.data.data?.items || []);
    } catch { /* ignore */ }
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listInventory({
        warehouse_id: warehouseFilter,
        low_stock: lowStockOnly ? 'true' : undefined,
      });
      setInventory(res.data.data || []);
    } catch {
      message.error('获取库存失败');
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, lowStockOnly]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLogLoading(true);
    try {
      const res = await listInventoryLogs({
        page,
        per_page: 20,
        warehouse_id: warehouseFilter,
      });
      const data = res.data.data;
      setLogs(data?.items || []);
      setLogTotal(data?.total || 0);
      setLogPage(page);
    } catch {
      message.error('获取变动记录失败');
    } finally {
      setLogLoading(false);
    }
  }, [warehouseFilter]);

  useEffect(() => { fetchWarehouses(); fetchProducts(); }, [fetchWarehouses, fetchProducts]);
  useEffect(() => {
    if (activeTab === 'inventory') fetchInventory();
    else fetchLogs(1);
  }, [activeTab, fetchInventory, fetchLogs]);

  const handleAdjust = async (values: any) => {
    try {
      await adjustInventory({
        warehouse_id: values.warehouse_id,
        product_id: values.product_id,
        product_spec_id: values.product_spec_id || undefined,
        change_qty: values.change_qty,
        reason: values.reason,
      });
      message.success('库存调整成功');
      setAdjustModal(false);
      form.resetFields();
      fetchInventory();
    } catch {
      message.error('调整失败');
    }
  };

  const logTypeMap: Record<string, { text: string; color: string }> = {
    in: { text: '入库', color: 'green' },
    out: { text: '出库', color: 'red' },
    adjust: { text: '调整', color: 'blue' },
    order_out: { text: '订单出库', color: 'orange' },
  };

  const invColumns = [
    { title: '仓库', dataIndex: 'warehouse_name', key: 'warehouse_name', width: 120 },
    { title: '货品', dataIndex: 'product_name', key: 'product_name', width: 150 },
    { title: '规格', dataIndex: 'spec_info', key: 'spec_info', width: 120, render: (v: string | null) => v || '-' },
    {
      title: '当前库存', dataIndex: 'quantity', key: 'quantity', width: 100,
      render: (v: number, r: InventoryItem) => (
        <span style={{ color: r.is_low ? '#ff4d4f' : undefined, fontWeight: r.is_low ? 'bold' : undefined }}>
          {v} {r.is_low && <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />}
        </span>
      ),
    },
    { title: '安全库存', dataIndex: 'safety_stock', key: 'safety_stock', width: 100 },
    {
      title: '状态', key: 'status', width: 80,
      render: (_: any, r: InventoryItem) => r.is_low ? <Tag color="red">低库存</Tag> : <Tag color="green">正常</Tag>,
    },
  ];

  const logColumns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (v: string) => v?.replace('T', ' ').slice(0, 16) },
    { title: '货品', dataIndex: 'product_name', key: 'product_name', width: 150 },
    {
      title: '类型', dataIndex: 'log_type', key: 'log_type', width: 100,
      render: (v: string) => {
        const info = logTypeMap[v] || { text: v, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '变动', dataIndex: 'change_qty', key: 'change_qty', width: 100,
      render: (v: number) => <span style={{ color: v > 0 ? '#52c41a' : '#ff4d4f' }}>{v > 0 ? `+${v}` : v}</span>,
    },
    { title: '变动后', dataIndex: 'after_qty', key: 'after_qty', width: 80 },
    { title: '原因', dataIndex: 'reason', key: 'reason', width: 200, ellipsis: true },
    { title: '操作人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card
        title="库存管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => setAdjustModal(true)}>
            手动调整
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="筛选仓库"
            allowClear
            style={{ width: 200 }}
            value={warehouseFilter}
            onChange={v => setWarehouseFilter(v)}
            options={warehouses.map(w => ({ label: w.name, value: w.id }))}
          />
          <Button
            type={lowStockOnly ? 'primary' : 'default'}
            danger={lowStockOnly}
            icon={<WarningOutlined />}
            onClick={() => setLowStockOnly(!lowStockOnly)}
          >
            仅低库存
          </Button>
        </Space>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'inventory',
            label: '库存概览',
            children: (
              <Table
                rowKey="id"
                columns={invColumns}
                dataSource={inventory}
                loading={loading}
                scroll={{ x: 700 }}
                pagination={false}
                size={isMobile ? 'small' : 'middle'}
              />
            ),
          },
          {
            key: 'logs',
            label: <span><HistoryOutlined /> 变动记录</span>,
            children: (
              <Table
                rowKey="id"
                columns={logColumns}
                dataSource={logs}
                loading={logLoading}
                scroll={{ x: 800 }}
                size={isMobile ? 'small' : 'middle'}
                pagination={{
                  current: logPage,
                  total: logTotal,
                  pageSize: 20,
                  showTotal: t => `共 ${t} 条`,
                  onChange: p => fetchLogs(p),
                }}
              />
            ),
          },
        ]} />
      </Card>

      <Modal
        title="手动调整库存"
        open={adjustModal}
        onCancel={() => { setAdjustModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <Form.Item name="warehouse_id" label="仓库" rules={[{ required: true, message: '请选择仓库' }]}>
            <Select placeholder="选择仓库" options={warehouses.map(w => ({ label: w.name, value: w.id }))} />
          </Form.Item>
          <Form.Item name="product_id" label="货品" rules={[{ required: true, message: '请选择货品' }]}>
            <Select
              placeholder="选择货品"
              showSearch
              optionFilterProp="label"
              options={products.map(p => ({ label: `${p.name} (${p.unit})`, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="change_qty" label="调整数量（正数入库，负数出库）" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="如 +50 或 -10" />
          </Form.Item>
          <Form.Item name="reason" label="调整原因">
            <Input.TextArea rows={2} placeholder="如：盘点入库" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryManage;
