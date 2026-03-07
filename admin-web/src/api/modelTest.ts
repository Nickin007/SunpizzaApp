import request from '../utils/request';

export interface StoreModelConfig {
  total_investment: number;
  monthly_revenue: number;
  costs: {
    rent: number;
    utility: number;
    property_fee: number;
    depreciation: number;
    misc: number;
  };
  labor_efficiency: number;
  gross_margin_rate: number;
  marketing_rate: number;
  management_rate: number;
  hq: {
    equity_share: number;
    dividend_share: number;
    supply_chain_margin: number;
  };
  manager: {
    equity_share: number;
    dividend_share: number;
    salary: number;
  };
  investor: {
    equity_share: number;
    dividend_share: number;
  };
  projection_months: number;
  scenario_optimistic: number;
  scenario_pessimistic: number;
}

export interface StoreModelTemplate {
  id: number;
  user_id: number;
  name: string;
  config: StoreModelConfig;
  created_at: string;
  updated_at: string;
}

export function listStoreTemplates() {
  return request.get<any, any>('/model-test/store/templates');
}

export function createStoreTemplate(data: { name: string; config: StoreModelConfig }) {
  return request.post<any, any>('/model-test/store/templates', data);
}

export function updateStoreTemplate(id: number, data: { name?: string; config?: StoreModelConfig }) {
  return request.put<any, any>(`/model-test/store/templates/${id}`, data);
}

export function deleteStoreTemplate(id: number) {
  return request.delete<any, any>(`/model-test/store/templates/${id}`);
}

/* ═══ 公司模型 ═══ */

export interface CompanyModelConfig {
  franchise_stores: number;
  direct_stores: number;
  avg_store_revenue: number;
  gross_margin_rate: number;
  supply_chain_margin: number;
  management_fee_rate: number;
  direct_store_profit: number;
  direct_store_equity: number;
  other_commission: number;
  hr_cost: number;
  office_rent: number;
  other_expense: number;
  dept_supply_chain_pct: number;
  dept_operation_pct: number;
  dept_management_pct: number;
  projection_months: number;
  monthly_new_franchise: number;
  monthly_new_direct: number;
}

export interface CompanyModelTemplate {
  id: number;
  user_id: number;
  name: string;
  config: CompanyModelConfig;
  created_at: string;
  updated_at: string;
}

export function listCompanyTemplates() {
  return request.get<any, any>('/model-test/company/templates');
}

export function createCompanyTemplate(data: { name: string; config: CompanyModelConfig }) {
  return request.post<any, any>('/model-test/company/templates', data);
}

export function deleteCompanyTemplate(id: number) {
  return request.delete<any, any>(`/model-test/company/templates/${id}`);
}
