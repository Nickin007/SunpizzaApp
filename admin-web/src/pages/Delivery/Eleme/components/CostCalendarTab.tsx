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
import elemeApi from '@/api/eleme';
import costAnalysisApi from '@/api/costAnalysis';
import type { ImportLog } from '@/api/eleme';

// 成本分析数据类型配置
const COST_DATA_TYPES = [
  { key: 'order_shiheng', label: '订单数据（食亨）', color: 'green' },
  { key: 'order_eleme', label: '订单数据（饿了么）', color: 'lime' },
  { key: 'order_integration', label: '订单整合', color: 'blue' },
  { key: 'product_mapping', label: '单品映射', color: 'orange' },
  { key: 'cost_mapping', label: '成本映射', color: 'purple' },
];

interface CostStatus {
  [date: string]: {
    [dataType: string]: boolean; // true = 已完成, false = 未完成或失败
  };
}

/**
 * 成本分析日历Tab - 查看每天的成本分析任务状态
 */
const CostCalendarTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [costStatus, setCostStatus] = useState<CostStatus>({});
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  // 加载成本分析任务状态
  const loadCostStatus = async () => {
    try {
      setLoading(true);
      
      // 获取所有导入历史
      const response = await elemeApi.getImportLogs(1, 1000);
      const resData = (response.data as any).data || response.data;
      const logs = resData.logs || [];
      
      // 定义有效的数据类型（只统计这5种）
      const validDataTypes = COST_DATA_TYPES.map(dt => dt.key);
      
      // 处理数据，按日期和数据类型分组
      const status: CostStatus = {};
      
      logs.forEach((log: ImportLog) => {
        // 只处理已完成的记录（有data_date的）且数据类型在定义范围内
        if (log.status === 'completed' && log.data_date && validDataTypes.includes(log.data_type)) {
          const dateKey = dayjs(log.data_date).format('YYYY-MM-DD');
          
          if (!status[dateKey]) {
            status[dateKey] = {};
          }
          
          // 判断是否上传成功：总行数 = 成功行数 且 成功行数 > 0
          const isSuccess = log.total_rows === log.success_rows && log.success_rows > 0;
          
          // 如果该日期该类型已经有成功记录，保持成功状态；否则记录当前状态
          if (status[dateKey][log.data_type] === undefined || isSuccess) {
            status[dateKey][log.data_type] = isSuccess;
          }
        }
      });
      
      // 获取订单整合状态
      try {
        const integrationResponse = await costAnalysisApi.getIntegrationStatus();
        const integrationData = (integrationResponse.data as any).data || integrationResponse.data;
        const integrationDates = integrationData.dates || [];
        
        // 将订单整合日期标记为已完成
        integrationDates.forEach((dateStr: string) => {
          // 支持多种日期格式
          let dateKey: string;
          if (dateStr.includes('/')) {
            // 2025/10/27 格式
            dateKey = dayjs(dateStr, 'YYYY/MM/DD').format('YYYY-MM-DD');
          } else if (dateStr.length === 8 && !dateStr.includes('-')) {
            // 20251027 格式
            dateKey = dayjs(dateStr, 'YYYYMMDD').format('YYYY-MM-DD');
          } else {
            // 2025-10-27 格式或其他dayjs能识别的格式
            dateKey = dayjs(dateStr).format('YYYY-MM-DD');
          }
          
          if (!status[dateKey]) {
            status[dateKey] = {};
          }
          status[dateKey]['order_integration'] = true;
        });
      } catch (error) {
        console.warn('Failed to load integration status:', error);
      }
      
      // 获取单品映射状态
      try {
        const mappingResponse = await costAnalysisApi.getMappingStatus();
        const mappingData = (mappingResponse.data as any).data || mappingResponse.data;
        const mappingDates = mappingData.dates || [];
        
        // 将单品映射日期标记为已完成
        mappingDates.forEach((dateStr: string) => {
          // 支持多种日期格式
          let dateKey: string;
          if (dateStr.includes('/')) {
            // 2025/10/27 格式
            dateKey = dayjs(dateStr, 'YYYY/MM/DD').format('YYYY-MM-DD');
          } else if (dateStr.length === 8 && !dateStr.includes('-')) {
            // 20251027 格式
            dateKey = dayjs(dateStr, 'YYYYMMDD').format('YYYY-MM-DD');
          } else {
            // 2025-10-27 格式或其他dayjs能识别的格式
            dateKey = dayjs(dateStr).format('YYYY-MM-DD');
          }
          
          if (!status[dateKey]) {
            status[dateKey] = {};
          }
          status[dateKey]['product_mapping'] = true;
        });
      } catch (error) {
        console.warn('Failed to load mapping status:', error);
      }
      
      // 获取成本映射状态
      try {
        const costMappingResponse = await costAnalysisApi.getCostMappingStatus();
        const costMappingData = (costMappingResponse.data as any).data || costMappingResponse.data;
        const costMappingDates = costMappingData.dates || [];
        
        // 将成本映射日期标记为已完成
        costMappingDates.forEach((dateStr: string) => {
          // 支持多种日期格式
          let dateKey: string;
          if (dateStr.includes('/')) {
            // 2025/10/27 格式
            dateKey = dayjs(dateStr, 'YYYY/MM/DD').format('YYYY-MM-DD');
          } else if (dateStr.length === 8 && !dateStr.includes('-')) {
            // 20251027 格式
            dateKey = dayjs(dateStr, 'YYYYMMDD').format('YYYY-MM-DD');
          } else {
            // 2025-10-27 格式或其他dayjs能识别的格式
            dateKey = dayjs(dateStr).format('YYYY-MM-DD');
          }
          
          if (!status[dateKey]) {
            status[dateKey] = {};
          }
          status[dateKey]['cost_mapping'] = true;
        });
      } catch (error) {
        console.warn('Failed to load cost mapping status:', error);
      }
      
      setCostStatus(status);
    } catch (error: any) {
      console.error('❌ 加载成本任务状态失败:', error);
      message.error(error.response?.data?.message || '加载任务状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCostStatus();
    
    // 每30秒自动刷新
    const interval = setInterval(loadCostStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 计算统计数据
  const getStatistics = () => {
    let totalDays = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;
    let fullyCompletedDays = 0;

    Object.keys(costStatus).forEach((dateKey) => {
      totalDays++;
      const dayStatus = costStatus[dateKey];
      const completed = Object.values(dayStatus).filter((v) => v === true).length;
      const failed = Object.values(dayStatus).filter((v) => v === false).length;
      
      totalTasks += COST_DATA_TYPES.length; // 固定5个任务
      completedTasks += completed;
      failedTasks += failed;
      
      // 所有5个任务都完成才算完全完成
      if (completed === COST_DATA_TYPES.length) {
        fullyCompletedDays++;
      }
    });

    return {
      totalDays,
      totalTasks,
      completedTasks,
      failedTasks,
      fullyCompletedDays,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  };

  // 渲染日历单元格内容（热图效果）
  const dateCellRender = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayStatus = costStatus[dateKey] || {};
    const completedCount = Object.values(dayStatus).filter((v) => v === true).length;
    const totalCount = COST_DATA_TYPES.length; // 固定5个任务
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    // 根据完成度设置背景色（热图效果）
    const getBackgroundColor = (rate: number) => {
      if (rate === 100) return '#f6ffed'; // 全部完成 - 浅绿
      if (rate >= 66) return '#fffbe6'; // 大部分完成 - 浅黄
      if (rate >= 33) return '#fff7e6'; // 部分完成 - 浅橙
      if (rate > 0) return '#fff2e8'; // 少量完成 - 更浅橙
      return 'transparent'; // 未完成
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
                  {completedCount}/{totalCount}
                </span>
              )}
            />
          </div>
        )}
        
        {/* 任务类型列表 */}
        {COST_DATA_TYPES.map((dataType) => {
          const isCompleted = dayStatus[dataType.key] === true;
          const hasFailed = dayStatus[dataType.key] === false;
          const hasData = dayStatus[dataType.key] !== undefined;
          
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
                backgroundColor: isCompleted ? '#f6ffed' : hasFailed ? '#fff1f0' : 'transparent',
              }}
            >
              {isCompleted ? (
                <CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 4, fontSize: '14px' }} />
              ) : hasFailed ? (
                <CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 4, fontSize: '14px' }} />
              ) : (
                <MinusCircleOutlined style={{ marginRight: 4, color: '#d9d9d9', fontSize: '14px' }} />
              )}
              <span
                style={{
                  color: isCompleted ? '#52c41a' : hasFailed ? '#ff4d4f' : '#bfbfbf',
                  fontSize: '10px',
                  fontWeight: isCompleted ? 500 : 400,
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
    let totalCompleted = 0;
    let totalDays = 0;

    // 统计该月的完成情况
    Object.keys(costStatus).forEach((dateKey) => {
      if (dateKey.startsWith(month)) {
        totalDays++;
        const dayStatus = costStatus[dateKey];
        const completedCount = Object.values(dayStatus).filter((v) => v === true).length;
        if (completedCount > 0) {
          totalCompleted++;
        }
      }
    });

    if (totalDays === 0) return null;

    return (
      <div style={{ textAlign: 'center', padding: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
          {totalCompleted}/{totalDays}
        </div>
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>天有任务</div>
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
              title={<span style={{ color: '#fff', fontSize: 14 }}>有任务天数</span>}
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
              title={<span style={{ color: '#fff', fontSize: 14 }}>总任务数</span>}
              value={stats.totalTasks}
              suffix="个"
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
              title={<span style={{ color: '#fff', fontSize: 14 }}>已完成任务</span>}
              value={stats.completedTasks}
              suffix="个"
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
              title={<span style={{ color: '#fff', fontSize: 14 }}>完成率</span>}
              value={stats.completionRate.toFixed(1)}
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
    const dayStatus = costStatus[dateKey] || {};
    const completedCount = Object.values(dayStatus).filter((v) => v === true).length;
    const totalCount = COST_DATA_TYPES.length; // 固定5个任务
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
          {COST_DATA_TYPES.map((dataType) => {
            const isCompleted = dayStatus[dataType.key] === true;
            const hasFailed = dayStatus[dataType.key] === false;
            const hasData = dayStatus[dataType.key] !== undefined;
            
            return (
              <Tag
                key={dataType.key}
                color={isCompleted ? dataType.color : hasFailed ? 'error' : 'default'}
                icon={
                  isCompleted ? (
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
                  fontWeight: isCompleted ? 500 : 400,
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
                <span style={{ fontSize: 20, fontWeight: 600 }}>📆 成本分析任务日历</span>
                <Tag color="blue" style={{ fontSize: 12 }}>热图模式</Tag>
              </div>
              
              <div style={{ fontSize: 13, color: '#8c8c8c', display: 'flex', gap: 16 }}>
                <span>
                  <CheckCircleTwoTone twoToneColor="#52c41a" style={{ marginRight: 4 }} />
                  已完成
                </span>
                <span>
                  <CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ marginRight: 4 }} />
                  失败/未完成
                </span>
                <span>
                  <MinusCircleOutlined style={{ color: '#d9d9d9', marginRight: 4 }} />
                  未开始
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

export default CostCalendarTab;
