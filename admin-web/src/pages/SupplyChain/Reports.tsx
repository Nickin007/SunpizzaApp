import React, { useState, useCallback } from 'react';
import { Card, Table, Button, DatePicker, Space, Descriptions, Statistic, Row, Col, Tag, message } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { getOrderSummary, exportOrders } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!dateRange) {
      message.warning('请选择日期范围');
      return;
    }
    setLoading(true);
    try {
      const res = await getOrderSummary({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      });
      setSummary(res.data.data);
    } catch {
      message.error('获取报表失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const handleExport = async () => {
    if (!dateRange) {
      message.warning('请选择日期范围');
      return;
    }
    setExporting(true);
    try {
      const res = await exportOrders({
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD'),
      });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `订货报表_${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待审核', color: 'processing' },
    approved: { text: '已审核', color: 'blue' },
    rejected: { text: '已驳回', color: 'red' },
    shipped: { text: '已发货', color: 'green' },
    completed: { text: '已完成', color: 'default' },
  };

  const storeColumns = [
    { title: '门店', dataIndex: 'name', key: 'name', width: 150 },
    { title: '订单数', dataIndex: 'count', key: 'count', width: 100 },
    {
      title: '订货金额', dataIndex: 'amount', key: 'amount', width: 120,
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
  ];

  const storeData = summary?.store_summary
    ? Object.entries(summary.store_summary).map(([name, info]: [string, any]) => ({
        key: name, name, count: info.count, amount: info.amount,
      }))
    : [];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card title="订货报表">
        <Space wrap style={{ marginBottom: 24 }}>
          <RangePicker
            value={dateRange}
            onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            style={{ width: isMobile ? '100%' : undefined }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchSummary} loading={loading}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}>
            查询
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
            导出 Excel
          </Button>
        </Space>

        {summary && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="总订单数" value={summary.total_orders} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="总金额" value={summary.total_amount} prefix="¥" precision={2} />
                </Card>
              </Col>
              {summary.status_counts && Object.entries(summary.status_counts).map(([status, count]: [string, any]) => (
                <Col xs={12} md={6} key={status}>
                  <Card size="small">
                    <Statistic
                      title={statusMap[status]?.text || status}
                      value={count}
                      valueStyle={{ color: status === 'rejected' ? '#ff4d4f' : undefined }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card title="门店订货汇总" size="small">
              <Table
                rowKey="key"
                columns={storeColumns}
                dataSource={storeData}
                pagination={false}
                scroll={{ x: 400 }}
                size="small"
              />
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default Reports;
