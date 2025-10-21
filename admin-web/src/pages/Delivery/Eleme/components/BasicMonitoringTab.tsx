import React, { useState, useEffect } from 'react';
import { Card, Badge, Spin, Alert, Tag, DatePicker } from 'antd';
import {
  ShopOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  StarOutlined,
  MessageOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FrownOutlined,
  TrophyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import elemeApi from '../../../../api/eleme';
import AnomalyDetailModal from './AnomalyDetailModal';
import './BasicMonitoringTab.css';

/**
 * 基础运营监控
 * 监控门店基本运营指标（闭店、库存、超时等）
 */

interface AnomalyItem {
  key: string;
  type: string;
  icon: React.ReactNode;
  count: number;
  change: number;
  isUrgent: boolean;
  color: string;
}

interface UploadStatus {
  date: string;
  all_uploaded: boolean;
  upload_status: {
    [key: string]: {
      uploaded: boolean;
      import_time: string | null;
    };
  };
}

const BasicMonitoringTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [anomalyData, setAnomalyData] = useState<AnomalyItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs().subtract(1, 'day')); // 默认昨天
  
  // 详情弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<{
    type: string;
    name: string;
  } | null>(null);

  // 图标映射
  const iconMap: { [key: string]: React.ReactNode } = {
    store_closed: <ShopOutlined />,
    out_of_stock: <ShoppingOutlined />,
    overtime_orders: <ClockCircleOutlined />,
    reject_orders: <StopOutlined />,
    merchant_cancel: <CloseCircleOutlined />,
    merchant_refund: <RollbackOutlined />,
    low_score: <StarOutlined />,
    bad_reply: <MessageOutlined />,
    refund_orders: <DollarOutlined />,
    bad_reviews: <FrownOutlined />,
    low_growth_score: <TrophyOutlined />,
    fans_not_created: <TeamOutlined />,
  };

  // 计算总异常数
  const totalAnomalies = anomalyData.reduce((sum, item) => sum + item.count, 0);

  // 监听日期变化，加载数据
  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      
      // 并行加载数据上传状态和异常监控数据
      const [uploadRes, anomalyRes] = await Promise.all([
        elemeApi.getDataUploadStatus(dateStr),
        elemeApi.getAnomalyMonitor(dateStr),
      ]);

      // 处理数据上传状态
      if (uploadRes.data.code === 200) {
        setUploadStatus(uploadRes.data.data);
      }

      // 处理异常监控数据
      if (anomalyRes.data.code === 200) {
        const data = anomalyRes.data.data;
        
        // 将异常数据转换为组件所需格式
        const formattedData = data.anomalies.map((item: any) => ({
          key: item.key,
          type: item.type,
          icon: iconMap[item.key] || <WarningOutlined />,
          count: item.count,
          change: item.change,
          isUrgent: item.isUrgent,
          color: item.color,
        }));
        
        setAnomalyData(formattedData);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 数据类型名称映射
  const dataTypeNames: { [key: string]: string } = {
    store: '门店数据',
    order_shiheng: '订单数据(食亨)',
    order_eleme: '订单数据(饿了么)',
    product: '商品数据',
    review: '评价数据',
    growth: '商家成长数据',
    fans: '粉丝群数据',
  };

  // 禁用未来日期
  const disabledDate = (current: Dayjs) => {
    return current && current > dayjs().endOf('day');
  };

  // 点击卡片查看详情
  const handleCardClick = (item: AnomalyItem) => {
    setSelectedAnomaly({
      type: item.key,
      name: item.type,
    });
    setDetailModalVisible(true);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedAnomaly(null);
  };

  return (
    <div className="basic-monitoring-tab">
      {/* 日期选择器 */}
      <div className="date-selector" style={{ marginBottom: 24 }}>
        <span style={{ marginRight: 16, fontSize: 16, fontWeight: 500 }}>📅 选择日期：</span>
        <DatePicker
          value={selectedDate}
          onChange={(date) => date && setSelectedDate(date)}
          disabledDate={disabledDate}
          format="YYYY-MM-DD"
          allowClear={false}
          style={{ width: 200 }}
        />
        <span style={{ marginLeft: 16, color: '#8c8c8c' }}>
          数据日期：{selectedDate.format('YYYY年MM月DD日')}
        </span>
      </div>

      {/* 数据上传状态提示 */}
      {uploadStatus && (
        <div style={{ marginBottom: 24 }}>
          {uploadStatus.all_uploaded ? (
            <>
              <Alert
                message="数据状态正常"
                description={
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {uploadStatus.date} 数据已完成上传，数据看板已更新
                  </div>
                }
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 12 }}
              />
              <Alert
                message="门店筛选提示"
                description="📊 看板已按照【在营门店列表】自动过滤，只显示在营状态的门店异常数据"
                type="info"
                showIcon
              />
            </>
          ) : (
            <>
              <Alert
                message="数据上传未完成"
                description={
                  <div>
                    <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    {uploadStatus.date} 数据尚未完成上传，以下数据类型缺失：
                    <div style={{ marginTop: 8 }}>
                      {Object.entries(uploadStatus.upload_status).map(([key, status]) => (
                        !status.uploaded && (
                          <Tag key={key} color="orange" style={{ marginTop: 4 }}>
                            {dataTypeNames[key] || key}
                          </Tag>
                        )
                      ))}
                    </div>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
              <Alert
                message="门店筛选提示"
                description="📊 看板已按照【在营门店列表】自动过滤，只显示在营状态的门店异常数据"
                type="info"
                showIcon
              />
            </>
          )}
        </div>
      )}

      <Spin spinning={loading}>
        <div className="anomaly-monitor">
          {/* 左侧大圆球 - 总异常数 */}
          <div className="total-anomaly-circle">
            <div className="circle-content">
              <div className="anomaly-number">{totalAnomalies}</div>
              <div className="anomaly-label">门店异常</div>
            </div>
            <div className="circle-glow"></div>
          </div>

            {/* 右侧异常卡片列表 */}
            <div className="anomaly-cards">
              {anomalyData.map((item) => (
                <Card
                  key={item.key}
                  className={`anomaly-card ${item.count > 0 ? 'has-anomaly' : ''}`}
                  hoverable
                  onClick={() => handleCardClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                {/* 紧急标签 */}
                {item.isUrgent && item.count > 0 && (
                  <Badge.Ribbon text="紧急" color="red">
                    <div style={{ height: '100%' }}></div>
                  </Badge.Ribbon>
                )}

                <div className="card-header">
                  <div
                    className="card-icon"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <span className="card-title">{item.type}</span>
                </div>

                <div className="card-content">
                  <div className="anomaly-count">
                    <span className="count-number" style={{ color: item.count > 0 ? item.color : '#8c8c8c' }}>
                      {item.count}
                    </span>
                    <span className="count-unit">{(item as any).unit || '家'}</span>
                    <span className="count-arrow">›</span>
                  </div>

                  <div className="change-info">
                    <span className="change-label">比前一日</span>
                    <span
                      className={`change-value ${
                        item.change > 0 ? 'increase' : item.change < 0 ? 'decrease' : 'no-change'
                      }`}
                    >
                      {item.change > 0 ? `+${item.change}` : item.change}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Spin>

      {/* 提示信息 */}
      <div className="board-tips">
        <WarningOutlined style={{ marginRight: 8, color: '#faad14' }} />
        <span>数据每日自动更新，基于所选日期数据进行异常检测 · 点击卡片查看详细异常门店列表</span>
      </div>

      {/* 异常详情弹窗 */}
      {selectedAnomaly && (
        <AnomalyDetailModal
          visible={detailModalVisible}
          anomalyType={selectedAnomaly.type}
          anomalyName={selectedAnomaly.name}
          date={selectedDate.format('YYYY-MM-DD')}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default BasicMonitoringTab;

