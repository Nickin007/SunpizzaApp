import React, { useState } from 'react';
import { Calendar, Card, Badge, Empty } from 'antd';
import type { Dayjs } from 'dayjs';

/**
 * 日历面板标签页
 * 展示每日成本数据上传和计算状态
 */
const CostCalendarTab: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  // 获取日期的单元格渲染内容
  const dateCellRender = (value: Dayjs) => {
    // TODO: 根据日期获取成本数据状态
    // const listData = getCostDataByDate(value);
    return (
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {/* <li><Badge status="success" text="已解析" /></li> */}
      </ul>
    );
  };

  const onSelect = (date: Dayjs) => {
    setSelectedDate(date);
    console.log('选择日期:', date.format('YYYY-MM-DD'));
  };

  return (
    <div className="tab-content">
      <div className="tab-section">
        <h3 className="tab-section-title">成本数据日历</h3>
        <Card>
          <Calendar
            cellRender={dateCellRender}
            onSelect={onSelect}
          />
        </Card>
      </div>

      {selectedDate && (
        <div className="tab-section" style={{ marginTop: 24 }}>
          <h3 className="tab-section-title">
            {selectedDate.format('YYYY年MM月DD日')} - 详细数据
          </h3>
          <Card>
            <Empty
              description="该日期暂无成本数据"
              style={{ padding: '40px 0' }}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default CostCalendarTab;

