import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tree, Button, Modal, Form, Input, Select, Switch, Space, Tag, message, Empty, Typography, Alert, Popconfirm, Input as AntInput } from 'antd';
import { PlusOutlined, DatabaseOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import * as financeApi from '../../api/finance';
import type { AccountSubject } from '../../api/finance';
import { useFinanceStore } from '../../store/financeStore';

const { Text, Title } = Typography;
const { Search } = AntInput;

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  asset: { label: '资产', color: '#1890ff' },
  liability: { label: '负债', color: '#f5222d' },
  equity: { label: '权益', color: '#722ed1' },
  income: { label: '收入', color: '#52c41a' },
  expense: { label: '费用', color: '#fa8c16' },
};

const Subjects: React.FC = () => {
  const { currentBookId, currentBookName } = useFinanceStore();
  const [subjects, setSubjects] = useState<AccountSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<AccountSubject | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const loadSubjects = async () => {
    if (!currentBookId) return;
    setLoading(true);
    try {
      const res = await financeApi.listSubjects(currentBookId);
      if (res.data.code === 200) {
        setSubjects(res.data.data);
      }
    } catch {
      message.error('加载科目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
    setSelectedSubject(null);
  }, [currentBookId]);

  // 构建树形数据
  const treeData = useMemo(() => {
    const map = new Map<number, DataNode & { subject: AccountSubject }>();
    const roots: (DataNode & { subject: AccountSubject })[] = [];

    // 先创建所有节点
    for (const s of subjects) {
      const typeInfo = TYPE_LABELS[s.type] || { label: '未知', color: '#999' };
      const matchSearch = !searchText ||
        s.code.includes(searchText) ||
        s.name.includes(searchText);

      const node: DataNode & { subject: AccountSubject } = {
        key: s.id,
        title: (
          <span style={{ opacity: s.is_enabled ? 1 : 0.4 }}>
            <Text strong style={{ marginRight: 8 }}>{s.code}</Text>
            <Text>{s.name}</Text>
            <Tag color={typeInfo.color} style={{ marginLeft: 8, fontSize: 11 }}>{typeInfo.label}</Tag>
            {!s.is_enabled && <Tag color="default">已停用</Tag>}
          </span>
        ),
        children: [],
        subject: s,
        style: matchSearch ? {} : { display: 'none' },
      };
      map.set(s.id, node);
    }

    // 构建父子关系
    for (const s of subjects) {
      const node = map.get(s.id)!;
      if (s.parent_id && map.has(s.parent_id)) {
        (map.get(s.parent_id)!.children as DataNode[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [subjects, searchText]);

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const s = subjects.find((x) => x.id === selectedKeys[0]);
      setSelectedSubject(s || null);
    } else {
      setSelectedSubject(null);
    }
  };

  const handleAddChild = () => {
    addForm.resetFields();
    if (selectedSubject) {
      addForm.setFieldsValue({
        parent_code: selectedSubject.code,
        code: selectedSubject.code,
        type: selectedSubject.type,
        balance_direction: selectedSubject.balance_direction,
      });
    }
    setAddModalVisible(true);
  };

  const handleAddSubmit = async () => {
    if (!currentBookId) return;
    try {
      const values = await addForm.validateFields();
      const payload: Parameters<typeof financeApi.addSubject>[1] = {
        code: values.code,
        name: values.name,
        parent_id: selectedSubject ? selectedSubject.id : null,
        is_cash: values.is_cash || false,
      };
      if (!selectedSubject) {
        payload.type = values.type;
        payload.balance_direction = values.balance_direction;
      }
      const res = await financeApi.addSubject(currentBookId, payload);
      if (res.data.code === 200) {
        message.success('添加成功');
        setAddModalVisible(false);
        loadSubjects();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      if (e.response?.data?.message) message.error(e.response.data.message);
    }
  };

  const handleToggleEnabled = async (subject: AccountSubject) => {
    try {
      const res = await financeApi.updateSubject(subject.id, { is_enabled: !subject.is_enabled });
      if (res.data.code === 200) {
        message.success(subject.is_enabled ? '已停用' : '已启用');
        loadSubjects();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (subject: AccountSubject) => {
    try {
      const res = await financeApi.deleteSubject(subject.id);
      if (res.data.code === 200) {
        message.success('删除成功');
        setSelectedSubject(null);
        loadSubjects();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  if (!currentBookId) {
    return (
      <Card>
        <Empty description="请先在「账套管理」中创建并选择一个账套" />
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            科目管理 - {currentBookName}
          </Title>
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => { setSelectedSubject(null); handleAddChild(); }}>
              添加一级科目
            </Button>
          </Space>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* 左侧：科目树 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Search
              placeholder="搜索科目编码或名称"
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {subjects.length > 0 ? (
              <div style={{ maxHeight: 600, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                <Tree
                  treeData={treeData}
                  onSelect={handleSelect}
                  selectedKeys={selectedSubject ? [selectedSubject.id] : []}
                  defaultExpandAll
                  showLine
                  blockNode
                />
              </div>
            ) : (
              <Empty description={loading ? '加载中...' : '暂无科目数据'} />
            )}
          </div>

          {/* 右侧：科目详情 */}
          <div style={{ width: 360 }}>
            {selectedSubject ? (
              <Card title="科目详情" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><Text type="secondary">编码：</Text><Text strong>{selectedSubject.code}</Text></div>
                  <div><Text type="secondary">名称：</Text><Text strong>{selectedSubject.name}</Text></div>
                  <div>
                    <Text type="secondary">类型：</Text>
                    <Tag color={TYPE_LABELS[selectedSubject.type]?.color}>{TYPE_LABELS[selectedSubject.type]?.label}</Tag>
                  </div>
                  <div><Text type="secondary">余额方向：</Text><Tag>{selectedSubject.balance_direction === 'debit' ? '借' : '贷'}</Tag></div>
                  <div><Text type="secondary">级次：</Text><Text>{selectedSubject.level} 级</Text></div>
                  <div>
                    <Text type="secondary">状态：</Text>
                    <Switch checked={selectedSubject.is_enabled} onChange={() => handleToggleEnabled(selectedSubject)} checkedChildren="启用" unCheckedChildren="停用" />
                  </div>
                  <div>
                    <Text type="secondary">现金科目：</Text>
                    <Tag color={selectedSubject.is_cash ? 'green' : 'default'}>{selectedSubject.is_cash ? '是' : '否'}</Tag>
                  </div>

                  <Space style={{ marginTop: 8 }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddChild}>
                      添加下级科目
                    </Button>
                    <Popconfirm title="确定删除此科目？" onConfirm={() => handleDelete(selectedSubject)} okText="确定" cancelText="取消">
                      <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            ) : (
              <Alert message="点击左侧科目查看详情" type="info" showIcon />
            )}
          </div>
        </div>
      </Card>

      {/* 添加科目弹窗 */}
      <Modal
        title={selectedSubject ? `添加「${selectedSubject.code} ${selectedSubject.name}」的下级科目` : '添加一级科目'}
        open={addModalVisible}
        onOk={handleAddSubmit}
        onCancel={() => setAddModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={addForm} layout="vertical">
          {selectedSubject && (
            <Form.Item label="上级科目">
              <Input disabled value={`${selectedSubject.code} ${selectedSubject.name}`} />
            </Form.Item>
          )}
          <Form.Item name="code" label="科目编码" rules={[{ required: true, message: '请输入科目编码' }]}
            extra={selectedSubject ? `必须以 ${selectedSubject.code} 开头，如 ${selectedSubject.code}01` : '一级科目为4位编码'}
          >
            <Input placeholder={selectedSubject ? `${selectedSubject.code}01` : '如 1001'} />
          </Form.Item>
          <Form.Item name="name" label="科目名称" rules={[{ required: true, message: '请输入科目名称' }]}>
            <Input placeholder="如 库存现金" />
          </Form.Item>
          {!selectedSubject && (
            <>
              <Form.Item name="type" label="科目类型" rules={[{ required: true, message: '请选择科目类型' }]}>
                <Select placeholder="选择科目类型" options={[
                  { value: 'asset', label: '资产类' },
                  { value: 'liability', label: '负债类' },
                  { value: 'equity', label: '权益类' },
                  { value: 'income', label: '收入类' },
                  { value: 'expense', label: '费用类' },
                ]} />
              </Form.Item>
              <Form.Item name="balance_direction" label="余额方向" rules={[{ required: true, message: '请选择余额方向' }]}>
                <Select placeholder="选择余额方向" options={[
                  { value: 'debit', label: '借方' },
                  { value: 'credit', label: '贷方' },
                ]} />
              </Form.Item>
            </>
          )}
          <Form.Item name="is_cash" label="是否现金类科目" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Subjects;
