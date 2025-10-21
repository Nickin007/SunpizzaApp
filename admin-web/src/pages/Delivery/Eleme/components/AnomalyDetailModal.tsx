import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Spin, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import elemeApi from '../../../../api/eleme';

/**
 * 异常详情弹窗
 * 显示特定异常类型的详细列表（门店/订单/评价）
 */

interface AnomalyDetailModalProps {
  visible: boolean;
  anomalyType: string;
  anomalyName: string;
  date: string;
  onClose: () => void;
}

const AnomalyDetailModal: React.FC<AnomalyDetailModalProps> = ({
  visible,
  anomalyType,
  anomalyName,
  date,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 加载异常详情数据
  useEffect(() => {
    if (visible && anomalyType) {
      loadAnomalyDetails();
    }
  }, [visible, anomalyType, date]);

  const loadAnomalyDetails = async () => {
    setLoading(true);
    try {
      const response = await elemeApi.getAnomalyDetails(anomalyType, date);
      if (response.data.code === 200) {
        const data = response.data.data;
        setDataList(data.data || []);
        setTotalCount(data.total_count || 0);
      }
    } catch (error) {
      console.error('加载异常详情失败:', error);
      message.error('加载异常详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据异常类型定义不同的表格列
  const getColumns = (): ColumnsType<any> => {
    // 前8个异常类型（门店数据）
    const store_anomaly_types = ['store_closed', 'out_of_stock', 'overtime_orders', 'reject_orders', 
                                   'merchant_cancel', 'merchant_refund', 'low_score', 'bad_reply'];
    
    // 粉丝群未创建异常（粉丝群数据）
    if (anomalyType === 'fans_not_created') {
      return [
        {
          title: '序号',
          key: 'index',
          width: 70,
          align: 'center',
          render: (_text, _record, index) => index + 1,
        },
        {
          title: '日期',
          dataIndex: 'data_date',
          key: 'data_date',
          width: 120,
          align: 'center',
        },
        {
          title: '门店名称',
          dataIndex: 'store_name',
          key: 'store_name',
          width: 300,
          ellipsis: true,
        },
        {
          title: '是否达到建群门槛',
          dataIndex: 'reach_threshold',
          key: 'reach_threshold',
          width: 150,
          align: 'center',
          render: (value) => (
            <Tag color={value === '是' ? 'green' : value === '否' ? 'red' : 'default'}>
              {value || '-'}
            </Tag>
          ),
        },
        {
          title: '创建粉丝群类型',
          dataIndex: 'group_type',
          key: 'group_type',
          width: 150,
          align: 'center',
          render: (value) => (
            <Tag color="orange">{value}</Tag>
          ),
        },
      ];
    }
    
    if (store_anomaly_types.includes(anomalyType)) {
      return [
        {
          title: '序号',
          key: 'index',
          width: 70,
          align: 'center',
          render: (_text, _record, index) => index + 1,
        },
        {
          title: '日期',
          dataIndex: 'data_date',
          key: 'data_date',
          width: 120,
          align: 'center',
        },
        {
          title: '门店名称',
          dataIndex: 'store_name',
          key: 'store_name',
          width: 300,
          ellipsis: true,
        },
        {
          title: '指标值',
          dataIndex: 'value',
          key: 'value',
          width: 150,
          align: 'center',
          render: (value) => {
            let color = 'red';
            if (anomalyType === 'bad_reply') {
              return <Tag color={color}>{(parseFloat(value) * 100).toFixed(1)}%</Tag>;
            }
            return <Tag color={color}>{value}</Tag>;
          },
        },
      ];
    }
    
    // 申请退款异常（订单数据）
    if (anomalyType === 'refund_orders') {
      return [
        {
          title: '序号',
          key: 'index',
          width: 60,
          align: 'center',
          fixed: 'left',
          render: (_text, _record, index) => index + 1,
        },
        {
          title: '订单号',
          dataIndex: 'order_id',
          key: 'order_id',
          width: 180,
          fixed: 'left',
        },
        {
          title: '门店名称',
          dataIndex: 'store_name',
          key: 'store_name',
          width: 200,
          ellipsis: true,
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
          render: (status) => <Tag>{status}</Tag>,
        },
        {
          title: '商品信息',
          dataIndex: 'product_info',
          key: 'product_info',
          width: 250,
          ellipsis: {
            showTitle: false,
          },
          render: (text) => (
            <Tooltip placement="topLeft" title={text}>
              {text}
            </Tooltip>
          ),
        },
        {
          title: '订单备注',
          dataIndex: 'order_note',
          key: 'order_note',
          width: 150,
          ellipsis: true,
        },
        {
          title: '退款原因',
          dataIndex: 'refund_reason',
          key: 'refund_reason',
          width: 200,
          render: (text) => <Tag color="red">{text}</Tag>,
        },
        {
          title: '预计收入',
          dataIndex: 'estimated_income',
          key: 'estimated_income',
          width: 120,
          align: 'right',
          render: (value) => `¥${value.toFixed(2)}`,
        },
      ];
    }
    
    // 顾客差评异常（评价数据）
    if (anomalyType === 'bad_reviews') {
      return [
        {
          title: '序号',
          key: 'index',
          width: 60,
          align: 'center',
          render: (_text, _record, index) => index + 1,
        },
        {
          title: '日期',
          dataIndex: 'data_date',
          key: 'data_date',
          width: 110,
          align: 'center',
        },
        {
          title: '门店名称',
          dataIndex: 'store_name',
          key: 'store_name',
          width: 200,
          ellipsis: true,
        },
        {
          title: '订单ID',
          dataIndex: 'order_id',
          key: 'order_id',
          width: 150,
        },
        {
          title: '评价时间',
          dataIndex: 'review_time',
          key: 'review_time',
          width: 160,
        },
        {
          title: '评分',
          dataIndex: 'overall_score',
          key: 'overall_score',
          width: 80,
          align: 'center',
          render: (score) => (
            <Tag color={score < 3 ? 'red' : score < 4 ? 'orange' : 'yellow'}>
              {score} 分
            </Tag>
          ),
        },
        {
          title: '评价内容',
          dataIndex: 'review_content',
          key: 'review_content',
          width: 300,
          ellipsis: {
            showTitle: false,
          },
          render: (text) => (
            <Tooltip placement="topLeft" title={text}>
              {text || '-'}
            </Tooltip>
          ),
        },
        {
          title: '是否申诉成功',
          dataIndex: 'is_appeal_success',
          key: 'is_appeal_success',
          width: 120,
          align: 'center',
          render: (value) => (
            <Tag color={value === '是' ? 'green' : 'default'}>
              {value || '-'}
            </Tag>
          ),
        },
      ];
    }
    
    // 低店铺分异常（商家成长数据）
    if (anomalyType === 'low_growth_score') {
      // 基础列
      const baseColumns: ColumnsType<any> = [
        {
          title: '序号',
          key: 'index',
          width: 60,
          align: 'center',
          fixed: 'left',
          render: (_text, _record, index) => index + 1,
        },
        {
          title: '日期',
          dataIndex: 'data_date',
          key: 'data_date',
          width: 110,
          align: 'center',
          fixed: 'left',
        },
        {
          title: '门店名称',
          dataIndex: 'store_name',
          key: 'store_name',
          width: 200,
          ellipsis: true,
          fixed: 'left',
        },
        {
          title: '店铺分',
          dataIndex: 'store_score',
          key: 'store_score',
          width: 100,
          align: 'center',
          render: (score) => (
            <Tag color="red">{score}</Tag>
          ),
        },
      ];
      
      // 13个可选得分项
      const scoreFields = [
        { key: 'peak_hours_7d_score', name: '高峰时长得分' },
        { key: 'business_hours_7d_score', name: '营业时长得分' },
        { key: 'store_decoration_score', name: '店装丰富度得分' },
        { key: 'min_delivery_price_score', name: '最低起送价得分' },
        { key: 'service_features_score', name: '服务功能得分' },
        { key: 'promotion_richness_score', name: '活动丰富度得分' },
        { key: 'negative_reply_rate_7d_score', name: '差评回复率得分' },
        { key: 'merchant_rating_score', name: '商家评分得分' },
        { key: 'online_reply_rate_7d_score', name: '在线回复率得分' },
        { key: 'quality_product_rate_score', name: '优质商品率得分' },
        { key: 'menu_richness_score', name: '菜单丰富度得分' },
        { key: 'merchant_cancel_rate_score', name: '商责取消率得分' },
        { key: 'meal_report_rate_7d_score', name: '出餐上报率得分' },
      ];
      
      // 动态添加得分列（只添加数据中存在的字段）
      scoreFields.forEach((field) => {
        // 检查数据中是否有这个字段
        const hasField = dataList.some(item => field.key in item);
        if (hasField) {
          baseColumns.push({
            title: field.name,
            dataIndex: field.key,
            key: field.key,
            width: 120,
            align: 'center',
            render: (score) => score !== undefined ? <Tag color="orange">{score}</Tag> : '-',
          });
        }
      });
      
      return baseColumns;
    }
    
    // 默认列
    return [];
  };

  // 获取表格宽度配置
  const getScrollX = () => {
    if (anomalyType === 'refund_orders') return 1500;
    if (anomalyType === 'bad_reviews') return 1400;
    if (anomalyType === 'low_growth_score') return 2000;
    if (anomalyType === 'fans_not_created') return 900;
    return 800;
  };

  // 获取单位显示
  const getUnit = () => {
    if (anomalyType === 'refund_orders') return '单';
    if (anomalyType === 'bad_reviews') return '条';
    return '家';
  };

  return (
    <Modal
      title={
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {anomalyName} - 异常详情
          <Tag color="red" style={{ marginLeft: 16, fontSize: 14 }}>
            共 {totalCount} {getUnit()}
          </Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={anomalyType === 'low_growth_score' ? 1200 : 1000}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16, color: '#8c8c8c' }}>
          数据日期：{date}
        </div>
        <Table
          columns={getColumns()}
          dataSource={dataList}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: getScrollX(), y: 500 }}
          size="small"
        />
      </Spin>
    </Modal>
  );
};

export default AnomalyDetailModal;
