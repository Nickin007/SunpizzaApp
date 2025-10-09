import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Card,
  Descriptions,
  List,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { workOrdersApi } from '../../api/workOrders';
import { usersApi } from '../../api/users';
import { shopsApi } from '../../api/shops';
import { dictApi } from '../../api/dict';
import { WorkOrder, User, Shop, DictTaskType, DictPriority, DictStatus } from '../../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const WorkOrders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [types, setTypes] = useState<DictTaskType[]>([]);
  const [priorities, setPriorities] = useState<DictPriority[]>([]);
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [commentText, setCommentText] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadWorkOrders();
    loadDictData();
    loadUsers();
    loadShops();
  }, [page, pageSize]);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await workOrdersApi.getWorkOrders({ page, per_page: pageSize });
      setWorkOrders(response.data.data.items);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('加载工单列表失败：', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDictData = async () => {
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
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getUsers({ per_page: 100 });
      setUsers(response.data.data.items);
    } catch (error) {
      console.error('加载用户列表失败：', error);
    }
  };

  const loadShops = async () => {
    try {
      const response = await shopsApi.getShops({ per_page: 100 });
      setShops(response.data.data.items);
    } catch (error) {
      console.error('加载门店列表失败：', error);
    }
  };

  const handleAdd = () => {
    setEditingOrder(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: WorkOrder) => {
    setEditingOrder(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      type_id: record.type_id,
      priority_id: record.priority_id,
      status_id: record.status_id,
      shop_id: record.shop_id,
      assignee_id: record.assignee_id,
      due_date: record.due_date ? dayjs(record.due_date) : null,
      completion_notes: record.completion_notes,
    });
    setModalVisible(true);
  };

  const handleView = async (record: WorkOrder) => {
    try {
      const response = await workOrdersApi.getWorkOrder(record.id);
      setViewingOrder(response.data.data);
      setDetailVisible(true);
    } catch (error) {
      console.error('加载工单详情失败：', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await workOrdersApi.deleteWorkOrder(id);
      message.success('删除成功');
      loadWorkOrders();
    } catch (error) {
      console.error('删除失败：', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
      };

      if (editingOrder) {
        await workOrdersApi.updateWorkOrder(editingOrder.id, data);
        message.success('更新成功');
      } else {
        await workOrdersApi.createWorkOrder(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadWorkOrders();
    } catch (error) {
      console.error('提交失败：', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      message.warning('请输入评论内容');
      return;
    }
    try {
      await workOrdersApi.addComment(viewingOrder!.id, commentText);
      message.success('评论成功');
      setCommentText('');
      handleView(viewingOrder!);
    } catch (error) {
      console.error('添加评论失败：', error);
    }
  };

  const statusColors: Record<string, string> = {
    '待受理': 'default',
    '进行中': 'processing',
    '已完成': 'success',
    '已归档': 'default',
  };

  const priorityColors: Record<string, string> = {
    '低': 'green',
    '中': 'orange',
    '高': 'red',
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: ['type', 'type_name'],
      key: 'type',
      width: 100,
      render: (text: string, record: WorkOrder) => (
        <Tag color={record.type?.color}>{text}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: ['priority', 'priority_name'],
      key: 'priority',
      width: 80,
      render: (text: string) => (
        <Tag color={priorityColors[text] || 'default'}>{text}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: ['status', 'status_name'],
      key: 'status',
      width: 90,
      render: (text: string) => (
        <Tag color={statusColors[text] || 'default'}>{text}</Tag>
      ),
    },
    {
      title: '门店',
      dataIndex: ['shop', 'name'],
      key: 'shop',
      width: 120,
    },
    {
      title: '负责人',
      dataIndex: ['assignee', 'real_name'],
      key: 'assignee',
      width: 100,
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 110,
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: WorkOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个工单吗？"
            onConfirm={() => handleDelete(record.id)}
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>工单管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增工单
        </Button>
      </div>

      <Table
        loading={loading}
        dataSource={workOrders}
        columns={columns}
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
      />

      <Modal
        title={editingOrder ? '编辑工单' : '新增工单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入工单标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={4} placeholder="请输入工单描述" />
          </Form.Item>

          <Form.Item
            name="type_id"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="请选择类型"
              options={types.map(t => ({ label: t.type_name, value: t.id }))}
            />
          </Form.Item>

          <Form.Item
            name="priority_id"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select
              placeholder="请选择优先级"
              options={priorities.map(p => ({ label: p.priority_name, value: p.id }))}
            />
          </Form.Item>

          {editingOrder && (
            <Form.Item
              name="status_id"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                placeholder="请选择状态"
                options={statuses.map(s => ({ label: s.status_name, value: s.id }))}
              />
            </Form.Item>
          )}

          <Form.Item
            name="shop_id"
            label="门店"
            rules={[{ required: true, message: '请选择门店' }]}
          >
            <Select
              placeholder="请选择门店"
              options={shops.map(s => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

          <Form.Item
            name="assignee_id"
            label="负责人"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select
              placeholder="请选择负责人"
              options={users.map(u => ({ label: u.real_name, value: u.id }))}
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="截止日期"
            rules={[{ required: true, message: '请选择截止日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {editingOrder && (
            <Form.Item name="completion_notes" label="完成备注">
              <TextArea rows={3} placeholder="请输入完成备注" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="工单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {viewingOrder && (
          <div>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="标题">{viewingOrder.title}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusColors[viewingOrder.status?.status_name || '']}>
                    {viewingOrder.status?.status_name}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag color={viewingOrder.type?.color}>
                    {viewingOrder.type?.type_name}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Tag color={priorityColors[viewingOrder.priority?.priority_name || '']}>
                    {viewingOrder.priority?.priority_name}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="门店">
                  {viewingOrder.shop?.name}
                </Descriptions.Item>
                <Descriptions.Item label="负责人">
                  {viewingOrder.assignee?.real_name}
                </Descriptions.Item>
                <Descriptions.Item label="创建人">
                  {viewingOrder.creator?.real_name}
                </Descriptions.Item>
                <Descriptions.Item label="截止日期">
                  {viewingOrder.due_date ? dayjs(viewingOrder.due_date).format('YYYY-MM-DD') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>
                  {dayjs(viewingOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="描述" span={2}>
                  {viewingOrder.description}
                </Descriptions.Item>
                {viewingOrder.completion_notes && (
                  <Descriptions.Item label="完成备注" span={2}>
                    {viewingOrder.completion_notes}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="评论记录">
              <List
                dataSource={viewingOrder.comments || []}
                renderItem={(comment) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={`${comment.author?.real_name} - ${dayjs(comment.created_at).format('YYYY-MM-DD HH:mm:ss')}`}
                      description={comment.content}
                    />
                  </List.Item>
                )}
              />
              <div style={{ marginTop: 16 }}>
                <TextArea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="添加评论..."
                />
                <Button
                  type="primary"
                  onClick={handleAddComment}
                  style={{ marginTop: 8 }}
                >
                  发表评论
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkOrders;

