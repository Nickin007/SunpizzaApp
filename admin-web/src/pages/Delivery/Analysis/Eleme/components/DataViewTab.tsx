import React, { useState, useEffect } from 'react';
import { Tabs, Table, Tag, Space, Button, message, DatePicker, Select, Input, Form, Card } from 'antd';
import { ReloadOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import elemeApi from '../../../../../api/eleme';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// 数据类型枚举
const DATA_TYPES = {
  STORE: 'store',
  ORDER_SHIHENG: 'order_shiheng',
  ORDER_ELEME: 'order_eleme',
  PRODUCT: 'product',
  REVIEW: 'review',
  GROWTH: 'growth',
  FANS: 'fans',
};

// 数据类型显示名称
const DATA_TYPE_NAMES: Record<string, string> = {
  [DATA_TYPES.STORE]: '门店数据',
  [DATA_TYPES.ORDER_SHIHENG]: '订单数据（食亨）',
  [DATA_TYPES.ORDER_ELEME]: '订单数据（饿了么）',
  [DATA_TYPES.PRODUCT]: '商品数据',
  [DATA_TYPES.REVIEW]: '评价数据',
  [DATA_TYPES.GROWTH]: '商家成长数据',
  [DATA_TYPES.FANS]: '粉丝群数据',
};

/**
 * 数据查看Tab - 查看已上传的各类数据
 */
const DataViewTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(DATA_TYPES.STORE);
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // 查询条件
  const [form] = Form.useForm();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [storeList, setStoreList] = useState<string[]>([]);

  // 门店数据列定义（完整的90+个字段）
  const storeColumns: ColumnsType<any> = [
    // === 基础信息 ===
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 200,
      fixed: 'left',
    },
    {
      title: '门店编号',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 150,
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      width: 100,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    {
      title: '区县',
      dataIndex: 'district',
      key: 'district',
      width: 100,
    },
    {
      title: '门店地址',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      ellipsis: true,
    },
    {
      title: '首次营业时间',
      dataIndex: 'first_open_time',
      key: 'first_open_time',
      width: 160,
    },
    {
      title: '是否直营',
      dataIndex: 'is_direct',
      key: 'is_direct',
      width: 100,
    },
    
    // === 运营时长 ===
    {
      title: '营业时长',
      dataIndex: 'business_hours',
      key: 'business_hours',
      width: 120,
    },
    {
      title: '高峰期营业时长',
      dataIndex: 'peak_hours',
      key: 'peak_hours',
      width: 140,
    },
    {
      title: '异常关店时长',
      dataIndex: 'abnormal_close_hours',
      key: 'abnormal_close_hours',
      width: 140,
    },
    {
      title: '是否有效门店',
      dataIndex: 'is_valid_store',
      key: 'is_valid_store',
      width: 120,
    },
    
    // === 订单财务 ===
    {
      title: '有效订单',
      dataIndex: 'valid_orders',
      key: 'valid_orders',
      width: 100,
      align: 'right',
    },
    {
      title: '无效订单',
      dataIndex: 'invalid_orders',
      key: 'invalid_orders',
      width: 100,
      align: 'right',
    },
    {
      title: '商户原因无效订单',
      dataIndex: 'merchant_invalid_orders',
      key: 'merchant_invalid_orders',
      width: 160,
      align: 'right',
    },
    {
      title: '收入（元）',
      dataIndex: 'income',
      key: 'income',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '打包费（元）',
      dataIndex: 'packaging_fee',
      key: 'packaging_fee',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '平台技术服务费（元）',
      dataIndex: 'platform_service_fee',
      key: 'platform_service_fee',
      width: 160,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '配送费补贴（元）',
      dataIndex: 'delivery_subsidy',
      key: 'delivery_subsidy',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '履约技术服务费（元）',
      dataIndex: 'fulfillment_service_fee',
      key: 'fulfillment_service_fee',
      width: 160,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '退单费用（元）',
      dataIndex: 'refund_fee',
      key: 'refund_fee',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '顾客实付总额（元）',
      dataIndex: 'customer_payment_total',
      key: 'customer_payment_total',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '单均实付（元）',
      dataIndex: 'avg_payment_per_order',
      key: 'avg_payment_per_order',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '单均收入（元）',
      dataIndex: 'avg_income_per_order',
      key: 'avg_income_per_order',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    
    // === 营销漏斗 ===
    {
      title: '曝光人数',
      dataIndex: 'exposure_users',
      key: 'exposure_users',
      width: 100,
      align: 'right',
    },
    {
      title: '新客曝光人数',
      dataIndex: 'exposure_new_users',
      key: 'exposure_new_users',
      width: 120,
      align: 'right',
    },
    {
      title: '老客曝光人数',
      dataIndex: 'exposure_old_users',
      key: 'exposure_old_users',
      width: 120,
      align: 'right',
    },
    {
      title: '曝光次数',
      dataIndex: 'exposure_times',
      key: 'exposure_times',
      width: 100,
      align: 'right',
    },
    {
      title: '进店人数',
      dataIndex: 'visit_users',
      key: 'visit_users',
      width: 100,
      align: 'right',
    },
    {
      title: '新客进店人数',
      dataIndex: 'visit_new_users',
      key: 'visit_new_users',
      width: 120,
      align: 'right',
    },
    {
      title: '老客进店人数',
      dataIndex: 'visit_old_users',
      key: 'visit_old_users',
      width: 120,
      align: 'right',
    },
    {
      title: '进店次数',
      dataIndex: 'visit_times',
      key: 'visit_times',
      width: 100,
      align: 'right',
    },
    {
      title: '下单人数',
      dataIndex: 'order_users',
      key: 'order_users',
      width: 100,
      align: 'right',
    },
    {
      title: '新客下单人数',
      dataIndex: 'order_new_users',
      key: 'order_new_users',
      width: 120,
      align: 'right',
    },
    {
      title: '老客下单人数',
      dataIndex: 'order_old_users',
      key: 'order_old_users',
      width: 120,
      align: 'right',
    },
    {
      title: '下单次数',
      dataIndex: 'order_times',
      key: 'order_times',
      width: 100,
      align: 'right',
    },
    {
      title: '进店转化率(%)',
      dataIndex: 'visit_conversion_rate',
      key: 'visit_conversion_rate',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '新客进店转化率(%)',
      dataIndex: 'new_visit_conversion_rate',
      key: 'new_visit_conversion_rate',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '老客进店转化率(%)',
      dataIndex: 'old_visit_conversion_rate',
      key: 'old_visit_conversion_rate',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '下单转化率(%)',
      dataIndex: 'order_conversion_rate',
      key: 'order_conversion_rate',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '新客下单转化率(%)',
      dataIndex: 'new_order_conversion_rate',
      key: 'new_order_conversion_rate',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '老客下单转化率(%)',
      dataIndex: 'old_order_conversion_rate',
      key: 'old_order_conversion_rate',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 商品运营 ===
    {
      title: '上架商品数',
      dataIndex: 'online_products',
      key: 'online_products',
      width: 120,
      align: 'right',
    },
    {
      title: '有交易商品数',
      dataIndex: 'sold_products',
      key: 'sold_products',
      width: 130,
      align: 'right',
    },
    {
      title: '库存不足商品数',
      dataIndex: 'out_of_stock_products',
      key: 'out_of_stock_products',
      width: 140,
      align: 'right',
    },
    {
      title: '新上架商品数',
      dataIndex: 'new_products',
      key: 'new_products',
      width: 130,
      align: 'right',
    },
    {
      title: '活动商品数',
      dataIndex: 'promotion_products',
      key: 'promotion_products',
      width: 120,
      align: 'right',
    },
    {
      title: '满减活动订单数',
      dataIndex: 'discount_orders',
      key: 'discount_orders',
      width: 140,
      align: 'right',
    },
    {
      title: '近7日复购人数',
      dataIndex: 'repurchase_7d_users',
      key: 'repurchase_7d_users',
      width: 130,
      align: 'right',
    },
    {
      title: '近7日复购率(%)',
      dataIndex: 'repurchase_7d_rate',
      key: 'repurchase_7d_rate',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30日复购人数',
      dataIndex: 'repurchase_30d_users',
      key: 'repurchase_30d_users',
      width: 140,
      align: 'right',
    },
    {
      title: '近30日复购率(%)',
      dataIndex: 'repurchase_30d_rate',
      key: 'repurchase_30d_rate',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 服务质量 ===
    {
      title: '差评订单数',
      dataIndex: 'bad_review_orders',
      key: 'bad_review_orders',
      width: 120,
      align: 'right',
    },
    {
      title: '投诉订单数',
      dataIndex: 'complaint_orders',
      key: 'complaint_orders',
      width: 120,
      align: 'right',
    },
    {
      title: '投诉订单ID',
      dataIndex: 'complaint_order_ids',
      key: 'complaint_order_ids',
      width: 150,
      ellipsis: true,
    },
    {
      title: '出餐超时订单数',
      dataIndex: 'overtime_orders',
      key: 'overtime_orders',
      width: 140,
      align: 'right',
    },
    {
      title: '出餐超时订单ID',
      dataIndex: 'overtime_order_ids',
      key: 'overtime_order_ids',
      width: 160,
      ellipsis: true,
    },
    {
      title: '单均出餐时长(分)',
      dataIndex: 'avg_cooking_time',
      key: 'avg_cooking_time',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '拒单数',
      dataIndex: 'reject_orders',
      key: 'reject_orders',
      width: 100,
      align: 'right',
    },
    {
      title: '商责取消数',
      dataIndex: 'merchant_cancel_orders',
      key: 'merchant_cancel_orders',
      width: 120,
      align: 'right',
    },
    {
      title: '商责取消率(%)',
      dataIndex: 'merchant_cancel_rate',
      key: 'merchant_cancel_rate',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '商责退单数',
      dataIndex: 'merchant_refund_orders',
      key: 'merchant_refund_orders',
      width: 120,
      align: 'right',
    },
    {
      title: '商责退单率(%)',
      dataIndex: 'merchant_refund_rate',
      key: 'merchant_refund_rate',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '单均取餐时长(分)',
      dataIndex: 'avg_pickup_time',
      key: 'avg_pickup_time',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 评分 ===
    {
      title: '店铺评分',
      dataIndex: 'store_score',
      key: 'store_score',
      width: 100,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '满意度得分',
      dataIndex: 'satisfaction_score',
      key: 'satisfaction_score',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '味道得分',
      dataIndex: 'taste_score',
      key: 'taste_score',
      width: 100,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '包装得分',
      dataIndex: 'packaging_score',
      key: 'packaging_score',
      width: 100,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近60日评价 ===
    {
      title: '近60日好评率(%)',
      dataIndex: 'good_rate_60d',
      key: 'good_rate_60d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近60日好评数',
      dataIndex: 'good_count_60d',
      key: 'good_count_60d',
      width: 130,
      align: 'right',
    },
    {
      title: '近60日中评率(%)',
      dataIndex: 'medium_rate_60d',
      key: 'medium_rate_60d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近60日中评数',
      dataIndex: 'medium_count_60d',
      key: 'medium_count_60d',
      width: 130,
      align: 'right',
    },
    {
      title: '近60日差评率(%)',
      dataIndex: 'bad_rate_60d',
      key: 'bad_rate_60d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近60日差评数',
      dataIndex: 'bad_count_60d',
      key: 'bad_count_60d',
      width: 130,
      align: 'right',
    },
    {
      title: '近60日优质评价率(%)',
      dataIndex: 'quality_rate_60d',
      key: 'quality_rate_60d',
      width: 170,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近60日优质评价数',
      dataIndex: 'quality_count_60d',
      key: 'quality_count_60d',
      width: 150,
      align: 'right',
    },
    {
      title: '近60日订单评价率(%)',
      dataIndex: 'review_rate_60d',
      key: 'review_rate_60d',
      width: 170,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近60日订单评价数',
      dataIndex: 'review_count_60d',
      key: 'review_count_60d',
      width: 150,
      align: 'right',
    },
    {
      title: '近60日差评人工回复率(%)',
      dataIndex: 'bad_reply_rate_60d',
      key: 'bad_reply_rate_60d',
      width: 190,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近30日评价 ===
    {
      title: '近30天好评率(%)',
      dataIndex: 'good_rate_30d',
      key: 'good_rate_30d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30天好评数',
      dataIndex: 'good_count_30d',
      key: 'good_count_30d',
      width: 130,
      align: 'right',
    },
    {
      title: '近30天中评率(%)',
      dataIndex: 'medium_rate_30d',
      key: 'medium_rate_30d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30天中评数',
      dataIndex: 'medium_count_30d',
      key: 'medium_count_30d',
      width: 130,
      align: 'right',
    },
    {
      title: '近30天差评率(%)',
      dataIndex: 'bad_rate_30d',
      key: 'bad_rate_30d',
      width: 150,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30天差评数',
      dataIndex: 'bad_count_30d',
      key: 'bad_count_30d',
      width: 130,
      align: 'right',
    },
    {
      title: '近30天优质评价率(%)',
      dataIndex: 'quality_rate_30d',
      key: 'quality_rate_30d',
      width: 170,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30天优质评价数',
      dataIndex: 'quality_count_30d',
      key: 'quality_count_30d',
      width: 150,
      align: 'right',
    },
    {
      title: '近30天订单评价率(%)',
      dataIndex: 'review_rate_30d',
      key: 'review_rate_30d',
      width: 170,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '近30天订单评价数',
      dataIndex: 'review_count_30d',
      key: 'review_count_30d',
      width: 150,
      align: 'right',
    },
    {
      title: '近30天差评人工回复率(%)',
      dataIndex: 'bad_reply_rate_30d',
      key: 'bad_reply_rate_30d',
      width: 190,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
  ];

  // 订单数据列定义（完整的19个字段）
  const orderColumns: ColumnsType<any> = [
    {
      title: '订单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 200,
      fixed: 'left',
    },
    {
      title: '门店编号',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 150,
    },
    {
      title: '下单时间',
      dataIndex: 'order_time',
      key: 'order_time',
      width: 160,
    },
    {
      title: '订单状态',
      dataIndex: 'order_status',
      key: 'order_status',
      width: 100,
      render: (status: string) => {
        const color = status === '已完成' ? 'green' : status === '已退款' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '订单类型',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
    },
    {
      title: '出餐时间（分）',
      dataIndex: 'cooking_time',
      key: 'cooking_time',
      width: 120,
      align: 'center',
      render: (val: number) => val || '-',
    },
    {
      title: '出餐类型',
      dataIndex: 'cooking_type',
      key: 'cooking_type',
      width: 100,
    },
    {
      title: '就餐人数',
      dataIndex: 'guest_count',
      key: 'guest_count',
      width: 100,
      align: 'center',
    },
    {
      title: '商品信息',
      dataIndex: 'product_info',
      key: 'product_info',
      width: 300,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '取餐号',
      dataIndex: 'pickup_number',
      key: 'pickup_number',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '订单备注',
      dataIndex: 'order_note',
      key: 'order_note',
      width: 200,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '退款原因',
      dataIndex: 'refund_reason',
      key: 'refund_reason',
      width: 150,
      render: (val: string) => val || '-',
    },
    {
      title: '预计收入（元）',
      dataIndex: 'estimated_income',
      key: 'estimated_income',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '平台服务费（元）',
      dataIndex: 'platform_service_fee',
      key: 'platform_service_fee',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '其他费用（元）',
      dataIndex: 'other_fee',
      key: 'other_fee',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '配送费（元）',
      dataIndex: 'delivery_fee',
      key: 'delivery_fee',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
    {
      title: '优惠名称',
      dataIndex: 'discount_name',
      key: 'discount_name',
      width: 200,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '餐盒费（元）',
      dataIndex: 'package_fee',
      key: 'package_fee',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '0.00',
    },
  ];

  // 饿了么订单数据列定义（4列：日期、门店名称、订单单号、商品信息）
  const orderElemeColumns: ColumnsType<any> = [
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 200,
      fixed: 'left',
      render: (val: string) => val || '-',
    },
    {
      title: '订单单号',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 200,
    },
    {
      title: '商品信息',
      dataIndex: 'product_info',
      key: 'product_info',
      width: 400,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
  ];

  // 商品数据列定义（完整的24个字段）
  const productColumns: ColumnsType<any> = [
    // 基础信息
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '门店编号',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 120,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    
    // 商品属性
    {
      title: '是否新品',
      dataIndex: 'is_new_product',
      key: 'is_new_product',
      width: 100,
      render: (val: string) => (
        <Tag color={val === '是' ? 'green' : 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: '是否招牌',
      dataIndex: 'is_signature',
      key: 'is_signature',
      width: 100,
      render: (val: string) => (
        <Tag color={val === '是' ? 'gold' : 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: '是否套餐',
      dataIndex: 'is_combo',
      key: 'is_combo',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '是否配料',
      dataIndex: 'is_ingredient',
      key: 'is_ingredient',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '是否售罄',
      dataIndex: 'is_sold_out',
      key: 'is_sold_out',
      width: 100,
      render: (val: string) => (
        <Tag color={val === '是' ? 'red' : 'green'}>{val || '-'}</Tag>
      ),
    },
    
    // 销售数据
    {
      title: '销售额（元）',
      dataIndex: 'sales_amount',
      key: 'sales_amount',
      width: 120,
      align: 'right',
      render: (val: number) => `¥ ${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '销量',
      dataIndex: 'sales_volume',
      key: 'sales_volume',
      width: 100,
      align: 'right',
    },
    {
      title: '下单人数',
      dataIndex: 'order_user_count',
      key: 'order_user_count',
      width: 120,
      align: 'right',
    },
    {
      title: '带来订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 120,
      align: 'right',
    },
    {
      title: '订单交易额（元）',
      dataIndex: 'order_transaction_amount',
      key: 'order_transaction_amount',
      width: 150,
      align: 'right',
      render: (val: number) => `¥ ${val?.toFixed(2) || '0.00'}`,
    },
    
    // 复购数据
    {
      title: '近30日复购人数',
      dataIndex: 'repurchase_30d_users',
      key: 'repurchase_30d_users',
      width: 150,
      align: 'right',
    },
    {
      title: '近30日复购率（%）',
      dataIndex: 'repurchase_30d_rate',
      key: 'repurchase_30d_rate',
      width: 160,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // 新客数据
    {
      title: '新客人数',
      dataIndex: 'new_customer_count',
      key: 'new_customer_count',
      width: 120,
      align: 'right',
    },
    {
      title: '新客占比（%）',
      dataIndex: 'new_customer_ratio',
      key: 'new_customer_ratio',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // 用户行为数据
    {
      title: '曝光人数',
      dataIndex: 'exposure_users',
      key: 'exposure_users',
      width: 120,
      align: 'right',
    },
    {
      title: '点击人数',
      dataIndex: 'click_users',
      key: 'click_users',
      width: 120,
      align: 'right',
    },
    {
      title: '加购人数',
      dataIndex: 'add_to_cart_users',
      key: 'add_to_cart_users',
      width: 120,
      align: 'right',
    },
    {
      title: '加购率（%）',
      dataIndex: 'add_to_cart_rate',
      key: 'add_to_cart_rate',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '点赞数',
      dataIndex: 'like_count',
      key: 'like_count',
      width: 100,
      align: 'right',
    },
  ];

  // 评价数据列定义（完整的19个字段）
  const reviewColumns: ColumnsType<any> = [
    // 基础信息
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 180,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: '门店ID',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 120,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    
    // 订单与评价信息
    {
      title: '订单ID',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 180,
    },
    {
      title: '评价时间',
      dataIndex: 'review_time',
      key: 'review_time',
      width: 160,
    },
    
    // 评分数据
    {
      title: '总体评分',
      dataIndex: 'overall_score',
      key: 'overall_score',
      width: 100,
      align: 'center',
      render: (val: number) => (
        <Tag color={val >= 4 ? 'green' : val >= 3 ? 'orange' : 'red'}>
          {val?.toFixed(1) || '-'}
        </Tag>
      ),
    },
    {
      title: '味道评分',
      dataIndex: 'taste_score',
      key: 'taste_score',
      width: 100,
      align: 'center',
      render: (val: number) => val?.toFixed(1) || '-',
    },
    {
      title: '包装评分',
      dataIndex: 'packaging_score',
      key: 'packaging_score',
      width: 100,
      align: 'center',
      render: (val: number) => val?.toFixed(1) || '-',
    },
    {
      title: '配送评分',
      dataIndex: 'delivery_score',
      key: 'delivery_score',
      width: 100,
      align: 'center',
      render: (val: number) => val?.toFixed(1) || '-',
    },
    
    // 评价内容
    {
      title: '评价内容',
      dataIndex: 'review_content',
      key: 'review_content',
      width: 300,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '回复内容',
      dataIndex: 'reply_content',
      key: 'reply_content',
      width: 300,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    
    // 商品反馈
    {
      title: '点赞商品',
      dataIndex: 'liked_products',
      key: 'liked_products',
      width: 200,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    {
      title: '点踩商品',
      dataIndex: 'disliked_products',
      key: 'disliked_products',
      width: 200,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
    
    // 状态字段
    {
      title: '是否申诉成功',
      dataIndex: 'is_appeal_success',
      key: 'is_appeal_success',
      width: 120,
      align: 'center',
      render: (val: string) => (
        <Tag color={val === '是' ? 'green' : 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: '是否计入总分',
      dataIndex: 'is_counted_in_score',
      key: 'is_counted_in_score',
      width: 120,
      align: 'center',
      render: (val: string) => (
        <Tag color={val === '是' ? 'blue' : 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: '顾客是否会看到',
      dataIndex: 'is_visible_to_customer',
      key: 'is_visible_to_customer',
      width: 130,
      align: 'center',
      render: (val: string) => (
        <Tag color={val === '是' ? 'cyan' : 'default'}>{val || '-'}</Tag>
      ),
    },
    {
      title: '回评方式',
      dataIndex: 'reply_method',
      key: 'reply_method',
      width: 120,
      render: (val: string) => val || '-',
    },
    
    // 订单详情
    {
      title: '订单详情',
      dataIndex: 'order_details',
      key: 'order_details',
      width: 300,
      ellipsis: true,
      render: (val: string) => val || '-',
    },
  ];

  // 商家成长数据列定义（61个字段 - 分组展示）
  const growthColumns: ColumnsType<any> = [
    // === 基础信息 (8个字段) ===
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 180,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: '门店ID',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 120,
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      width: 100,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    {
      title: '区县',
      dataIndex: 'district',
      key: 'district',
      width: 100,
    },
    {
      title: '连锁名称',
      dataIndex: 'chain_name',
      key: 'chain_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
    },
    
    // === 店铺评级 (2个字段) ===
    {
      title: 'L等级',
      dataIndex: 'l_level',
      key: 'l_level',
      width: 100,
      render: (val: string) => <Tag color="blue">{val || '-'}</Tag>,
    },
    {
      title: '店铺分',
      dataIndex: 'store_score',
      key: 'store_score',
      width: 100,
      align: 'right',
      render: (val: number) => <Tag color={val >= 90 ? 'green' : val >= 80 ? 'orange' : 'red'}>{val?.toFixed(2) || '-'}</Tag>,
    },
    
    // === 近7日高峰营业时长 (4个字段) ===
    {
      title: '高峰时长当前',
      dataIndex: 'peak_hours_7d_current',
      key: 'peak_hours_7d_current',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '高峰时长目标',
      dataIndex: 'peak_hours_7d_target',
      key: 'peak_hours_7d_target',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '高峰时长得分',
      dataIndex: 'peak_hours_7d_score',
      key: 'peak_hours_7d_score',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '高峰时长权重',
      dataIndex: 'peak_hours_7d_weight',
      key: 'peak_hours_7d_weight',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近7日营业时长 (4个字段) ===
    {
      title: '营业时长当前',
      dataIndex: 'business_hours_7d_current',
      key: 'business_hours_7d_current',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '营业时长目标',
      dataIndex: 'business_hours_7d_target',
      key: 'business_hours_7d_target',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '营业时长得分',
      dataIndex: 'business_hours_7d_score',
      key: 'business_hours_7d_score',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '营业时长权重',
      dataIndex: 'business_hours_7d_weight',
      key: 'business_hours_7d_weight',
      width: 120,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日店装丰富度 (4个字段) ===
    {
      title: '店装丰富度当前',
      dataIndex: 'store_decoration_current',
      key: 'store_decoration_current',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '店装丰富度目标',
      dataIndex: 'store_decoration_target',
      key: 'store_decoration_target',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '店装丰富度得分',
      dataIndex: 'store_decoration_score',
      key: 'store_decoration_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '店装丰富度权重',
      dataIndex: 'store_decoration_weight',
      key: 'store_decoration_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日最低起送价 (4个字段) ===
    {
      title: '最低起送价当前',
      dataIndex: 'min_delivery_price_current',
      key: 'min_delivery_price_current',
      width: 140,
      align: 'right',
      render: (val: number) => `¥${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '最低起送价目标',
      dataIndex: 'min_delivery_price_target',
      key: 'min_delivery_price_target',
      width: 140,
      align: 'right',
      render: (val: number) => `¥${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '最低起送价得分',
      dataIndex: 'min_delivery_price_score',
      key: 'min_delivery_price_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '最低起送价权重',
      dataIndex: 'min_delivery_price_weight',
      key: 'min_delivery_price_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日服务功能丰富度 (4个字段) ===
    {
      title: '服务功能当前',
      dataIndex: 'service_features_current',
      key: 'service_features_current',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '服务功能目标',
      dataIndex: 'service_features_target',
      key: 'service_features_target',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '服务功能得分',
      dataIndex: 'service_features_score',
      key: 'service_features_score',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '服务功能权重',
      dataIndex: 'service_features_weight',
      key: 'service_features_weight',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日有效活动丰富度 (4个字段) ===
    {
      title: '活动丰富度当前',
      dataIndex: 'promotion_richness_current',
      key: 'promotion_richness_current',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '活动丰富度目标',
      dataIndex: 'promotion_richness_target',
      key: 'promotion_richness_target',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '活动丰富度得分',
      dataIndex: 'promotion_richness_score',
      key: 'promotion_richness_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '活动丰富度权重',
      dataIndex: 'promotion_richness_weight',
      key: 'promotion_richness_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近7日差评回复率 (4个字段) ===
    {
      title: '差评回复率当前',
      dataIndex: 'negative_reply_rate_7d_current',
      key: 'negative_reply_rate_7d_current',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '差评回复率目标',
      dataIndex: 'negative_reply_rate_7d_target',
      key: 'negative_reply_rate_7d_target',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '差评回复率得分',
      dataIndex: 'negative_reply_rate_7d_score',
      key: 'negative_reply_rate_7d_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '差评回复率权重',
      dataIndex: 'negative_reply_rate_7d_weight',
      key: 'negative_reply_rate_7d_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日商家评分 (4个字段) ===
    {
      title: '商家评分当前',
      dataIndex: 'merchant_rating_current',
      key: 'merchant_rating_current',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '商家评分目标',
      dataIndex: 'merchant_rating_target',
      key: 'merchant_rating_target',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '商家评分得分',
      dataIndex: 'merchant_rating_score',
      key: 'merchant_rating_score',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '商家评分权重',
      dataIndex: 'merchant_rating_weight',
      key: 'merchant_rating_weight',
      width: 130,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近7日在线联系回复率 (4个字段) ===
    {
      title: '在线回复率当前',
      dataIndex: 'online_reply_rate_7d_current',
      key: 'online_reply_rate_7d_current',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '在线回复率目标',
      dataIndex: 'online_reply_rate_7d_target',
      key: 'online_reply_rate_7d_target',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '在线回复率得分',
      dataIndex: 'online_reply_rate_7d_score',
      key: 'online_reply_rate_7d_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '在线回复率权重',
      dataIndex: 'online_reply_rate_7d_weight',
      key: 'online_reply_rate_7d_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日优质商品率 (4个字段) ===
    {
      title: '优质商品率当前',
      dataIndex: 'quality_product_rate_current',
      key: 'quality_product_rate_current',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '优质商品率目标',
      dataIndex: 'quality_product_rate_target',
      key: 'quality_product_rate_target',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '优质商品率得分',
      dataIndex: 'quality_product_rate_score',
      key: 'quality_product_rate_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '优质商品率权重',
      dataIndex: 'quality_product_rate_weight',
      key: 'quality_product_rate_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 昨日菜单丰富度 (4个字段) ===
    {
      title: '菜单丰富度当前',
      dataIndex: 'menu_richness_current',
      key: 'menu_richness_current',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '菜单丰富度目标',
      dataIndex: 'menu_richness_target',
      key: 'menu_richness_target',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '菜单丰富度得分',
      dataIndex: 'menu_richness_score',
      key: 'menu_richness_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '菜单丰富度权重',
      dataIndex: 'menu_richness_weight',
      key: 'menu_richness_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 商责取消率 (4个字段) ===
    {
      title: '商责取消率当前',
      dataIndex: 'merchant_cancel_rate_current',
      key: 'merchant_cancel_rate_current',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '商责取消率目标',
      dataIndex: 'merchant_cancel_rate_target',
      key: 'merchant_cancel_rate_target',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '商责取消率得分',
      dataIndex: 'merchant_cancel_rate_score',
      key: 'merchant_cancel_rate_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    {
      title: '商责取消率权重',
      dataIndex: 'merchant_cancel_rate_weight',
      key: 'merchant_cancel_rate_weight',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
    
    // === 近7日出餐完成上报率 (3个字段 - 无权重) ===
    {
      title: '出餐上报率当前',
      dataIndex: 'meal_report_rate_7d_current',
      key: 'meal_report_rate_7d_current',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '出餐上报率目标',
      dataIndex: 'meal_report_rate_7d_target',
      key: 'meal_report_rate_7d_target',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '出餐上报率得分',
      dataIndex: 'meal_report_rate_7d_score',
      key: 'meal_report_rate_7d_score',
      width: 140,
      align: 'right',
      render: (val: number) => val?.toFixed(2) || '-',
    },
  ];

  // === 粉丝群数据列定义 (37个字段) ===
  const fansColumns: ColumnsType<any> = [
    // === 基础信息 (4个字段) ===
    {
      title: '日期',
      dataIndex: 'data_date',
      key: 'data_date',
      width: 120,
      fixed: 'left',
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 180,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: '门店编号',
      dataIndex: 'store_id',
      key: 'store_id',
      width: 120,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 100,
    },
    
    // === 群基础信息 (3个字段) ===
    {
      title: '是否达到建群门槛',
      dataIndex: 'reach_threshold',
      key: 'reach_threshold',
      width: 150,
    },
    {
      title: '创建粉丝群类型',
      dataIndex: 'group_type',
      key: 'group_type',
      width: 150,
    },
    {
      title: '粉丝群数量',
      dataIndex: 'group_count',
      key: 'group_count',
      width: 120,
      align: 'right',
    },
    
    // === 粉丝统计 (11个字段) ===
    {
      title: '群粉丝人数',
      dataIndex: 'total_fans',
      key: 'total_fans',
      width: 120,
      align: 'right',
    },
    {
      title: '活跃粉丝人数',
      dataIndex: 'active_fans',
      key: 'active_fans',
      width: 130,
      align: 'right',
    },
    {
      title: '粉丝活跃率',
      dataIndex: 'fan_active_rate',
      key: 'fan_active_rate',
      width: 120,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '群访问粉丝人数',
      dataIndex: 'visit_fans',
      key: 'visit_fans',
      width: 140,
      align: 'right',
    },
    {
      title: '粉丝群访问率',
      dataIndex: 'fan_visit_rate',
      key: 'fan_visit_rate',
      width: 130,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '新入群粉丝人数',
      dataIndex: 'new_fans',
      key: 'new_fans',
      width: 140,
      align: 'right',
    },
    {
      title: '新入群粉丝占比',
      dataIndex: 'new_fan_ratio',
      key: 'new_fan_ratio',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '老粉丝群访问人数',
      dataIndex: 'old_visit_fans',
      key: 'old_visit_fans',
      width: 150,
      align: 'right',
    },
    {
      title: '老粉丝群访问率',
      dataIndex: 'old_fan_visit_rate',
      key: 'old_fan_visit_rate',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    {
      title: '退群粉丝数',
      dataIndex: 'quit_fans',
      key: 'quit_fans',
      width: 120,
      align: 'right',
    },
    {
      title: '退群粉丝占比',
      dataIndex: 'quit_fan_ratio',
      key: 'quit_fan_ratio',
      width: 130,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    
    // === 订单统计 (3个字段) ===
    {
      title: '粉丝群订单量',
      dataIndex: 'group_order_count',
      key: 'group_order_count',
      width: 130,
      align: 'right',
    },
    {
      title: '门店有效订单量',
      dataIndex: 'store_order_count',
      key: 'store_order_count',
      width: 140,
      align: 'right',
    },
    {
      title: '粉丝群订单占比',
      dataIndex: 'group_order_ratio',
      key: 'group_order_ratio',
      width: 140,
      align: 'right',
      render: (val: number) => `${val?.toFixed(2) || '0'}%`,
    },
    
    // === 入群礼 (2个字段) ===
    {
      title: '入群礼订单量',
      dataIndex: 'welcome_gift_orders',
      key: 'welcome_gift_orders',
      width: 130,
      align: 'right',
    },
    {
      title: '入群礼领取量',
      dataIndex: 'welcome_gift_received',
      key: 'welcome_gift_received',
      width: 130,
      align: 'right',
    },
    
    // === 群普通红包 (4个字段) ===
    {
      title: '群普通红包订单量',
      dataIndex: 'normal_redpack_orders',
      key: 'normal_redpack_orders',
      width: 150,
      align: 'right',
    },
    {
      title: '群普通红包领取人数',
      dataIndex: 'normal_redpack_receivers',
      key: 'normal_redpack_receivers',
      width: 160,
      align: 'right',
    },
    {
      title: '群普通红包使用人数',
      dataIndex: 'normal_redpack_users',
      key: 'normal_redpack_users',
      width: 160,
      align: 'right',
    },
    {
      title: '群普通红包领取量',
      dataIndex: 'normal_redpack_received',
      key: 'normal_redpack_received',
      width: 150,
      align: 'right',
    },
    
    // === 群口令红包 (4个字段) ===
    {
      title: '群口令红包订单量',
      dataIndex: 'password_redpack_orders',
      key: 'password_redpack_orders',
      width: 160,
      align: 'right',
    },
    {
      title: '群口令红包领取人数',
      dataIndex: 'password_redpack_receivers',
      key: 'password_redpack_receivers',
      width: 170,
      align: 'right',
    },
    {
      title: '群口令红包使用人数',
      dataIndex: 'password_redpack_users',
      key: 'password_redpack_users',
      width: 170,
      align: 'right',
    },
    {
      title: '群口令红包领取量',
      dataIndex: 'password_redpack_received',
      key: 'password_redpack_received',
      width: 160,
      align: 'right',
    },
    
    // === 群活跃度 (2个字段) ===
    {
      title: '活跃粉丝群数量',
      dataIndex: 'active_group_count',
      key: 'active_group_count',
      width: 140,
      align: 'right',
    },
    {
      title: '有商家发消息的粉丝群数量',
      dataIndex: 'merchant_message_group_count',
      key: 'merchant_message_group_count',
      width: 200,
      align: 'right',
    },
    
    // === 群配置 (4个字段) ===
    {
      title: '是否配置进群礼',
      dataIndex: 'has_welcome_gift',
      key: 'has_welcome_gift',
      width: 140,
    },
    {
      title: '发送群专属优惠券次数',
      dataIndex: 'send_coupon_times',
      key: 'send_coupon_times',
      width: 180,
      align: 'right',
    },
    {
      title: '发送推荐商品次数',
      dataIndex: 'send_product_times',
      key: 'send_product_times',
      width: 160,
      align: 'right',
    },
    {
      title: '是否配置群公告',
      dataIndex: 'has_announcement',
      key: 'has_announcement',
      width: 140,
    },
  ];

  // 通用空数据列（其他数据类型暂未实现）
  const placeholderColumns: ColumnsType<any> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '数据',
      dataIndex: 'data',
      key: 'data',
      render: () => '暂无数据',
    },
  ];

  // 根据数据类型选择列定义
  const getColumns = (): ColumnsType<any> => {
    switch (activeTab) {
      case DATA_TYPES.STORE:
        return storeColumns;
      case DATA_TYPES.ORDER_SHIHENG:
        return orderColumns;
      case DATA_TYPES.ORDER_ELEME:
        return orderElemeColumns;
      case DATA_TYPES.PRODUCT:
        return productColumns;
      case DATA_TYPES.REVIEW:
        return reviewColumns;
      case DATA_TYPES.GROWTH:
        return growthColumns;
      case DATA_TYPES.FANS:
        return fansColumns;
      default:
        return placeholderColumns;
    }
  };

  // 加载门店列表（用于下拉筛选）
  const loadStoreList = async () => {
    try {
      const response = await elemeApi.getActiveStores({});
      const resData = (response.data as any).data || response.data;
      const stores = (resData.stores || []) as Array<{ store_name: string }>;
      // 提取门店名称列表（去重）
      const names = [...new Set(stores.map((s) => s.store_name))].filter((name): name is string => typeof name === 'string');
      setStoreList(names);
    } catch (error) {
      console.error('加载门店列表失败:', error);
    }
  };

  // 构建查询参数
  const buildQueryParams = () => {
    const params: any = {};
    
    // 日期范围
    if (dateRange && dateRange.length === 2) {
      params.start_date = dateRange[0].format('YYYY-MM-DD');
      params.end_date = dateRange[1].format('YYYY-MM-DD');
    }
    
    // 门店名称
    if (storeName) {
      params.store_name = storeName;
    }
    
    return params;
  };

  // 加载数据
  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const queryParams = {
        page,
        per_page: pagination.pageSize,
        ...buildQueryParams(),
      };
      
      // 根据数据类型调用不同的API
      if (activeTab === DATA_TYPES.STORE) {
        // 门店数据API
        const response = await elemeApi.getStoreData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.ORDER_SHIHENG) {
        // 订单数据（食亨）API
        const response = await elemeApi.getOrderData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.ORDER_ELEME) {
        // 订单数据（饿了么）API
        const response = await elemeApi.getOrderElemeData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.PRODUCT) {
        // 商品数据API
        const response = await elemeApi.getProductData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.REVIEW) {
        // 评价数据API
        const response = await elemeApi.getReviewData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.GROWTH) {
        // 商家成长数据API
        const response = await elemeApi.getGrowthData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else if (activeTab === DATA_TYPES.FANS) {
        // 粉丝群数据API
        const response = await elemeApi.getFansData(queryParams);
        const resData = (response.data as any).data || response.data;
        setDataList(resData.data || []);
        setPagination({
          ...pagination,
          current: resData.page || page,
          total: resData.total || 0,
        });
      } else {
        // 其他数据类型暂时显示空数据
        message.info(`${DATA_TYPE_NAMES[activeTab]}功能开发中...`);
        setDataList([]);
        setPagination({ current: 1, pageSize: 50, total: 0 });
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载数据失败');
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载门店列表
  useEffect(() => {
    loadStoreList();
  }, []);

  // 切换Tab时重新加载数据
  useEffect(() => {
    loadData(1);
  }, [activeTab]);

  // Tab切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 查询
  const handleSearch = () => {
    // 重置到第一页并查询
    setPagination({ ...pagination, current: 1 });
    loadData(1);
  };

  // 重置查询条件
  const handleReset = () => {
    form.resetFields();
    setDateRange(null);
    setStoreName('');
    // 重置后自动查询
    setTimeout(() => {
      setPagination({ ...pagination, current: 1 });
      loadData(1);
    }, 0);
  };

  // 刷新数据
  const handleRefresh = () => {
    loadData(pagination.current);
  };

  // 分页变化
  const handleTableChange = (newPagination: any) => {
    loadData(newPagination.current);
  };

  // Tab配置
  const tabItems = [
    {
      key: DATA_TYPES.STORE,
      label: '🏪 门店数据',
      children: null,
    },
    {
      key: DATA_TYPES.ORDER_SHIHENG,
      label: '📋 订单数据（食亨）',
      children: null,
    },
    {
      key: DATA_TYPES.ORDER_ELEME,
      label: '📋 订单数据（饿了么）',
      children: null,
    },
    {
      key: DATA_TYPES.PRODUCT,
      label: '🛍️ 商品数据',
      children: null,
    },
    {
      key: DATA_TYPES.REVIEW,
      label: '⭐ 评价数据',
      children: null,
    },
    {
      key: DATA_TYPES.GROWTH,
      label: '📈 商家成长数据',
      children: null,
    },
    {
      key: DATA_TYPES.FANS,
      label: '👥 粉丝群数据',
      children: null,
    },
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* 数据类型Tab */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        tabBarStyle={{ marginBottom: 16 }}
      />

      {/* 查询表单 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item label="日期范围" name="dateRange">
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              format="YYYY-MM-DD"
              style={{ width: 260 }}
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>
          <Form.Item label="门店名称" name="storeName">
            <Select
              value={storeName || undefined}
              onChange={setStoreName}
              placeholder="请选择门店"
              allowClear
              showSearch
              style={{ width: 200 }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={storeList.map((name) => ({ label: name, value: name }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 统计信息 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          {(activeTab === DATA_TYPES.STORE || activeTab === DATA_TYPES.ORDER_SHIHENG || activeTab === DATA_TYPES.ORDER_ELEME || activeTab === DATA_TYPES.PRODUCT || activeTab === DATA_TYPES.REVIEW || activeTab === DATA_TYPES.GROWTH || activeTab === DATA_TYPES.FANS) && (
            <span style={{ color: '#8c8c8c', fontSize: 14 }}>
              共 {pagination.total} 条数据
            </span>
          )}
        </Space>
      </div>

      {/* 数据表格 */}
      <Table
        columns={getColumns()}
        dataSource={dataList}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ 
          x: activeTab === DATA_TYPES.STORE ? 11000 : 
             activeTab === DATA_TYPES.ORDER_SHIHENG ? 2800 : 
             activeTab === DATA_TYPES.ORDER_ELEME ? 1000 : 
             activeTab === DATA_TYPES.PRODUCT ? 3300 : 
             activeTab === DATA_TYPES.REVIEW ? 3100 : 
             activeTab === DATA_TYPES.GROWTH ? 8000 : 
             activeTab === DATA_TYPES.FANS ? 6000 : 
             1200, 
          y: 500 
        }}
        rowKey="id"
        size="small"
        bordered
      />
    </div>
  );
};

export default DataViewTab;

