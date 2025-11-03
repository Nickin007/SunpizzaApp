// 投资计算器数据类型定义

// A组：一次性初始投资
export interface InitialInvestment {
  yearlyRent: number;              // 年租金（元）
  decorationCost: number;          // 装修费用（元）
  equipmentCost: number;           // 设备采购成本（元）
  franchiseFee: number;            // 加盟费（元）
  deposit: number;                 // 保证金（元）
  rentDeposit: number;             // 首期租金押金（元）
  licenseFee: number;              // 证照办理费（元）
  initialMaterialCost: number;     // 首批原材料采购费（元）
  marketingCost: number;           // 开业营销推广费（元）
}

// B组：每月运营成本
export interface MonthlyCost {
  // 人员薪资
  employeeSalary: number;          // 员工薪资（元/月）
  ownerSalary: number;             // 老板薪资（元/月）
  
  // 水电杂费
  utilitiesCost: number;           // 水电杂费（元/月）
  propertyFee: number;             // 物业管理费（元/月）
  systemMaintenanceFee: number;    // 系统维护费（元/月）
  
  // 营销费用（百分比）
  cpcRate: number;                 // 推广CPC费用（营业额的%）
  cpsRate: number;                 // 销售CPS费用（营业额的%）
  
  // 品牌费用（百分比）
  brandManagementRate: number;     // 品牌管理费（营业额的%）
}

// C组：销售预测与收入结构（考虑淡旺季）
export interface SalesProjection {
  // 外卖部分
  delivery: {
    holidayOrderCount: number;     // 节假日日均订单量（单）- 淡季和旺季都用这个
    holidayAvgIncome: number;      // 节假日单均收入（元）
    weekdayOrderCount: number;     // 工作日日均订单量（单）- 仅淡季使用
    weekdayAvgIncome: number;      // 工作日单均收入（元）- 仅淡季使用
  };
  
  // 到店自取部分
  pickup: {
    holidayOrderCount: number;     // 节假日日均订单量（单）
    holidayAvgIncome: number;      // 节假日单均收入（元）
    weekdayOrderCount: number;     // 工作日日均订单量（单）- 仅淡季使用
    weekdayAvgIncome: number;      // 工作日单均收入（元）- 仅淡季使用
  };
  
  // 淡旺季时间参数
  peakSeasonMonths: number;        // 旺季月数（一年中）默认4个月
  lowSeasonMonths: number;         // 淡季月数（一年中）默认8个月
  lowSeasonHolidayDays: number;    // 淡季每月节假日天数
  lowSeasonWeekdayDays: number;    // 淡季每月工作日天数
}

// D组：成本率参数
export interface CostRate {
  productCostRate: number;         // 产品成本率（%）
}

// E组：场景分析参数（百分比变化）
export interface ScenarioParams {
  optimistic: {
    orderCountChange: number;      // 订单量变化（%）例如：30表示+30%
    avgIncomeChange: number;       // 单均收入变化（%）
    costRateChange: number;        // 成本率变化（%）例如：-5表示-5%
  };
  pessimistic: {
    orderCountChange: number;      // 订单量变化（%）
    avgIncomeChange: number;       // 单均收入变化（%）
    costRateChange: number;        // 成本率变化（%）
  };
}

// 完整输入数据
export interface InputData {
  initialInvestment: InitialInvestment;
  monthlyCost: MonthlyCost;
  salesProjection: SalesProjection;
  costRate: CostRate;
  scenarioParams: ScenarioParams;  // 新增场景参数
}

// 计算结果
export interface CalculationResult {
  // 基础指标
  monthlyRevenue: number;          // 月度营业额（加权平均）
  monthlyProfit: number;           // 月度净利润（加权平均）
  yearlyProfit: number;            // 年度净利润
  roiMonths: number;               // 投资回报周期（月）
  breakEvenRevenue: number;        // 盈亏平衡点营业额（加权平均）
  
  // 淡旺季分开统计
  peakSeasonRevenue: number;       // 旺季月度营业额
  peakSeasonProfit: number;        // 旺季月度净利润
  peakSeasonBreakEven: number;     // 旺季盈亏平衡点
  lowSeasonRevenue: number;        // 淡季月度营业额
  lowSeasonProfit: number;         // 淡季月度净利润
  lowSeasonBreakEven: number;      // 淡季盈亏平衡点
  
  // 成本明细
  totalInitialInvestment: number;  // 初始投资总额
  monthlyFixedCost: number;        // 月固定成本
  monthlyVariableCost: number;     // 月变动成本（基于营业额）
  monthlyTotalCost: number;        // 月总成本
  
  // 年度预测
  yearlyProjection: MonthlyData[]; // 12个月数据
  
  // 成本结构
  costStructure: {
    name: string;
    value: number;
  }[];
  
  // 收入结构
  revenueStructure: {
    name: string;
    value: number;
  }[];
  
  // 敏感性分析
  sensitivity: SensitivityData;
  
  // 多场景对比
  scenarios: ScenarioComparison;
}

// 月度数据
export interface MonthlyData {
  month: number;
  revenue: number;
  cost: number;
  profit: number;
  cumulativeProfit: number;
}

// 敏感性分析数据（更细致，5%间隔）
export interface SensitivityData {
  orderCountChange: {
    name: string;
    percentage: number;
    profit: number;
    profitChange: number;  // 利润变化量
  }[];
  avgIncomeChange: {
    name: string;
    percentage: number;
    profit: number;
    profitChange: number;
  }[];
  costRateChange: {
    name: string;
    percentage: number;
    profit: number;
    profitChange: number;
  }[];
}

// 场景对比
export interface ScenarioComparison {
  optimistic: ScenarioData;
  normal: ScenarioData;
  pessimistic: ScenarioData;
}

export interface ScenarioData {
  name: string;
  monthlyRevenue: number;
  monthlyProfit: number;
  roiMonths: number;
  yearlyProfit: number;
  profitMargin: number;
}


