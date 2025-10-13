import React, { useState, useEffect } from 'react';
import { Table, Card, Row, Col, Statistic, message } from 'antd';
import { ShopOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import elemeApi from '../../../../../api/eleme';
import type { ElemeStoreData, Statistics } from '../../../../../api/eleme';
import dayjs from 'dayjs';

interface Props {
  dateRange: [any, any] | null;
  selectedStores: string[];
  selectedCities: string[];
}

const BasicInfoTab: React.FC<Props> = ({ dateRange, selectedStores, selectedCities }) => {
  const [data, setData] = useState<ElemeStoreData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchData();
    fetchStatistics();
  }, [dateRange, selectedStores, selectedCities]);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: pagination.pageSize,
      };

      if (dateRange) {
        params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
      }

      if (selectedCities.length > 0) {
        params.city = selectedCities[0]; // API暂时只支持单个城市
      }

      if (selectedStores.length > 0) {
        params.store_id = selectedStores[0]; // API暂时只支持单个门店
      }

      const response = await elemeApi.getStoreData(params);
      // 注意：后端返回的是 response.data.data（嵌套两层data）
      const resData = (response.data as any).data || response.data;
      setData(resData.data || []);
      setPagination({
        ...pagination,
        current: resData.page || 1,
        total: resData.total || 0,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params: any = {};

      if (dateRange) {
        params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
      }

      if (selectedCities.length > 0) {
        params.city = selectedCities[0];
      }

      const response = await elemeApi.getStatistics(params);
      // 注意：后端返回的是 response.data.data（嵌套两层data）
      setStatistics((response.data as any).data || response.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取统计数据失败');
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: '门店编号',
      dataIndex: 'store_id',
      key: 'store_id',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '订单数',
      dataIndex: 'valid_orders',
      key: 'valid_orders',
      sorter: (a: ElemeStoreData, b: ElemeStoreData) => a.valid_orders - b.valid_orders,
    },
    {
      title: '营业额',
      dataIndex: 'income',
      key: 'income',
      sorter: (a: ElemeStoreData, b: ElemeStoreData) => a.income - b.income,
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '客单价',
      dataIndex: 'avg_payment_per_order',
      key: 'avg_payment_per_order',
      render: (text: number) => `¥${text.toFixed(2)}`,
    },
    {
      title: '店铺评分',
      dataIndex: 'store_score',
      key: 'store_score',
      render: (text: number) => text ? text.toFixed(2) : '-',
    },
  ];

  return (
    <div className="basic-info-tab">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总门店数"
              value={statistics?.store_count || 0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={statistics?.total_orders || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总营业额"
              value={statistics?.total_income || 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均店铺评分"
              value={statistics?.avg_store_score || 0}
              precision={2}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      <Card title="门店数据列表" size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: fetchData,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default BasicInfoTab;

