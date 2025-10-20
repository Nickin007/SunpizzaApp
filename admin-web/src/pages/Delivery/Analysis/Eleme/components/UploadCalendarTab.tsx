import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Spin, message, Tag, Row, Col, Statistic, Progress } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  MinusCircleOutlined,
  CloudUploadOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import elemeApi from '../../../../../api/eleme';
import type { ImportLog } from '../../../../../api/eleme';

// 数据类型配置
const DATA_TYPES = [
  { key: 'store', label: '门店数据', color: 'blue' },
  { key: 'order', label: '订单数据', color: 'green' },
  { key: 'product', label: '商品数据', color: 'orange' },
  { key: 'review', label: '评价数据', color: 'purple' },
  { key: 'growth', label: '商家成长数据', color: 'cyan' },
  { key: 'fans', label: '粉丝群数据', color: 'magenta' },
];

interface UploadStatus {
  [date: string]: {
    [dataType: string]: boolean; // true = 已上传成功, false = 未上传或失败
  };
}

/**
 * 上传日历Tab - 查看每天的数据上传状态
 */
const UploadCalendarTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // 加载导入历史数据
  const loadUploadHistory = async () => {
    try {
      setLoading(true);
      
      // 获取所有导入历史（可以考虑分页或日期范围限制）
      const response = await elemeApi.getImportLogs(1, 1000);
      console.log('📊 导入历史原始数据:', response.data);
      
      // 后端返回格式：{ code, data: { logs: [...], total, ... }, message }
      const resData = (response.data as any).data || response.data;
      const logs = resData.logs || [];
      console.log('📊 导入历史记录数:', logs.length);
      console.log('📊 导入历史records:', logs);
      
      // 处理数据，按日期和数据类型分组
      const status: UploadStatus = {};
      
      logs.forEach((log: ImportLog) => {
        console.log('🔍 处理记录:', {
          data_type: log.data_type,
          data_date: log.data_date,
          status: log.status,
          total_rows: log.total_rows,
          success_rows: log.success_rows,
        });
        
        // 只处理已完成的记录（有data_date的）
        if (log.status === 'completed' && log.data_date) {
          const dateKey = dayjs(log.data_date).format('YYYY-MM-DD');
          
          if (!status[dateKey]) {
            status[dateKey] = {};
          }
          
          // 判断是否上传成功：总行数 = 成功行数 且 成功行数 > 0
          const isSuccess = log.total_rows === log.success_rows && log.success_rows > 0;
          
          console.log(`✅ ${dateKey} - ${log.data_type}: ${isSuccess ? '成功' : '失败'}`);
          
          // 如果该日期该类型已经有成功记录，保持成功状态；否则记录当前状态
          if (status[dateKey][log.data_type] === undefined || isSuccess) {
            status[dateKey][log.data_type] = isSuccess;
          }
        } else {
          console.log('⏭️ 跳过记录（未完成或无日期）:', log);
        }
      });
      
      console.log('📅 最终上传状态:', status);
      setUploadStatus(status);
    } catch (error: any) {
      console.error('❌ 加载上传历史失败:', error);
      message.error(error.response?.data?.message || '加载上传历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUploadHistory();
    
    // 每30秒自动刷新
    const interval = setInterval(loadUploadHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // 计算统计数据
  const getStatistics = () => {
    let totalDays = 0;
    let totalUploads = 0;
    let successfulUploads = 0;
    let failedUploads = 0;
    let completelyUploadedDays = 0;

    Object.keys(uploadStatus).forEach((dateKey) => {
      totalDays++;
      const dayStatus = uploadStatus[dateKey];
      const uploaded = Object.values(dayStatus).filter((v) => v === true).length;
      const failed = Object.values(dayStatus).filter((v) => v === false).length;
      
      totalUploads += uploaded + failed;
      successfulUploads += uploaded;
      failedUploads += failed;
      
      if (uploaded === DATA_TYPES.length) {
        completelyUploadedDays++;
      }
    });

    return {
      totalDays,
      totalUploads,
      successfulUploads,
      failedUploads,
      completelyUploadedDays,
      successRate: totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0,
    };
  };

  // 渲染日历单元格内容（热图效果）
  const dateCellRender = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayStatus = uploadStatus[dateKey] || {};
    const uploadedCount = Object.values(dayStatus).filter((v) => v === true).length;
    const totalCount = DATA_TYPES.length;
    const completionRate = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0;
    
    // 根据完成度设置背景色（热图效果）
    const getBackgroundColor = (rate: number) => {
      if (rate === 100) return '#f6ffed'; // 全部完成 - 浅绿
      if (rate >= 66) return '#fffbe6'; // 大部分完成 - 浅黄
      if (rate >= 33) return '#fff7e6'; // 部分完成 - 浅橙
      if (rate > 0) return '#fff2e8'; // 少量完成 - 更浅橙
      return 'transparent'; // 未上传
    };

    const hasBorder = Object.keys(dayStatus).length > 0;
    
    return (
      <div 
        style={{ 
          padding: '8px 4px',
          minHeight: '130px',
          backgroundColor: getBackgroundColor(completionRate),
          borderRadius: '8px',
          border: hasBorder ? '1px solid #d9d9d9' : 'none',
          transition: 'all 0.3s ease',
          cursor: Object.keys(dayStatus).length > 0 ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (Object.keys(dayStatus).length > 0) {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* 进度圆环 */}
        {Object.keys(dayStatus).length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Progress
              type="circle"
              percent={completionRate}
              size={40}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              format={(percent) => (
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {uploadedCount}/{totalCount}
                </span>
              )}
            />
          </div>
        )}
        
        {/* 数据类型列表 */}
        {DATA_TYPES.map((dataType) => {
          const isUploaded = dayStatus[dataType.key] === true;
          const hasFailed = dayStatus[dataType.key] === false;
          
          return (
            <div
              key={dataType.key}
              style={{
                fontSize: '11px',
                lineHeight: '18px',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '3px',
                padding: '2px 4px',
                borderRadius: '4px',
                backgroundColor: isUploaded ? '#f6ffed' : hasFailed ? '#fff1f0' : 'transparent',
              }}
            >
              {isUploaded ? (
                <CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 4, fontSize: '14px' }} />
              ) : hasFailed ? (
                <CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 4, fontSize: '14px' }} />
              ) : (
                <MinusCircleOutlined style={{ marginRight: 4, color: '#d9d9d9', fontSize: '14px' }} />
              )}
              <span
                style={{
                  color: isUploaded ? '#52c41a' : hasFailed ? '#ff4d4f' : '#bfbfbf',
                  fontSize: '10px',
                  fontWeight: isUploaded ? 500 : 400,
                }}
              >
                {dataType.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染月份单元格内容（显示统计）
  const monthCellRender = (date: Dayjs) => {
    const month = date.format('YYYY-MM');
    let totalUploaded = 0;
    let totalDays = 0;

    // 统计该月的上传情况
    Object.keys(uploadStatus).forEach((dateKey) => {
      if (dateKey.startsWith(month)) {
        totalDays++;
        const dayStatus = uploadStatus[dateKey];
        const uploadedCount = Object.values(dayStatus).filter((v) => v === true).length;
        if (uploadedCount > 0) {
          totalUploaded++;
        }
      }
    });

    if (totalDays === 0) return null;

    return (
      <div style={{ textAlign: 'center', padding: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
          {totalUploaded}/{totalDays}
        </div>
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>天有数据</div>
      </div>
    );
  };

  // 选择日期
  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  // 渲染数据概览卡片
  const renderOverviewCards = () => {
    const stats = getStatistics();

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            bordered={false} 
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontSize: 14 }}>有数据天数</span>}
              value={stats.totalDays}
              suffix="天"
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}
              prefix={<CloudUploadOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontSize: 14 }}>总上传次数</span>}
              value={stats.totalUploads}
              suffix="次"
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}
              prefix={<CloudUploadOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontSize: 14 }}>成功上传</span>}
              value={stats.successfulUploads}
              suffix="次"
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            bordered={false}
            style={{ 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(250, 112, 154, 0.3)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontSize: 14 }}>成功率</span>}
              value={stats.successRate.toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染选中日期详情
  const renderDateDetail = () => {
    const dateKey = selectedDate.format('YYYY-MM-DD');
    const dayStatus = uploadStatus[dateKey] || {};
    const uploadedCount = Object.values(dayStatus).filter((v) => v === true).length;
    const totalCount = DATA_TYPES.length;
    const completionRate = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0;

    return (
      <Card
        bordered={false}
        style={{ 
          marginBottom: 24,
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              📅 {selectedDate.format('YYYY年MM月DD日')}
            </span>
            <Progress 
              percent={Number(completionRate.toFixed(1))} 
              size="small" 
              style={{ width: 200 }}
              strokeColor={{
                from: '#108ee9',
                to: '#87d068',
              }}
              format={(percent) => `${percent}%`}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {DATA_TYPES.map((dataType) => {
            const isUploaded = dayStatus[dataType.key] === true;
            const hasFailed = dayStatus[dataType.key] === false;
            
            return (
              <Tag
                key={dataType.key}
                color={isUploaded ? dataType.color : hasFailed ? 'error' : 'default'}
                icon={
                  isUploaded ? (
                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                  ) : hasFailed ? (
                    <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                  ) : (
                    <MinusCircleOutlined />
                  )
                }
                style={{ 
                  fontSize: 14, 
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: isUploaded ? 500 : 400,
                }}
              >
                {dataType.label}
              </Tag>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      <Spin spinning={loading}>
        {/* 数据概览卡片 */}
        {renderOverviewCards()}
        
        {/* 选中日期详情 */}
        {renderDateDetail()}
        
        {/* 日历主卡片 */}
        <Card
          bordered={false}
          style={{
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, fontWeight: 600 }}>📆 数据上传日历</span>
                <Tag color="blue" style={{ fontSize: 12 }}>热图模式</Tag>
              </div>
              
              <div style={{ fontSize: 13, color: '#8c8c8c', display: 'flex', gap: 16 }}>
                <span>
                  <CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 4 }} />
                  已上传
                </span>
                <span>
                  <CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 4 }} />
                  上传失败
                </span>
                <span>
                  <MinusCircleOutlined style={{ color: '#d9d9d9', marginRight: 4 }} />
                  未上传
                </span>
              </div>
            </div>
          }
        >
          <Calendar
            mode="month"
            cellRender={(date, info) => {
              if (info.type === 'date') {
                return dateCellRender(date);
              }
              if (info.type === 'month') {
                return monthCellRender(date);
              }
              return null;
            }}
            onSelect={onSelect}
            style={{
              background: '#fff',
              borderRadius: 12,
            }}
          />
          
          {/* 移除单元格内部滚动的样式 */}
          <style>{`
            .ant-picker-calendar-date-content {
              height: auto !important;
              overflow: visible !important;
            }
            .ant-picker-cell-inner {
              height: auto !important;
            }
            .ant-picker-calendar .ant-picker-cell {
              height: auto !important;
            }
          `}</style>
        </Card>
      </Spin>
    </div>
  );
};

export default UploadCalendarTab;

