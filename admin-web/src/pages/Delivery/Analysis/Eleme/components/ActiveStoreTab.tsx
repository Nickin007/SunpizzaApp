import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  message, 
  Popconfirm, 
  Tag,
  Modal,
  Form,
  Switch,
  Card,
  Row,
  Col,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  ReloadOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import elemeApi from '../../../../../api/eleme';
import dayjs from 'dayjs';

interface ActiveStore {
  id: number;
  store_name: string;
  store_name_shiheng?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ActiveStoreTab: React.FC = () => {
  const [stores, setStores] = useState<ActiveStore[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<ActiveStore | null>(null);
  const [form] = Form.useForm();

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // 加载统计数据
  const loadStats = async () => {
    try {
      // 获取总数
      const totalResponse = await elemeApi.getActiveStores({ page: 1, per_page: 1 });
      const total = totalResponse.data.data?.total || 0;

      // 获取在营门店数
      const activeResponse = await elemeApi.getActiveStores({ page: 1, per_page: 1, is_active: true });
      const active = activeResponse.data.data?.total || 0;

      // 获取停业门店数
      const inactiveResponse = await elemeApi.getActiveStores({ page: 1, per_page: 1, is_active: false });
      const inactive = inactiveResponse.data.data?.total || 0;

      setStats({
        total,
        active,
        inactive,
      });
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载门店列表
  const loadStores = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        per_page: pagination.pageSize,
      };

      if (searchText) {
        params.search = searchText;
      }

      if (filterActive !== undefined) {
        params.is_active = filterActive;
      }

      const response = await elemeApi.getActiveStores(params);
      if (response.data.code === 200) {
        const data = response.data.data;
        setStores(data.stores);
        setPagination({
          ...pagination,
          current: data.page,
          total: data.total,
        });
      }
    } catch (error: any) {
      message.error(`加载门店列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
    loadStats();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    loadStores(1);
  };

  // 处理筛选
  const handleFilterChange = async (value: boolean | undefined) => {
    setFilterActive(value);
    setLoading(true);
    try {
      const params: any = {
        page: 1,
        per_page: pagination.pageSize,
      };

      if (searchText) {
        params.search = searchText;
      }

      if (value !== undefined) {
        params.is_active = value;
      }

      const response = await elemeApi.getActiveStores(params);
      if (response.data.code === 200) {
        const data = response.data.data;
        setStores(data.stores);
        setPagination({
          ...pagination,
          current: data.page,
          total: data.total,
        });
      }
    } catch (error: any) {
      message.error(`加载门店列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 打开新建/编辑对话框
  const handleOpenModal = (store?: ActiveStore) => {
    setEditingStore(store || null);
    if (store) {
      form.setFieldsValue({
        store_name: store.store_name,
        store_name_shiheng: store.store_name_shiheng,
        is_active: store.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
    setIsModalVisible(true);
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingStore(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingStore) {
        // 更新
        await elemeApi.updateActiveStore(editingStore.id, values);
        message.success('门店更新成功');
      } else {
        // 创建
        await elemeApi.createActiveStore(values);
        message.success('门店创建成功');
      }

      handleCloseModal();
      loadStores(pagination.current);
      loadStats(); // 刷新统计数据
    } catch (error: any) {
      if (error.message) {
        message.error(error.message);
      }
    }
  };

  // 删除门店
  const handleDelete = async (storeId: number) => {
    try {
      await elemeApi.deleteActiveStore(storeId);
      message.success('门店删除成功');
      loadStores(pagination.current);
      loadStats(); // 刷新统计数据
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };

  // 切换门店状态
  const handleToggleActive = async (store: ActiveStore) => {
    try {
      await elemeApi.updateActiveStore(store.id, {
        is_active: !store.is_active,
      });
      message.success(`已${store.is_active ? '停用' : '启用'}门店`);
      loadStores(pagination.current);
      loadStats(); // 刷新统计数据
    } catch (error: any) {
      message.error(`操作失败: ${error.message}`);
    }
  };

  // 表格列定义
  const columns: ColumnsType<ActiveStore> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_text, _record, index) => {
        return (pagination.current - 1) * pagination.pageSize + index + 1;
      },
    },
    {
      title: '门店名称（饿了么）',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 250,
      ellipsis: true,
    },
    {
      title: '门店名称（食亨）',
      dataIndex: 'store_name_shiheng',
      key: 'store_name_shiheng',
      width: 250,
      ellipsis: true,
      render: (text: string) => text || <span style={{ color: '#999' }}>未设置</span>,
    },
    {
      title: '在营状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      align: 'center',
      render: (is_active: boolean) => (
        <Tag
          icon={is_active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={is_active ? 'success' : 'default'}
        >
          {is_active ? '在营' : '停业'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (created_at: string) => dayjs(created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (updated_at: string) => dayjs(updated_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_text, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleActive(record)}
          >
            {record.is_active ? '停用' : '启用'}
          </Button>
          <Popconfirm
            title="确定要删除这个门店吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总门店数"
              value={stats.total}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="在营门店"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="停业门店"
              value={stats.inactive}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          新建门店
        </Button>
        <Input.Search
          placeholder="搜索门店名称"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Button
          onClick={() => handleFilterChange(true)}
          type={filterActive === true ? 'primary' : 'default'}
        >
          仅在营
        </Button>
        <Button
          onClick={() => handleFilterChange(false)}
          type={filterActive === false ? 'primary' : 'default'}
        >
          仅停业
        </Button>
        <Button
          onClick={() => handleFilterChange(undefined)}
          type={filterActive === undefined ? 'primary' : 'default'}
        >
          全部
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => loadStores(pagination.current)}
        >
          刷新
        </Button>
      </Space>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={stores}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个门店`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, current: page, pageSize: pageSize || 50 });
            loadStores(page);
          },
        }}
        scroll={{ x: 1400 }}
        size="middle"
      />

      {/* 新建/编辑对话框 */}
      <Modal
        title={editingStore ? '编辑门店' : '新建门店'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={500}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="store_name"
            label="门店名称（饿了么）"
            rules={[
              { required: true, message: '请输入饿了么门店名称' },
              { max: 200, message: '门店名称不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入饿了么门店名称" />
          </Form.Item>
          <Form.Item
            name="store_name_shiheng"
            label="门店名称（食亨）"
            rules={[
              { max: 200, message: '门店名称不能超过200个字符' },
            ]}
          >
            <Input placeholder="请输入食亨门店名称（可选）" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="在营状态"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="在营"
              unCheckedChildren="停业"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActiveStoreTab;

