import type {
  InputData,
  CalculationResult,
  MonthlyData,
  SensitivityData,
  ScenarioComparison,
  ScenarioData,
} from '../types';

/**
 * 计算旺季月度营业额（每天都是节假日水平）
 */
export const calculatePeakSeasonRevenue = (data: InputData): number => {
  const { salesProjection } = data;
  
  // 旺季：按30天节假日水平计算
  const deliveryRevenue = 
    salesProjection.delivery.holidayOrderCount * 
    salesProjection.delivery.holidayAvgIncome * 
    30;
  
  const pickupRevenue = 
    salesProjection.pickup.holidayOrderCount * 
    salesProjection.pickup.holidayAvgIncome * 
    30;
  
  return deliveryRevenue + pickupRevenue;
};

/**
 * 计算淡季月度营业额（有工作日和节假日之分）
 */
export const calculateLowSeasonRevenue = (data: InputData): number => {
  const { salesProjection } = data;
  
  // 淡季：分工作日和节假日
  const deliveryHolidayRevenue = 
    salesProjection.delivery.holidayOrderCount * 
    salesProjection.delivery.holidayAvgIncome * 
    salesProjection.lowSeasonHolidayDays;
    
  const deliveryWeekdayRevenue = 
    salesProjection.delivery.weekdayOrderCount * 
    salesProjection.delivery.weekdayAvgIncome * 
    salesProjection.lowSeasonWeekdayDays;
  
  const pickupHolidayRevenue = 
    salesProjection.pickup.holidayOrderCount * 
    salesProjection.pickup.holidayAvgIncome * 
    salesProjection.lowSeasonHolidayDays;
    
  const pickupWeekdayRevenue = 
    salesProjection.pickup.weekdayOrderCount * 
    salesProjection.pickup.weekdayAvgIncome * 
    salesProjection.lowSeasonWeekdayDays;
  
  return deliveryHolidayRevenue + deliveryWeekdayRevenue + 
         pickupHolidayRevenue + pickupWeekdayRevenue;
};

/**
 * 计算月度营业额（加权平均）
 */
export const calculateMonthlyRevenue = (data: InputData): number => {
  const { salesProjection } = data;
  const peakRevenue = calculatePeakSeasonRevenue(data);
  const lowRevenue = calculateLowSeasonRevenue(data);
  
  // 加权平均：(旺季月数 × 旺季营业额 + 淡季月数 × 淡季营业额) / 12
  return (
    peakRevenue * salesProjection.peakSeasonMonths +
    lowRevenue * salesProjection.lowSeasonMonths
  ) / 12;
};

/**
 * 计算月度固定成本
 */
export const calculateMonthlyFixedCost = (data: InputData): number => {
  const { monthlyCost, initialInvestment } = data;
  
  return monthlyCost.employeeSalary +
         monthlyCost.ownerSalary +
         monthlyCost.utilitiesCost +
         monthlyCost.propertyFee +
         monthlyCost.systemMaintenanceFee +
         initialInvestment.yearlyRent / 12; // 月租金
};

/**
 * 计算月度变动成本（基于营业额）
 */
export const calculateMonthlyVariableCost = (
  monthlyRevenue: number,
  data: InputData
): number => {
  const { monthlyCost, costRate } = data;
  
  // 产品成本
  const productCost = monthlyRevenue * (costRate.productCostRate / 100);
  
  // 营销费用
  const marketingCost = monthlyRevenue * (
    (monthlyCost.cpcRate + monthlyCost.cpsRate) / 100
  );
  
  // 品牌费用
  const brandCost = monthlyRevenue * (monthlyCost.brandManagementRate / 100);
  
  return productCost + marketingCost + brandCost;
};

/**
 * 计算月度总成本
 */
export const calculateMonthlyCost = (
  monthlyRevenue: number,
  data: InputData
): number => {
  return calculateMonthlyFixedCost(data) + 
         calculateMonthlyVariableCost(monthlyRevenue, data);
};

/**
 * 计算月度净利润
 * @param data 输入数据
 * @param customRevenue 可选的自定义营业额（用于计算淡旺季利润）
 */
export const calculateMonthlyProfit = (data: InputData, customRevenue?: number): number => {
  const monthlyRevenue = customRevenue !== undefined ? customRevenue : calculateMonthlyRevenue(data);
  const monthlyCost = calculateMonthlyCost(monthlyRevenue, data);
  return monthlyRevenue - monthlyCost;
};

/**
 * 计算总初始投资
 */
export const calculateTotalInitialInvestment = (data: InputData): number => {
  const { initialInvestment } = data;
  
  return initialInvestment.yearlyRent +
         initialInvestment.decorationCost +
         initialInvestment.equipmentCost +
         initialInvestment.franchiseFee +
         initialInvestment.deposit +
         initialInvestment.rentDeposit +
         initialInvestment.licenseFee +
         initialInvestment.initialMaterialCost +
         initialInvestment.marketingCost;
};

/**
 * 计算投资回报周期（月）- 考虑淡旺季周期
 */
export const calculateROI = (data: InputData): number => {
  const totalInvestment = calculateTotalInitialInvestment(data);
  
  // 计算淡季和旺季的月度利润
  const peakSeasonRevenue = calculatePeakSeasonRevenue(data);
  const lowSeasonRevenue = calculateLowSeasonRevenue(data);
  
  const peakSeasonProfit = calculateMonthlyProfit(data, peakSeasonRevenue);
  const lowSeasonProfit = calculateMonthlyProfit(data, lowSeasonRevenue);
  
  // 一个完整周期 = 淡季月数 + 旺季月数 (默认4+2=6个月)
  const cycleMonths = data.salesProjection.lowSeasonMonths + data.salesProjection.peakSeasonMonths;
  
  // 一个周期的总利润
  const cycleProfit = 
    lowSeasonProfit * data.salesProjection.lowSeasonMonths +
    peakSeasonProfit * data.salesProjection.peakSeasonMonths;
  
  if (cycleProfit <= 0) {
    return Infinity; // 无法回本
  }
  
  // 需要多少个完整周期才能回本
  const cyclesNeeded = totalInvestment / cycleProfit;
  
  // 转换为月数
  return cyclesNeeded * cycleMonths;
};

/**
 * 计算盈亏平衡点（所需营业额）- 加权平均
 */
export const calculateBreakEven = (data: InputData): number => {
  const { salesProjection } = data;
  const peakBreakEven = calculatePeakSeasonBreakEven(data);
  const lowBreakEven = calculateLowSeasonBreakEven(data);
  
  // 加权平均
  return (
    peakBreakEven * salesProjection.peakSeasonMonths +
    lowBreakEven * salesProjection.lowSeasonMonths
  ) / 12;
};

/**
 * 计算旺季盈亏平衡点
 */
export const calculatePeakSeasonBreakEven = (data: InputData): number => {
  const fixedCost = calculateMonthlyFixedCost(data);
  const { monthlyCost, costRate } = data;
  
  // 变动成本率（总和）
  const variableCostRate = (
    costRate.productCostRate +
    monthlyCost.cpcRate +
    monthlyCost.cpsRate +
    monthlyCost.brandManagementRate
  ) / 100;
  
  // 旺季盈亏平衡点 = 固定成本 / (1 - 变动成本率)
  return fixedCost / (1 - variableCostRate);
};

/**
 * 计算淡季盈亏平衡点
 */
export const calculateLowSeasonBreakEven = (data: InputData): number => {
  const fixedCost = calculateMonthlyFixedCost(data);
  const { monthlyCost, costRate } = data;
  
  // 变动成本率（总和）
  const variableCostRate = (
    costRate.productCostRate +
    monthlyCost.cpcRate +
    monthlyCost.cpsRate +
    monthlyCost.brandManagementRate
  ) / 100;
  
  // 淡季盈亏平衡点 = 固定成本 / (1 - 变动成本率)
  return fixedCost / (1 - variableCostRate);
};

/**
 * 计算年度利润预测（12个月）
 */
export const calculateYearlyProjection = (data: InputData): MonthlyData[] => {
  // 计算淡季和旺季的数据
  const peakSeasonRevenue = calculatePeakSeasonRevenue(data);
  const lowSeasonRevenue = calculateLowSeasonRevenue(data);
  const peakSeasonProfit = calculateMonthlyProfit(data, peakSeasonRevenue);
  const lowSeasonProfit = calculateMonthlyProfit(data, lowSeasonRevenue);
  const peakSeasonCost = peakSeasonRevenue - peakSeasonProfit;
  const lowSeasonCost = lowSeasonRevenue - lowSeasonProfit;
  
  const projection: MonthlyData[] = [];
  let cumulativeProfit = -calculateTotalInitialInvestment(data); // 从负的初始投资开始
  
  // 旺季月份：第5/6/11/12月
  const peakSeasonMonths = [5, 6, 11, 12];
  
  for (let month = 1; month <= 12; month++) {
    // 判断是旺季还是淡季
    const isPeakSeason = peakSeasonMonths.includes(month);
    const revenue = isPeakSeason ? peakSeasonRevenue : lowSeasonRevenue;
    const cost = isPeakSeason ? peakSeasonCost : lowSeasonCost;
    const profit = isPeakSeason ? peakSeasonProfit : lowSeasonProfit;
    
    cumulativeProfit += profit;
    
    projection.push({
      month,
      revenue,
      cost,
      profit,
      cumulativeProfit,
    });
  }
  
  return projection;
};

/**
 * 敏感性分析（5%间隔，更细致）
 */
export const calculateSensitivity = (data: InputData): SensitivityData => {
  const baseProfit = calculateMonthlyProfit(data);
  
  // 订单量变化分析（-30%到+30%，5%间隔）
  const orderCountChange = [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30].map(percentage => {
    const modifiedData = { ...data };
    const factor = 1 + percentage / 100;
    
    modifiedData.salesProjection = {
      ...data.salesProjection,
      delivery: {
        ...data.salesProjection.delivery,
        holidayOrderCount: data.salesProjection.delivery.holidayOrderCount * factor,
        weekdayOrderCount: data.salesProjection.delivery.weekdayOrderCount * factor,
      },
      pickup: {
        ...data.salesProjection.pickup,
        holidayOrderCount: data.salesProjection.pickup.holidayOrderCount * factor,
        weekdayOrderCount: data.salesProjection.pickup.weekdayOrderCount * factor,
      },
    };
    
    const profit = calculateMonthlyProfit(modifiedData);
    return {
      name: `${percentage >= 0 ? '+' : ''}${percentage}%`,
      percentage,
      profit,
      profitChange: profit - baseProfit,
    };
  });
  
  // 单均收入变化分析（-30%到+30%，5%间隔）
  const avgIncomeChange = [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30].map(percentage => {
    const modifiedData = { ...data };
    const factor = 1 + percentage / 100;
    
    modifiedData.salesProjection = {
      ...data.salesProjection,
      delivery: {
        ...data.salesProjection.delivery,
        holidayAvgIncome: data.salesProjection.delivery.holidayAvgIncome * factor,
        weekdayAvgIncome: data.salesProjection.delivery.weekdayAvgIncome * factor,
      },
      pickup: {
        ...data.salesProjection.pickup,
        holidayAvgIncome: data.salesProjection.pickup.holidayAvgIncome * factor,
        weekdayAvgIncome: data.salesProjection.pickup.weekdayAvgIncome * factor,
      },
    };
    
    const profit = calculateMonthlyProfit(modifiedData);
    return {
      name: `${percentage >= 0 ? '+' : ''}${percentage}%`,
      percentage,
      profit,
      profitChange: profit - baseProfit,
    };
  });
  
  // 成本率变化分析（-15%到+15%，5%间隔）
  const costRateChange = [-15, -10, -5, 0, 5, 10, 15].map(percentage => {
    const modifiedData = { ...data };
    const change = percentage / 100;
    
    modifiedData.costRate = {
      productCostRate: Math.max(0, data.costRate.productCostRate * (1 + change)),
    };
    
    const profit = calculateMonthlyProfit(modifiedData);
    return {
      name: `${percentage >= 0 ? '+' : ''}${percentage}%`,
      percentage,
      profit,
      profitChange: profit - baseProfit,
    };
  });
  
  return {
    orderCountChange,
    avgIncomeChange,
    costRateChange,
  };
};

/**
 * 多场景对比（使用用户自定义的场景参数）
 */
export const calculateScenarios = (data: InputData): ScenarioComparison => {
  // 正常场景（基准）
  const normalRevenue = calculateMonthlyRevenue(data);
  const normalProfit = calculateMonthlyProfit(data);
  const normalROI = calculateROI(data);
  
  // 乐观场景：使用用户定义的参数
  const optimisticData = { ...data };
  const optOrderFactor = 1 + data.scenarioParams.optimistic.orderCountChange / 100;
  const optIncomeFactor = 1 + data.scenarioParams.optimistic.avgIncomeChange / 100;
  const optCostFactor = 1 + data.scenarioParams.optimistic.costRateChange / 100;
  
  optimisticData.salesProjection = {
    ...data.salesProjection,
    delivery: {
      ...data.salesProjection.delivery,
      holidayOrderCount: data.salesProjection.delivery.holidayOrderCount * optOrderFactor,
      weekdayOrderCount: data.salesProjection.delivery.weekdayOrderCount * optOrderFactor,
      holidayAvgIncome: data.salesProjection.delivery.holidayAvgIncome * optIncomeFactor,
      weekdayAvgIncome: data.salesProjection.delivery.weekdayAvgIncome * optIncomeFactor,
    },
    pickup: {
      ...data.salesProjection.pickup,
      holidayOrderCount: data.salesProjection.pickup.holidayOrderCount * optOrderFactor,
      weekdayOrderCount: data.salesProjection.pickup.weekdayOrderCount * optOrderFactor,
      holidayAvgIncome: data.salesProjection.pickup.holidayAvgIncome * optIncomeFactor,
      weekdayAvgIncome: data.salesProjection.pickup.weekdayAvgIncome * optIncomeFactor,
    },
  };
  optimisticData.costRate = {
    productCostRate: Math.max(0, data.costRate.productCostRate * optCostFactor),
  };
  
  const optimisticRevenue = calculateMonthlyRevenue(optimisticData);
  const optimisticProfit = calculateMonthlyProfit(optimisticData);
  const optimisticROI = calculateROI(optimisticData);
  
  // 悲观场景：使用用户定义的参数
  const pessimisticData = { ...data };
  const pesOrderFactor = 1 + data.scenarioParams.pessimistic.orderCountChange / 100;
  const pesIncomeFactor = 1 + data.scenarioParams.pessimistic.avgIncomeChange / 100;
  const pesCostFactor = 1 + data.scenarioParams.pessimistic.costRateChange / 100;
  
  pessimisticData.salesProjection = {
    ...data.salesProjection,
    delivery: {
      ...data.salesProjection.delivery,
      holidayOrderCount: data.salesProjection.delivery.holidayOrderCount * pesOrderFactor,
      weekdayOrderCount: data.salesProjection.delivery.weekdayOrderCount * pesOrderFactor,
      holidayAvgIncome: data.salesProjection.delivery.holidayAvgIncome * pesIncomeFactor,
      weekdayAvgIncome: data.salesProjection.delivery.weekdayAvgIncome * pesIncomeFactor,
    },
    pickup: {
      ...data.salesProjection.pickup,
      holidayOrderCount: data.salesProjection.pickup.holidayOrderCount * pesOrderFactor,
      weekdayOrderCount: data.salesProjection.pickup.weekdayOrderCount * pesOrderFactor,
      holidayAvgIncome: data.salesProjection.pickup.holidayAvgIncome * pesIncomeFactor,
      weekdayAvgIncome: data.salesProjection.pickup.weekdayAvgIncome * pesIncomeFactor,
    },
  };
  pessimisticData.costRate = {
    productCostRate: Math.max(0, data.costRate.productCostRate * pesCostFactor),
  };
  
  const pessimisticRevenue = calculateMonthlyRevenue(pessimisticData);
  const pessimisticProfit = calculateMonthlyProfit(pessimisticData);
  const pessimisticROI = calculateROI(pessimisticData);
  
  return {
    optimistic: {
      name: '乐观场景',
      monthlyRevenue: optimisticRevenue,
      monthlyProfit: optimisticProfit,
      roiMonths: optimisticROI,
      yearlyProfit: optimisticProfit * 12,
      profitMargin: (optimisticProfit / optimisticRevenue) * 100,
    },
    normal: {
      name: '正常场景',
      monthlyRevenue: normalRevenue,
      monthlyProfit: normalProfit,
      roiMonths: normalROI,
      yearlyProfit: normalProfit * 12,
      profitMargin: (normalProfit / normalRevenue) * 100,
    },
    pessimistic: {
      name: '悲观场景',
      monthlyRevenue: pessimisticRevenue,
      monthlyProfit: pessimisticProfit,
      roiMonths: pessimisticROI,
      yearlyProfit: pessimisticProfit * 12,
      profitMargin: (pessimisticProfit / pessimisticRevenue) * 100,
    },
  };
};

/**
 * 综合计算所有结果
 */
export const calculateAll = (data: InputData): CalculationResult => {
  const monthlyRevenue = calculateMonthlyRevenue(data);
  const monthlyProfit = calculateMonthlyProfit(data);
  const totalInitialInvestment = calculateTotalInitialInvestment(data);
  const monthlyFixedCost = calculateMonthlyFixedCost(data);
  const monthlyVariableCost = calculateMonthlyVariableCost(monthlyRevenue, data);
  const monthlyTotalCost = calculateMonthlyCost(monthlyRevenue, data);
  
  // 淡旺季分别计算
  const peakSeasonRevenue = calculatePeakSeasonRevenue(data);
  const lowSeasonRevenue = calculateLowSeasonRevenue(data);
  const peakSeasonCost = calculateMonthlyCost(peakSeasonRevenue, data);
  const lowSeasonCost = calculateMonthlyCost(lowSeasonRevenue, data);
  const peakSeasonProfit = peakSeasonRevenue - peakSeasonCost;
  const lowSeasonProfit = lowSeasonRevenue - lowSeasonCost;
  const peakSeasonBreakEven = calculatePeakSeasonBreakEven(data);
  const lowSeasonBreakEven = calculateLowSeasonBreakEven(data);
  
  // 成本结构
  const costStructure = [
    { name: '初始投资', value: totalInitialInvestment },
    { name: '人员成本', value: (data.monthlyCost.employeeSalary + data.monthlyCost.ownerSalary) * 12 },
    { name: '租金成本', value: data.initialInvestment.yearlyRent },
    { name: '产品成本', value: monthlyVariableCost * 12 },
    { name: '运营费用', value: (data.monthlyCost.utilitiesCost + data.monthlyCost.propertyFee + data.monthlyCost.systemMaintenanceFee) * 12 },
  ];
  
  // 收入结构（按淡旺季加权）
  // 淡季收入（4个月）
  const deliveryLowSeasonRevenue = (
    data.salesProjection.delivery.holidayOrderCount * data.salesProjection.delivery.holidayAvgIncome * data.salesProjection.lowSeasonHolidayDays +
    data.salesProjection.delivery.weekdayOrderCount * data.salesProjection.delivery.weekdayAvgIncome * data.salesProjection.lowSeasonWeekdayDays
  ) * data.salesProjection.lowSeasonMonths;
  
  // 旺季收入（2个月）
  const deliveryPeakSeasonRevenue = (
    data.salesProjection.delivery.holidayOrderCount * data.salesProjection.delivery.holidayAvgIncome * 30
  ) * data.salesProjection.peakSeasonMonths;
  
  // 淡季到店收入
  const pickupLowSeasonRevenue = (
    data.salesProjection.pickup.holidayOrderCount * data.salesProjection.pickup.holidayAvgIncome * data.salesProjection.lowSeasonHolidayDays +
    data.salesProjection.pickup.weekdayOrderCount * data.salesProjection.pickup.weekdayAvgIncome * data.salesProjection.lowSeasonWeekdayDays
  ) * data.salesProjection.lowSeasonMonths;
  
  // 旺季到店收入
  const pickupPeakSeasonRevenue = (
    data.salesProjection.pickup.holidayOrderCount * data.salesProjection.pickup.holidayAvgIncome * 30
  ) * data.salesProjection.peakSeasonMonths;
  
  const revenueStructure = [
    { name: '外卖收入', value: deliveryLowSeasonRevenue + deliveryPeakSeasonRevenue },
    { name: '到店自取收入', value: pickupLowSeasonRevenue + pickupPeakSeasonRevenue },
  ];
  
  return {
    monthlyRevenue,
    monthlyProfit,
    yearlyProfit: monthlyProfit * 12,
    roiMonths: calculateROI(data),
    breakEvenRevenue: calculateBreakEven(data),
    
    // 淡旺季分开统计
    peakSeasonRevenue,
    peakSeasonProfit,
    peakSeasonBreakEven,
    lowSeasonRevenue,
    lowSeasonProfit,
    lowSeasonBreakEven,
    
    totalInitialInvestment,
    monthlyFixedCost,
    monthlyVariableCost,
    monthlyTotalCost,
    yearlyProjection: calculateYearlyProjection(data),
    costStructure,
    revenueStructure,
    sensitivity: calculateSensitivity(data),
    scenarios: calculateScenarios(data),
  };
};


