import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Space,
  Popconfirm,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import elemeApi, { FieldConfig } from '../../../../../api/eleme';

const { Option } = Select;

const DatabaseEditTab: React.FC = () => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await elemeApi.getFieldConfigs();
      setFields(response.data.fields);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取字段配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingField(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: FieldConfig) => {
    setEditingField(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await elemeApi.deleteFieldConfig(id);
      message.success('删除成功');
      fetchFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingField) {
        await elemeApi.updateFieldConfig(editingField.id, values);
        message.success('更新成功');
      } else {
        await elemeApi.createFieldConfig(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchFields();
    } catch (error: any) {
      if (error.response) {
        message.error(error.response.data.message || '操作失败');
      }
    }
  };

  const columns = [
    {
      title: '字段名称',
      dataIndex: 'field_name',
      key: 'field_name',
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '字段类型',
      dataIndex: 'field_type',
      key: 'field_type',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '字段分类',
      dataIndex: 'field_category',
      key: 'field_category',
      render: (text: string) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FieldConfig) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个字段配置吗？"
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
    <div className="database-edit-tab">
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加字段
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={fields}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingField ? '编辑字段配置' : '添加字段配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="field_name"
            label="字段名称（数据库列名）"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input
              placeholder="如：store_name"
              disabled={!!editingField}
            />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="显示名称（中文）"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="如：门店名称" />
          </Form.Item>

          <Form.Item
            name="field_type"
            label="字段类型"
            initialValue="VARCHAR"
          >
            <Select>
              <Option value="VARCHAR">VARCHAR（文本）</Option>
              <Option value="INT">INT（整数）</Option>
              <Option value="DECIMAL">DECIMAL（小数）</Option>
              <Option value="DATE">DATE（日期）</Option>
              <Option value="DATETIME">DATETIME（日期时间）</Option>
              <Option value="TEXT">TEXT（长文本）</Option>
            </Select>
          </Form.Item>

          <Form.Item name="field_category" label="字段分类">
            <Select>
              <Option value="基础信息">基础信息</Option>
              <Option value="运营时长">运营时长</Option>
              <Option value="订单财务">订单财务</Option>
              <Option value="营销漏斗">营销漏斗</Option>
              <Option value="商品运营">商品运营</Option>
              <Option value="服务质量">服务质量</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="字段描述">
            <Input.TextArea rows={3} placeholder="可选，输入字段说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DatabaseEditTab;

