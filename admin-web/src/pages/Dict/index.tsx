import React, { useEffect, useState } from 'react';
import { Tabs, Table, Tag, Card, Button, Space, Modal, Form, Input, message, Popconfirm, InputNumber } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { dictApi } from '../../api/dict';
import type { DictTaskType, DictPriority, DictStatus } from '../../types';

const Dict: React.FC = () => {
  const [types, setTypes] = useState<DictTaskType[]>([]);
  const [priorities, setPriorities] = useState<DictPriority[]>([]);
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 编辑弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add'); // 新增：区分新增/编辑模式
  const [editingType, setEditingType] = useState<'type' | 'priority' | 'status'>('type');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

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

  // 新增任务类型
  const handleAddType = () => {
    setModalMode('add');
    setEditingType('type');
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#999999', // 默认颜色
    });
    setModalVisible(true);
  };

  // 编辑任务类型
  const handleEditType = (record: DictTaskType) => {
    setModalMode('edit');
    setEditingType('type');
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.type_name,
      color: record.color,
    });
    setModalVisible(true);
  };

  // 删除任务类型
  const handleDeleteType = async (id: number) => {
    try {
      await dictApi.deleteType(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 新增优先级
  const handleAddPriority = () => {
    setModalMode('add');
    setEditingType('priority');
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#999999', // 默认颜色
      sort_order: 1, // 默认排序
    });
    setModalVisible(true);
  };

  // 编辑优先级
  const handleEditPriority = (record: DictPriority) => {
    setModalMode('edit');
    setEditingType('priority');
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.priority_name,
      color: record.color,
      sort_order: record.sort_order,
    });
    setModalVisible(true);
  };

  // 删除优先级
  const handleDeletePriority = async (id: number) => {
    try {
      await dictApi.deletePriority(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 新增状态
  const handleAddStatus = () => {
    setModalMode('add');
    setEditingType('status');
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#999999', // 默认颜色
    });
    setModalVisible(true);
  };

  // 编辑状态
  const handleEditStatus = (record: DictStatus) => {
    setModalMode('edit');
    setEditingType('status');
    setEditingRecord(record);
    form.setFieldsValue({
      name: record.status_name,
      color: record.color,
    });
    setModalVisible(true);
  };

  // 删除状态
  const handleDeleteStatus = async (id: number) => {
    try {
      await dictApi.deleteStatus(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 提交（新增或编辑）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalMode === 'add') {
        // 新增模式
        if (editingType === 'type') {
          await dictApi.createType({
            type_name: values.name,
            color: values.color,
          });
        } else if (editingType === 'priority') {
          await dictApi.createPriority({
            priority_name: values.name,
            color: values.color,
            sort_order: values.sort_order,
          });
        } else if (editingType === 'status') {
          await dictApi.createStatus({
            status_name: values.name,
            color: values.color,
          });
        }
        message.success('创建成功');
      } else {
        // 编辑模式
        if (editingType === 'type') {
          await dictApi.updateType(editingRecord.id, {
            type_name: values.name,
            color: values.color,
          });
        } else if (editingType === 'priority') {
          await dictApi.updatePriority(editingRecord.id, {
            priority_name: values.name,
            color: values.color,
            sort_order: values.sort_order,
          });
        } else if (editingType === 'status') {
          await dictApi.updateStatus(editingRecord.id, {
            status_name: values.name,
            color: values.color,
          });
        }
        message.success('更新成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || (modalMode === 'add' ? '创建失败' : '更新失败'));
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
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DictTaskType) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditType(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个类型吗？"
            description="删除后无法恢复，且不能删除正在使用的类型"
            onConfirm={() => handleDeleteType(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
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
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DictPriority) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPriority(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个优先级吗？"
            description="删除后无法恢复，且不能删除正在使用的优先级"
            onConfirm={() => handleDeletePriority(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
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
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DictStatus) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStatus(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个状态吗？"
            description="删除后无法恢复，且不能删除正在使用的状态"
            onConfirm={() => handleDeleteStatus(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const items = [
    {
      key: 'types',
      label: '任务类型',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddType}>
              新增任务类型
            </Button>
          </div>
          <Table
            loading={loading}
            dataSource={types}
            columns={typeColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'priorities',
      label: '优先级',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPriority}>
              新增优先级
            </Button>
          </div>
          <Table
            loading={loading}
            dataSource={priorities}
            columns={priorityColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'statuses',
      label: '工单状态',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStatus}>
              新增工单状态
            </Button>
          </div>
          <Table
            loading={loading}
            dataSource={statuses}
            columns={statusColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
  ];

  // 获取弹窗标题
  const getModalTitle = () => {
    const typeNames = {
      type: '任务类型',
      priority: '优先级',
      status: '工单状态',
    };
    const modeText = modalMode === 'add' ? '新增' : '编辑';
    return `${modeText}${typeNames[editingType]}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">字典管理</h2>
      </div>
      <Card>
        <Tabs items={items} />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={getModalTitle()}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item
            name="color"
            label="颜色"
            rules={[{ required: true, message: '请输入颜色' }]}
            tooltip="支持颜色名称（如 red）或十六进制值（如 #FF0000）"
          >
            <Input placeholder="例如：red 或 #FF0000" />
          </Form.Item>

          {/* 优先级特有的排序字段 */}
          {editingType === 'priority' && (
            <Form.Item
              name="sort_order"
              label="排序值"
              rules={[{ required: true, message: '请输入排序值' }]}
              tooltip="数值越大，优先级越高"
            >
              <InputNumber
                min={1}
                max={100}
                placeholder="请输入排序值"
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Dict;

