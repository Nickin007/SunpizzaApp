import React, { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Card } from 'antd';
import { dictApi } from '../../api/dict';
import type { DictTaskType, DictPriority, DictStatus } from '../../types';

const Dict: React.FC = () => {
  const [types, setTypes] = useState<DictTaskType[]>([]);
  const [priorities, setPriorities] = useState<DictPriority[]>([]);
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [typesRes, prioritiesRes, statusesRes] = await Promise.all([
        dictApi.getTypes(),
        dictApi.getPriorities(),
        dictApi.getStatuses(),
      ]);
      setTypes(typesRes.data.data);
      setPriorities(prioritiesRes.data.data);
      setStatuses(statusesRes.data.data);
    } catch (error) {
      console.error('加载字典数据失败：', error);
    } finally {
      setLoading(false);
    }
  };

  const typeColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '类型名称',
      dataIndex: 'type_name',
      key: 'type_name',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string, record: DictTaskType) => (
        <Tag color={color}>{record.type_name}</Tag>
      ),
    },
  ];

  const priorityColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '优先级名称',
      dataIndex: 'priority_name',
      key: 'priority_name',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string, record: DictPriority) => (
        <Tag color={color}>{record.priority_name}</Tag>
      ),
    },
  ];

  const statusColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '状态名称',
      dataIndex: 'status_name',
      key: 'status_name',
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color: string, record: DictStatus) => (
        <Tag color={color}>{record.status_name}</Tag>
      ),
    },
  ];

  const items = [
    {
      key: 'types',
      label: '任务类型',
      children: (
        <Table
          loading={loading}
          dataSource={types}
          columns={typeColumns}
          rowKey="id"
          pagination={false}
        />
      ),
    },
    {
      key: 'priorities',
      label: '优先级',
      children: (
        <Table
          loading={loading}
          dataSource={priorities}
          columns={priorityColumns}
          rowKey="id"
          pagination={false}
        />
      ),
    },
    {
      key: 'statuses',
      label: '工单状态',
      children: (
        <Table
          loading={loading}
          dataSource={statuses}
          columns={statusColumns}
          rowKey="id"
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">字典管理</h2>
      </div>
      <Card>
        <Tabs items={items} />
      </Card>
    </div>
  );
};

export default Dict;

