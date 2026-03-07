import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tree, Button, Modal, Form, Input, InputNumber, Select,
  Switch, Space, Popconfirm, Tag, message, Row, Col, Empty, Divider, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  AppstoreOutlined, MinusCircleOutlined, FolderOutlined, FolderOpenOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import {
  listCategories, createCategory, updateCategory, deleteCategory,
  listProducts, createProduct, updateProduct, deleteProduct,
} from '../../api/supplyChain';
import type { ProductCategory, Product, ProductSpec } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const GREEN = '#52c41a';

/* ────────── helpers ────────── */

function categoriesToTreeData(cats: ProductCategory[]): DataNode[] {
  return cats.map((c) => ({
    key: c.id,
    title: c.name,
    children: c.children?.length ? categoriesToTreeData(c.children) : undefined,
    icon: c.children?.length ? <FolderOpenOutlined /> : <FolderOutlined />,
  }));
}

function flattenCategories(cats: ProductCategory[]): ProductCategory[] {
  const result: ProductCategory[] = [];
  const walk = (list: ProductCategory[]) => {
    for (const c of list) {
      result.push(c);
      if (c.children?.length) walk(c.children);
    }
  };
  walk(cats);
  return result;
}

/* ────────── component ────────── */

const ProductManage: React.FC = () => {
  const isMobile = useIsMobile();

  /* ── category state ── */
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [flatCats, setFlatCats] = useState<ProductCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [catForm] = Form.useForm();

  /* ── product state ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(10);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodSubmitting, setProdSubmitting] = useState(false);
  const [prodForm] = Form.useForm();

  /* ────────── load categories ────────── */
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await listCategories(true);
      const data: ProductCategory[] = res.data.data ?? [];
      setCategories(data);
      setFlatCats(flattenCategories(data));
    } catch {
      message.error('加载分类失败');
    } finally {
      setCatLoading(false);
    }
  }, []);

  /* ────────── load products ────────── */
  const loadProducts = useCallback(async (p = page, cat = selectedCatId, kw = keyword) => {
    setProdLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, per_page: pageSize };
      if (cat) params.category_id = cat;
      if (kw) params.keyword = kw;
      const res = await listProducts(params as any);
      const d = res.data.data;
      setProducts(d.items ?? []);
      setTotal(d.total ?? 0);
    } catch {
      message.error('加载货品失败');
    } finally {
      setProdLoading(false);
    }
  }, [page, selectedCatId, keyword, pageSize]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadProducts(page, selectedCatId, keyword); }, [page, selectedCatId]);

  /* ────────── category handlers ────────── */
  const openCatModal = (cat?: ProductCategory) => {
    setEditingCat(cat ?? null);
    catForm.resetFields();
    if (cat) {
      catForm.setFieldsValue({ name: cat.name, parent_id: cat.parent_id ?? undefined, sort_order: cat.sort_order });
    } else {
      catForm.setFieldsValue({ sort_order: 0 });
    }
    setCatModalOpen(true);
  };

  const handleCatSubmit = async () => {
    try {
      const vals = await catForm.validateFields();
      const payload = { name: vals.name, parent_id: vals.parent_id ?? null, sort_order: vals.sort_order ?? 0 };
      if (editingCat) {
        await updateCategory(editingCat.id, payload);
        message.success('分类已更新');
      } else {
        await createCategory(payload);
        message.success('分类已创建');
      }
      setCatModalOpen(false);
      loadCategories();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDeleteCat = async (id: number) => {
    try {
      await deleteCategory(id);
      message.success('分类已删除');
      if (selectedCatId === id) { setSelectedCatId(null); setPage(1); }
      loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败，可能存在关联货品');
    }
  };

  /* ────────── product handlers ────────── */
  const handleSearch = () => {
    setPage(1);
    loadProducts(1, selectedCatId, keyword);
  };

  const openProdModal = (prod?: Product) => {
    setEditingProd(prod ?? null);
    prodForm.resetFields();
    if (prod) {
      prodForm.setFieldsValue({
        name: prod.name,
        category_id: prod.category_id ?? undefined,
        unit: prod.unit,
        default_price: prod.default_price,
        image_url: prod.image_url ?? '',
        description: prod.description ?? '',
        is_active: prod.is_active,
        sort_order: prod.sort_order,
        specs: prod.specs?.map((s) => ({
          spec_name: s.spec_name,
          spec_value: s.spec_value,
          price_override: s.price_override,
        })) ?? [],
      });
    } else {
      prodForm.setFieldsValue({
        is_active: true,
        sort_order: 0,
        default_price: 0,
        category_id: selectedCatId ?? undefined,
        specs: [],
      });
    }
    setProdModalOpen(true);
  };

  const handleProdSubmit = async () => {
    try {
      const vals = await prodForm.validateFields();
      setProdSubmitting(true);
      const payload = {
        name: vals.name,
        category_id: vals.category_id ?? null,
        unit: vals.unit,
        default_price: vals.default_price,
        image_url: vals.image_url || null,
        description: vals.description || null,
        is_active: vals.is_active,
        sort_order: vals.sort_order ?? 0,
        specs: (vals.specs ?? []).map((s: any) => ({
          spec_name: s.spec_name,
          spec_value: s.spec_value,
          price_override: s.price_override ?? null,
        })),
      };
      if (editingProd) {
        await updateProduct(editingProd.id, payload);
        message.success('货品已更新');
      } else {
        await createProduct(payload);
        message.success('货品已创建');
      }
      setProdModalOpen(false);
      loadProducts(page, selectedCatId, keyword);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setProdSubmitting(false);
    }
  };

  const handleDeleteProd = async (id: number) => {
    try {
      await deleteProduct(id);
      message.success('货品已删除');
      loadProducts(page, selectedCatId, keyword);
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  /* ────────── product columns ────────── */
  const prodColumns: ColumnsType<Product> = [
    {
      title: '货品名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 160,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
      render: (v: string | null) => v ?? <span style={{ color: '#bbb' }}>未分类</span>,
    },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 70 },
    {
      title: '默认价格',
      dataIndex: 'default_price',
      key: 'default_price',
      width: 100,
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '规格数',
      key: 'specs_count',
      width: 80,
      render: (_: unknown, r: Product) => (
        <Tag color={r.specs?.length ? 'blue' : 'default'}>{r.specs?.length ?? 0}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openProdModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此货品？" onConfirm={() => handleDeleteProd(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ────────── category tree render ────────── */
  const treeData = categoriesToTreeData(categories);

  const categoryPanel = (
    <Card
      size="small"
      title={<span><AppstoreOutlined style={{ color: GREEN, marginRight: 6 }} />货品分类</span>}
      extra={
        <Button type="primary" size="small" ghost icon={<PlusOutlined />} style={{ borderColor: GREEN, color: GREEN }}
          onClick={() => openCatModal()}>
          新增
        </Button>
      }
      style={{ borderRadius: 8, height: '100%' }}
    >
      <Spin spinning={catLoading}>
        {treeData.length === 0 ? (
          <Empty description="暂无分类" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Tree
            showIcon
            blockNode
            selectedKeys={selectedCatId ? [selectedCatId] : []}
            treeData={treeData}
            onSelect={(keys) => {
              const id = keys.length ? (keys[0] as number) : null;
              setSelectedCatId(id);
              setPage(1);
            }}
            titleRender={(node) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ flex: 1 }}>{node.title as string}</span>
                <Space size={0} onClick={(e) => e.stopPropagation()}>
                  <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 12 }} />}
                    onClick={() => {
                      const cat = flatCats.find((c) => c.id === node.key);
                      if (cat) openCatModal(cat);
                    }}
                  />
                  <Popconfirm title="确定删除该分类？" onConfirm={() => handleDeleteCat(node.key as number)} okText="确定" cancelText="取消">
                    <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />} />
                  </Popconfirm>
                </Space>
              </div>
            )}
          />
        )}
        {selectedCatId && (
          <Button type="link" size="small" style={{ marginTop: 8, color: '#999' }}
            onClick={() => { setSelectedCatId(null); setPage(1); }}>
            清除筛选，查看全部
          </Button>
        )}
      </Spin>
    </Card>
  );

  const mobileCategorySelect = (
    <Select
      allowClear
      placeholder="按分类筛选"
      style={{ width: '100%', marginBottom: 12 }}
      value={selectedCatId ?? undefined}
      onChange={(v) => { setSelectedCatId(v ?? null); setPage(1); }}
      loading={catLoading}
      options={flatCats.map((c) => ({ value: c.id, label: c.parent_id ? `  └ ${c.name}` : c.name }))}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '4px 0' }} />
          <Button type="text" icon={<PlusOutlined />} style={{ width: '100%', color: GREEN }} onClick={() => openCatModal()}>
            新增分类
          </Button>
        </>
      )}
    />
  );

  /* ────────── product panel ────────── */
  const productPanel = (
    <Card size="small" style={{ borderRadius: 8, height: '100%' }}
      title={
        <span style={{ fontWeight: 600 }}>
          {selectedCatId ? `${flatCats.find((c) => c.id === selectedCatId)?.name ?? ''} - 货品列表` : '全部货品'}
        </span>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} style={{ background: GREEN, borderColor: GREEN }}
          onClick={() => openProdModal()}>
          新增货品
        </Button>
      }
    >
      {isMobile && mobileCategorySelect}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索货品名称"
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ flex: 1, minWidth: 160 }}
          allowClear
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}
          style={{ background: GREEN, borderColor: GREEN }}>
          搜索
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={prodColumns}
        dataSource={products}
        loading={prodLoading}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          showSizeChanger: false,
          onChange: (p) => setPage(p),
        }}
      />
    </Card>
  );

  /* ────────── category modal ────────── */
  const categoryModal = (
    <Modal
      title={editingCat ? '编辑分类' : '新增分类'}
      open={catModalOpen}
      onOk={handleCatSubmit}
      onCancel={() => setCatModalOpen(false)}
      okText="确定"
      cancelText="取消"
      destroyOnClose
      width={420}
    >
      <Form form={catForm} layout="vertical">
        <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
          <Input placeholder="如：蔬果类" />
        </Form.Item>
        <Form.Item name="parent_id" label="上级分类">
          <Select allowClear placeholder="无（顶级分类）"
            options={flatCats.filter((c) => c.id !== editingCat?.id).map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );

  /* ────────── product modal ────────── */
  const productModal = (
    <Modal
      title={editingProd ? '编辑货品' : '新增货品'}
      open={prodModalOpen}
      onOk={handleProdSubmit}
      onCancel={() => setProdModalOpen(false)}
      okText="确定"
      cancelText="取消"
      confirmLoading={prodSubmitting}
      destroyOnClose
      width={640}
    >
      <Form form={prodForm} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="name" label="货品名称" rules={[{ required: true, message: '请输入货品名称' }]}>
              <Input placeholder="如：番茄酱" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="category_id" label="所属分类">
              <Select allowClear placeholder="请选择分类"
                options={flatCats.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} sm={8}>
            <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请输入单位' }]}>
              <Input placeholder="kg / 箱 / 瓶" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="default_price" label="默认价格" rules={[{ required: true, message: '请输入价格' }]}>
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="sort_order" label="排序号">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={16}>
            <Form.Item name="image_url" label="图片URL">
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="is_active" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用"
                style={{ background: prodForm.getFieldValue('is_active') ? GREEN : undefined }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="货品描述（可选）" />
        </Form.Item>

        <Divider orientation="left" style={{ color: GREEN, borderColor: GREEN }}>
          规格列表
        </Divider>

        <Form.List name="specs">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                  <Col xs={8}>
                    <Form.Item {...rest} name={[name, 'spec_name']}
                      rules={[{ required: true, message: '名称' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="规格名" />
                    </Form.Item>
                  </Col>
                  <Col xs={8}>
                    <Form.Item {...rest} name={[name, 'spec_value']}
                      rules={[{ required: true, message: '值' }]} style={{ marginBottom: 0 }}>
                      <Input placeholder="规格值" />
                    </Form.Item>
                  </Col>
                  <Col xs={6}>
                    <Form.Item {...rest} name={[name, 'price_override']} style={{ marginBottom: 0 }}>
                      <InputNumber placeholder="覆盖价" min={0} precision={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={2} style={{ textAlign: 'center' }}>
                    <MinusCircleOutlined style={{ color: '#ff4d4f', fontSize: 18, cursor: 'pointer' }}
                      onClick={() => remove(name)} />
                  </Col>
                </Row>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />}
                style={{ borderColor: GREEN, color: GREEN }} onClick={() => add()}>
                添加规格
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );

  /* ────────── main render ────────── */
  return (
    <div style={{ height: '100%' }}>
      {isMobile ? (
        productPanel
      ) : (
        <Row gutter={16} style={{ height: '100%' }}>
          <Col span={6} style={{ minWidth: 220 }}>
            {categoryPanel}
          </Col>
          <Col span={18}>
            {productPanel}
          </Col>
        </Row>
      )}

      {categoryModal}
      {productModal}
    </div>
  );
};

export default ProductManage;
