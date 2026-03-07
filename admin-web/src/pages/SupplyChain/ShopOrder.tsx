import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Button, InputNumber, Input, Badge, Tag, Select, Drawer, List, Empty, message, Modal, Divider, Space, Typography } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, MinusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { listCategories, shopListProducts, shopCreateOrder } from '../../api/supplyChain';
import type { ProductCategory, Product, ProductSpec } from '../../api/supplyChain';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Text, Title } = Typography;

interface CartItem {
  product_id: number;
  product_spec_id?: number;
  product_name: string;
  spec_info?: string;
  unit_price: number;
  quantity: number;
}

function flattenCategories(cats: ProductCategory[]): ProductCategory[] {
  const result: ProductCategory[] = [];
  for (const c of cats) {
    result.push(c);
    if (c.children?.length) result.push(...flattenCategories(c.children));
  }
  return result;
}

const ShopOrder: React.FC = () => {
  const isMobile = useIsMobile();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specProduct, setSpecProduct] = useState<Product | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<number | undefined>(undefined);

  useEffect(() => {
    listCategories(true).then(res => {
      const raw = res.data?.data || res.data || [];
      setCategories(flattenCategories(raw));
    }).catch(() => {});
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params: any = {};
    if (selectedCat) params.category_id = selectedCat;
    if (keyword.trim()) params.keyword = keyword.trim();
    shopListProducts(params)
      .then(res => {
        setProducts(res.data?.data || res.data || []);
      })
      .catch(() => message.error('加载商品失败'))
      .finally(() => setLoading(false));
  }, [selectedCat, keyword]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const addToCart = useCallback((product: Product, spec?: ProductSpec) => {
    setCart(prev => {
      const key = spec?.id
        ? prev.findIndex(c => c.product_id === product.id && c.product_spec_id === spec.id)
        : prev.findIndex(c => c.product_id === product.id && !c.product_spec_id);
      if (key >= 0) {
        const next = [...prev];
        next[key] = { ...next[key], quantity: next[key].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_spec_id: spec?.id,
          product_name: product.name,
          spec_info: spec ? `${spec.spec_name}: ${spec.spec_value}` : undefined,
          unit_price: spec?.price_override ?? product.default_price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const handleAddClick = useCallback((product: Product) => {
    if (product.specs && product.specs.length > 0) {
      setSpecProduct(product);
      setSelectedSpecId(product.specs[0].id);
      setSpecModalOpen(true);
    } else {
      addToCart(product);
      message.success(`已添加 ${product.name}`);
    }
  }, [addToCart]);

  const confirmSpec = useCallback(() => {
    if (!specProduct) return;
    const spec = specProduct.specs?.find(s => s.id === selectedSpecId);
    addToCart(specProduct, spec);
    message.success(`已添加 ${specProduct.name}${spec ? ` (${spec.spec_name}: ${spec.spec_value})` : ''}`);
    setSpecModalOpen(false);
    setSpecProduct(null);
    setSelectedSpecId(undefined);
  }, [specProduct, selectedSpecId, addToCart]);

  const updateQty = useCallback((index: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const submitOrder = useCallback(() => {
    if (cart.length === 0) {
      message.warning('购物车为空');
      return;
    }
    Modal.confirm({
      title: '确认提交订单',
      content: `共 ${cart.length} 种商品，合计 ¥${cartTotal.toFixed(2)}`,
      okText: '提交',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true);
        try {
          await shopCreateOrder({
            items: cart.map(c => ({
              product_id: c.product_id,
              product_spec_id: c.product_spec_id,
              quantity: c.quantity,
            })),
            remark: remark.trim() || undefined,
          });
          message.success('订单提交成功');
          setCart([]);
          setRemark('');
          setCartOpen(false);
        } catch {
          message.error('提交失败，请重试');
        } finally {
          setSubmitting(false);
        }
      },
    });
  }, [cart, cartTotal, remark]);

  // ──────────── Cart panel (shared between sidebar & drawer) ────────────
  const cartContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {cart.length === 0 ? (
          <Empty description="购物车为空" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 60 }} />
        ) : (
          <List
            dataSource={cart}
            renderItem={(item, idx) => (
              <List.Item style={{ padding: '10px 0', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong ellipsis style={{ maxWidth: 140 }}>{item.product_name}</Text>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(idx)}
                    />
                  </div>
                  {item.spec_info && (
                    <Tag color="blue" style={{ marginTop: 2, marginBottom: 4 }}>{item.spec_info}</Tag>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Space size={4}>
                      <Button
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => updateQty(idx, -1)}
                        style={{ width: 28, height: 28 }}
                      />
                      <InputNumber
                        min={1}
                        value={item.quantity}
                        size="small"
                        controls={false}
                        style={{ width: 44, textAlign: 'center' }}
                        onChange={val => {
                          if (val && val > 0) {
                            setCart(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], quantity: val };
                              return next;
                            });
                          }
                        }}
                      />
                      <Button
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => updateQty(idx, 1)}
                        style={{ width: 28, height: 28 }}
                      />
                    </Space>
                    <Text type="secondary">¥{(item.unit_price * item.quantity).toFixed(2)}</Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <Input.TextArea
          placeholder="备注（选填）"
          autoSize={{ minRows: 1, maxRows: 3 }}
          value={remark}
          onChange={e => setRemark(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text strong style={{ fontSize: 16 }}>合计</Text>
          <Text strong style={{ fontSize: 18, color: '#52c41a' }}>¥{cartTotal.toFixed(2)}</Text>
        </div>
        <Button
          type="primary"
          block
          size="large"
          loading={submitting}
          disabled={cart.length === 0}
          onClick={submitOrder}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
        >
          提交订单
        </Button>
      </div>
    </div>
  );

  // ──────────── Product card ────────────
  const renderProductCard = (product: Product) => {
    const price = product.default_price;
    const hasSpecs = product.specs && product.specs.length > 0;

    return (
      <Col xs={12} sm={12} md={6} lg={6} key={product.id}>
        <Card
          hoverable
          size="small"
          style={{ marginBottom: isMobile ? 8 : 16, borderRadius: 10, overflow: 'hidden' }}
          bodyStyle={{ padding: isMobile ? 10 : 16 }}
        >
          <Text strong style={{ fontSize: isMobile ? 14 : 15, display: 'block', marginBottom: 4 }} ellipsis>
            {product.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>单位: {product.unit}</Text>

          {hasSpecs && (
            <div style={{ margin: '6px 0 2px' }}>
              {product.specs!.map(s => (
                <Tag key={s.id} style={{ marginBottom: 4 }}>
                  {s.spec_name}: {s.spec_value}
                  {s.price_override != null && ` ¥${s.price_override}`}
                </Tag>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: 16 }}>
              ¥{price.toFixed(2)}
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddClick(product)}
              style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
            >
              加入
            </Button>
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* ── Main area ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: isMobile ? '8px 4px' : '0' }}>
        {/* Search bar */}
        <Input
          placeholder="搜索商品名称"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ marginBottom: 12, maxWidth: isMobile ? '100%' : 400 }}
        />

        {/* Category filter */}
        <div style={{ marginBottom: 12, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
          <Tag
            color={selectedCat === null ? '#52c41a' : undefined}
            onClick={() => setSelectedCat(null)}
            style={{ cursor: 'pointer', marginBottom: 4, padding: '2px 12px', borderRadius: 12 }}
          >
            全部
          </Tag>
          {categories.map(cat => (
            <Tag
              key={cat.id}
              color={selectedCat === cat.id ? '#52c41a' : undefined}
              onClick={() => setSelectedCat(cat.id)}
              style={{ cursor: 'pointer', marginBottom: 4, padding: '2px 12px', borderRadius: 12 }}
            >
              {cat.name}
            </Tag>
          ))}
        </div>

        {/* Product grid */}
        <Row gutter={isMobile ? 8 : 16}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Col xs={12} sm={12} md={6} lg={6} key={`skel-${i}`}>
                <Card loading size="small" style={{ marginBottom: isMobile ? 8 : 16, borderRadius: 10 }} />
              </Col>
            ))
          ) : products.length === 0 ? (
            <Col span={24}>
              <Empty description="暂无商品" style={{ marginTop: 80 }} />
            </Col>
          ) : (
            products.map(renderProductCard)
          )}
        </Row>
      </div>

      {/* ── Desktop cart sidebar ── */}
      {!isMobile && (
        <div
          style={{
            width: 300,
            flexShrink: 0,
            background: '#fff',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            height: 'fit-content',
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <ShoppingCartOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 8 }} />
            <Title level={5} style={{ margin: 0 }}>购物车</Title>
            <Badge count={cartCount} style={{ marginLeft: 8, backgroundColor: '#52c41a' }} />
          </div>
          {cartContent}
        </div>
      )}

      {/* ── Mobile floating button + drawer ── */}
      {isMobile && (
        <>
          <div
            onClick={() => setCartOpen(true)}
            style={{
              position: 'fixed',
              right: 20,
              bottom: 24,
              zIndex: 999,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#52c41a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(82,196,26,0.4)',
              cursor: 'pointer',
            }}
          >
            <Badge count={cartCount} offset={[-4, -4]} style={{ backgroundColor: '#ff4d4f' }}>
              <ShoppingCartOutlined style={{ fontSize: 26, color: '#fff' }} />
            </Badge>
          </div>

          <Drawer
            title={
              <Space>
                <ShoppingCartOutlined style={{ color: '#52c41a' }} />
                <span>购物车</span>
                <Badge count={cartCount} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            placement="bottom"
            height="70vh"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            bodyStyle={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}
          >
            {cartContent}
          </Drawer>
        </>
      )}

      {/* ── Spec selection modal ── */}
      <Modal
        title={`选择规格 - ${specProduct?.name || ''}`}
        open={specModalOpen}
        onCancel={() => {
          setSpecModalOpen(false);
          setSpecProduct(null);
        }}
        onOk={confirmSpec}
        okText="加入购物车"
        cancelText="取消"
        okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        width={360}
      >
        {specProduct?.specs && (
          <Select
            style={{ width: '100%' }}
            value={selectedSpecId}
            onChange={val => setSelectedSpecId(val)}
            options={specProduct.specs.map(s => ({
              label: `${s.spec_name}: ${s.spec_value} — ¥${(s.price_override ?? specProduct.default_price).toFixed(2)}`,
              value: s.id,
            }))}
          />
        )}
      </Modal>
    </div>
  );
};

export default ShopOrder;
