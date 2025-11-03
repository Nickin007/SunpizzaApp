// 注意：使用此组件前需要安装: npm install echarts echarts-for-react
import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { CalculationResult } from '../types';

interface ChartsProps {
  result: CalculationResult;
}

/**
 * 成本结构饼图
 */
export const CostStructurePie: React.FC<{ data: CalculationResult }> = ({ data }) => {
  const option = {
    title: {
      text: '成本结构分析',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '成本结构',
        type: 'pie',
        radius: '50%',
        data: data.costStructure,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {d}%',
        },
      },
    ],
    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} />;
};

/**
 * 敏感性分析折线图（新版，更细致）
 */
export const SensitivityLines: React.FC<{ data: CalculationResult }> = ({ data }) => {
  const baseProfit = data.monthlyProfit;

  const option = {
    title: {
      text: '敏感性分析 - 利润对关键参数的敏感度',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = `变化: ${params[0].name}<br/>`;
        params.forEach((item: any) => {
          result += `${item.seriesName}: ¥${item.value.toFixed(2)}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['订单量变化', '单均收入变化', '成本率变化'],
      top: '30px',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '80px',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.sensitivity.orderCountChange.map(item => item.name),
      name: '参数变化',
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '月度利润（元）',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '订单量变化',
        type: 'line',
        data: data.sensitivity.orderCountChange.map(item => item.profit),
        smooth: true,
        itemStyle: {
          color: '#5470c6',
        },
        lineStyle: {
          width: 3,
        },
        markLine: {
          silent: true,
          data: [
            {
              yAxis: baseProfit,
              label: {
                formatter: '基准线',
                position: 'end',
              },
              lineStyle: {
                color: '#999',
                type: 'dashed',
              },
            },
            {
              yAxis: 0,
              label: {
                formatter: '盈亏平衡',
                position: 'end',
              },
              lineStyle: {
                color: '#ff4d4f',
                type: 'dashed',
              },
            },
          ],
        },
      },
      {
        name: '单均收入变化',
        type: 'line',
        data: data.sensitivity.avgIncomeChange.map(item => item.profit),
        smooth: true,
        itemStyle: {
          color: '#91cc75',
        },
        lineStyle: {
          width: 3,
        },
      },
      {
        name: '成本率变化',
        type: 'line',
        data: data.sensitivity.costRateChange.map(item => item.profit),
        smooth: true,
        itemStyle: {
          color: '#fac858',
        },
        lineStyle: {
          width: 3,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '500px' }} />;
};

/**
 * 收入来源结构图
 */
export const RevenueStructurePie: React.FC<{ data: CalculationResult }> = ({ data }) => {
  const option = {
    title: {
      text: '收入来源结构',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '收入来源',
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.revenueStructure,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {d}%',
        },
      },
    ],
    color: ['#5470c6', '#91cc75'],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} />;
};


/**
 * 多场景对比雷达图
 */
export const ScenarioRadar: React.FC<{ data: CalculationResult }> = ({ data }) => {
  const { optimistic, normal, pessimistic } = data.scenarios;

  // 归一化数据用于雷达图展示
  const maxRevenue = Math.max(optimistic.monthlyRevenue, normal.monthlyRevenue, pessimistic.monthlyRevenue);
  const maxProfit = Math.max(optimistic.monthlyProfit, normal.monthlyProfit, pessimistic.monthlyProfit);
  const maxROI = Math.max(optimistic.roiMonths, normal.roiMonths, pessimistic.roiMonths);
  const maxYearlyProfit = Math.max(optimistic.yearlyProfit, normal.yearlyProfit, pessimistic.yearlyProfit);
  const maxMargin = Math.max(optimistic.profitMargin, normal.profitMargin, pessimistic.profitMargin);

  const option = {
    title: {
      text: '多场景对比分析',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      data: ['乐观场景', '正常场景', '悲观场景'],
      top: '30px',
    },
    radar: {
      indicator: [
        { name: '月度营业额', max: maxRevenue },
        { name: '月度利润', max: maxProfit },
        { name: '年度利润', max: maxYearlyProfit },
        { name: '利润率%', max: maxMargin },
        { name: '回本月数', max: maxROI, inverse: true }, // inverse表示越小越好
      ],
    },
    series: [
      {
        name: '场景对比',
        type: 'radar',
        data: [
          {
            value: [
              optimistic.monthlyRevenue,
              optimistic.monthlyProfit,
              optimistic.yearlyProfit,
              optimistic.profitMargin,
              optimistic.roiMonths,
            ],
            name: '乐观场景',
            itemStyle: { color: '#52c41a' },
          },
          {
            value: [
              normal.monthlyRevenue,
              normal.monthlyProfit,
              normal.yearlyProfit,
              normal.profitMargin,
              normal.roiMonths,
            ],
            name: '正常场景',
            itemStyle: { color: '#1890ff' },
          },
          {
            value: [
              pessimistic.monthlyRevenue,
              pessimistic.monthlyProfit,
              pessimistic.yearlyProfit,
              pessimistic.profitMargin,
              pessimistic.roiMonths,
            ],
            name: '悲观场景',
            itemStyle: { color: '#ff4d4f' },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '500px' }} />;
};

const Charts: React.FC<ChartsProps> = ({ result }) => {
  return (
    <div>
      <CostStructurePie data={result} />
      <RevenueStructurePie data={result} />
      <SensitivityLines data={result} />
      <ScenarioRadar data={result} />
    </div>
  );
};

export default Charts;


