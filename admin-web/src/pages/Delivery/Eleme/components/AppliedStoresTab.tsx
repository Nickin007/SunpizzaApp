import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Switch, message, Statistic, Row, Col, Input } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import costAnalysisApi, { type AppliedStore } from '../../../../api/costAnalysis';

/**
 * 应用门店标签页
 * 配置哪些门店应用成本解析
 */
const AppliedStoresTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<AppliedStore[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  
  // 统计信息
  const [summary, setSummary] = useState({
    total_stores: 0,
    enabled_stores: 0,
    disabled_stores: 0,
  });

  useEffect(() => {
    loadData();
    loadSummary();
  }, [page, pageSize]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await costAnalysisApi.getAppliedStores({
        page,
        per_page: pageSize,
        search: searchText,
      });
      // 注意：后端返回的是 response.data.data（嵌套两层data）
      const resData = (response.data as any).data || response.data;
      setDataSource(resData.stores || []);
      setTotal(resData.total || 0);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取门店列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await costAnalysisApi.getSummary();
      const resData = (response.data as any).data || response.data;
      setSummary(resData);
    } catch (error) {
      console.error('获取统计信息失败', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleToggleEnabled = async (record: AppliedStore) => {
    try {
      await costAnalysisApi.toggleCostAnalysis(record.id);
      message.success(`${record.cost_analysis_enabled ? '停用' : '启用'}成功`);
      loadData();
      loadSummary();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const columns: ColumnsType<AppliedStore> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: '门店名称（饿了么）',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 250,
    },
    {
      title: '门店名称（食亨）',
      dataIndex: 'store_name_shiheng',
      key: 'store_name_shiheng',
      width: 250,
      render: (text: string) => text || <span style={{ color: '#999' }}>未设置</span>,
    },
    {
      title: '成本分析状态',
      dataIndex: 'cost_analysis_enabled',
      key: 'cost_analysis_enabled',
      width: 150,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          checkedChildren="已启用"
          unCheckedChildren="已停用"
          onChange={() => handleToggleEnabled(record)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div className="tab-content">
      {/* 统计信息 */}
      <div className="tab-section" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="总门店数"
                value={summary.total_stores}
                suffix="家"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="已启用成本分析"
                value={summary.enabled_stores}
                valueStyle={{ color: '#3f8600' }}
                suffix="家"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="未启用成本分析"
                value={summary.disabled_stores}
                valueStyle={{ color: '#999' }}
                suffix="家"
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 门店列表 */}
      <div className="tab-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="tab-section-title" style={{ marginBottom: 0 }}>应用门店配置</h3>
          <Space>
            <Input.Search
              placeholder="搜索门店名称"
              allowClear
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
            >
              刷新
            </Button>
          </Space>
        </div>
        <Card>
          <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            locale={{
              emptyText: '暂无门店配置，请前往"数据上传 > 在营门店列表"添加门店',
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default AppliedStoresTab;
