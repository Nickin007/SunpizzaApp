import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import InputForm from './components/InputForm';
import ResultPanel from './components/ResultPanel';
import type { InputData, CalculationResult } from './types';
import { calculateAll } from './utils/calculator';
import './index.css';

// 默认输入数据
const defaultInputData: InputData = {
  initialInvestment: {
    yearlyRent: 100000,
    decorationCost: 80000,
    equipmentCost: 50000,
    franchiseFee: 30000,
    deposit: 20000,
    rentDeposit: 20000,
    licenseFee: 5000,
    initialMaterialCost: 10000,
    marketingCost: 10000,
  },
  monthlyCost: {
    employeeSalary: 15000,
    ownerSalary: 8000,
    utilitiesCost: 3000,
    propertyFee: 2000,
    systemMaintenanceFee: 500,
    cpcRate: 5,
    cpsRate: 3,
    brandManagementRate: 2,
  },
  salesProjection: {
    delivery: {
      holidayOrderCount: 50,      // 节假日/旺季日均订单量
      holidayAvgIncome: 80,        // 节假日/旺季单均收入
      weekdayOrderCount: 30,       // 淡季工作日日均订单量
      weekdayAvgIncome: 75,        // 淡季工作日单均收入
    },
    pickup: {
      holidayOrderCount: 20,
      holidayAvgIncome: 90,
      weekdayOrderCount: 10,
      weekdayAvgIncome: 85,
    },
    peakSeasonMonths: 4,           // 旺季4个月（一年中）
    lowSeasonMonths: 8,            // 淡季8个月（一年中）
    lowSeasonHolidayDays: 8,       // 淡季每月节假日天数
    lowSeasonWeekdayDays: 22,      // 淡季每月工作日天数
  },
  costRate: {
    productCostRate: 35,
  },
  scenarioParams: {
    optimistic: {
      orderCountChange: 30,      // 订单量+30%
      avgIncomeChange: 10,       // 单均收入+10%
      costRateChange: -5,        // 成本率-5%
    },
    pessimistic: {
      orderCountChange: -30,     // 订单量-30%
      avgIncomeChange: -10,      // 单均收入-10%
      costRateChange: 5,         // 成本率+5%
    },
  },
};

const InvestmentCalculator: React.FC = () => {
  const navigate = useNavigate();
  const [inputData, setInputData] = useState<InputData>(defaultInputData);
  const [result, setResult] = useState<CalculationResult | null>(null);

  // 当输入数据变化时，自动重新计算
  useEffect(() => {
    try {
      const calculatedResult = calculateAll(inputData);
      setResult(calculatedResult);
    } catch (error) {
      console.error('计算错误:', error);
      setResult(null);
    }
  }, [inputData]);

  const handleInputChange = (data: InputData) => {
    setInputData(data);
  };

  const handleReset = () => {
    setInputData(defaultInputData);
  };

  const handleBack = () => {
    navigate('/admin/dashboard');
  };

  return (
    <div className="investment-calculator-container">
      {/* 左侧：输入表单区 */}
      <div className="investment-calculator-left">
        <div className="investment-calculator-header">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            style={{ marginBottom: '16px' }}
          >
            返回
          </Button>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>
            投资参数设置
          </h2>
        </div>
        <div className="investment-calculator-form">
          <InputForm
            value={inputData}
            onChange={handleInputChange}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* 右侧：结果展示区 */}
      <div className="investment-calculator-right">
        <ResultPanel result={result} />
      </div>
    </div>
  );
};

export default InvestmentCalculator;


