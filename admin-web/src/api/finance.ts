import request from '../utils/request';

// ==================== 类型定义 ====================

export interface AccountBook {
  id: number;
  name: string;
  start_date: string;
  currency: string;
  last_closed_period: string | null;
  created_at: string;
}

export interface AccountSubject {
  id: number;
  book_id: number;
  code: string;
  name: string;
  full_name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance_direction: 'debit' | 'credit';
  parent_id: number | null;
  level: number;
  is_enabled: boolean;
  is_cash: boolean;
  linked_category_ids: number[];
}

export interface AccountItemCategory {
  id: number;
  book_id: number;
  name: string;
  created_at: string;
  items?: AccountItem[];
}

export interface AccountItem {
  id: number;
  category_id: number;
  code: string;
  name: string;
  is_enabled: boolean;
  created_at: string;
}

export interface EntryItem {
  id?: number;
  entry_id?: number;
  category_id: number;
  category_name?: string;
  item_id: number;
  item_code?: string;
  item_name?: string;
}

export interface InitialBalance {
  id?: number;
  book_id: number;
  subject_id: number;
  subject_code?: string;
  subject_name?: string;
  item_id: number | null;
  item_name?: string;
  debit_amount: number;
  credit_amount: number;
}

export interface TrialBalanceRow {
  subject_id: number;
  code: string;
  name: string;
  type: string;
  level: number;
  balance_direction: string;
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  closing_balance: number;
}

export interface ItemBalanceRow {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  closing_balance: number;
}

export interface BalanceSheetData {
  period: string;
  assets: Array<{ name: string; items: Array<{ name: string; amount: number }> }>;
  total_assets: number;
  liabilities: Array<{ name: string; items: Array<{ name: string; amount: number }> }>;
  total_liabilities: number;
  equity: Array<{ name: string; amount: number }>;
  total_equity: number;
  total_liabilities_equity: number;
}

export interface IncomeRow {
  name: string;
  amount: number;
  level: number;
}

export interface CashFlowSection {
  name: string;
  items: Array<{ name: string; amount: number }>;
}

export interface CashFlowData {
  period: string;
  sections: CashFlowSection[];
  net_increase: number;
  opening_cash: number;
  closing_cash: number;
}

export interface VoucherEntry {
  id?: number;
  voucher_id?: number;
  line_no: number;
  summary: string;
  subject_id: number;
  subject_code?: string;
  subject_name?: string;
  subject_full_name?: string;
  debit_amount: number;
  credit_amount: number;
  items?: EntryItem[];
}

export interface Voucher {
  id: number;
  book_id: number;
  voucher_word: string;
  voucher_no: number;
  period: string;
  date: string;
  attachment_count: number;
  status: 'draft' | 'approved';
  created_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  entries?: VoucherEntry[];
  debit_total?: number;
  credit_total?: number;
  first_summary?: string;
}

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

// ==================== 账套 API ====================

export const listBooks = () =>
  request.get<ApiResponse<AccountBook[]>>('/finance/books');

export const createBook = (data: { name: string; start_date: string; currency?: string }) =>
  request.post<ApiResponse<AccountBook>>('/finance/books', data);

export const updateBook = (id: number, data: { name?: string; currency?: string }) =>
  request.put<ApiResponse<AccountBook>>(`/finance/books/${id}`, data);

export const deleteBook = (id: number) =>
  request.delete<ApiResponse<null>>(`/finance/books/${id}`);

// ==================== 科目 API ====================

export const listSubjects = (bookId: number) =>
  request.get<ApiResponse<AccountSubject[]>>(`/finance/books/${bookId}/subjects`);

export const addSubject = (bookId: number, data: {
  code: string;
  name: string;
  parent_id?: number | null;
  type?: string;
  balance_direction?: string;
  is_cash?: boolean;
}) => request.post<ApiResponse<AccountSubject>>(`/finance/books/${bookId}/subjects`, data);

export const updateSubject = (id: number, data: {
  name?: string;
  is_enabled?: boolean;
  is_cash?: boolean;
}) => request.put<ApiResponse<AccountSubject>>(`/finance/subjects/${id}`, data);

export const deleteSubject = (id: number) =>
  request.delete<ApiResponse<null>>(`/finance/subjects/${id}`);

// ==================== 凭证 API ====================

export const getNextVoucherNo = (bookId: number, period: string, voucherWord?: string) =>
  request.get<ApiResponse<{ next_no: number }>>(`/finance/books/${bookId}/vouchers/next-no`, {
    params: { period, voucher_word: voucherWord || '记' },
  });

export const createVoucher = (bookId: number, data: {
  voucher_word?: string;
  date: string;
  period: string;
  attachment_count?: number;
  created_by?: string;
  entries: Array<{
    summary: string;
    subject_id: number;
    debit_amount: number;
    credit_amount: number;
  }>;
}) => request.post<ApiResponse<Voucher>>(`/finance/books/${bookId}/vouchers`, data);

export const listVouchers = (bookId: number, params?: {
  period?: string;
  status?: string;
  voucher_word?: string;
  keyword?: string;
}) => request.get<ApiResponse<Voucher[]>>(`/finance/books/${bookId}/vouchers`, { params });

export const getVoucher = (id: number) =>
  request.get<ApiResponse<Voucher>>(`/finance/vouchers/${id}`);

export const updateVoucher = (id: number, data: {
  date?: string;
  attachment_count?: number;
  entries?: Array<{
    summary: string;
    subject_id: number;
    debit_amount: number;
    credit_amount: number;
  }>;
}) => request.put<ApiResponse<Voucher>>(`/finance/vouchers/${id}`, data);

export const deleteVoucher = (id: number) =>
  request.delete<ApiResponse<null>>(`/finance/vouchers/${id}`);

export const approveVoucher = (id: number, approvedBy?: string) =>
  request.post<ApiResponse<Voucher>>(`/finance/vouchers/${id}/approve`, { approved_by: approvedBy });

export const unapproveVoucher = (id: number) =>
  request.post<ApiResponse<Voucher>>(`/finance/vouchers/${id}/unapprove`);

// ==================== 核算项目 API ====================

export const listItemCategories = (bookId: number) =>
  request.get<ApiResponse<AccountItemCategory[]>>(`/finance/books/${bookId}/item-categories`);

export const createItemCategory = (bookId: number, data: { name: string }) =>
  request.post<ApiResponse<AccountItemCategory>>(`/finance/books/${bookId}/item-categories`, data);

export const updateItemCategory = (id: number, data: { name: string }) =>
  request.put<ApiResponse<AccountItemCategory>>(`/finance/item-categories/${id}`, data);

export const deleteItemCategory = (id: number) =>
  request.delete<ApiResponse<null>>(`/finance/item-categories/${id}`);

export const createItem = (categoryId: number, data: { code: string; name: string }) =>
  request.post<ApiResponse<AccountItem>>(`/finance/item-categories/${categoryId}/items`, data);

export const updateItem = (id: number, data: { code?: string; name?: string; is_enabled?: boolean }) =>
  request.put<ApiResponse<AccountItem>>(`/finance/items/${id}`, data);

export const deleteItem = (id: number) =>
  request.delete<ApiResponse<null>>(`/finance/items/${id}`);

// ==================== 科目-核算关联 API ====================

export const setSubjectItemLinks = (subjectId: number, categoryIds: number[]) =>
  request.put<ApiResponse<AccountSubject>>(`/finance/subjects/${subjectId}/item-links`, { category_ids: categoryIds });

// ==================== 期初余额 API ====================

export const getInitialBalances = (bookId: number) =>
  request.get<ApiResponse<InitialBalance[]>>(`/finance/books/${bookId}/initial-balances`);

export const setInitialBalances = (bookId: number, balances: Array<{
  subject_id: number; item_id?: number | null; debit_amount: number; credit_amount: number;
}>) => request.put<ApiResponse<null>>(`/finance/books/${bookId}/initial-balances`, { balances });

// ==================== 报表 API ====================

export const getTrialBalance = (bookId: number, period: string) =>
  request.get<ApiResponse<TrialBalanceRow[]>>(`/finance/books/${bookId}/trial-balance`, { params: { period } });

export const getItemBalance = (bookId: number, period: string, categoryId: number) =>
  request.get<ApiResponse<ItemBalanceRow[]>>(`/finance/books/${bookId}/item-balance`, { params: { period, category_id: categoryId } });

export const getBalanceSheet = (bookId: number, period: string) =>
  request.get<ApiResponse<BalanceSheetData>>(`/finance/books/${bookId}/balance-sheet`, { params: { period } });

export const getIncomeStatement = (bookId: number, period: string) =>
  request.get<ApiResponse<{ period: string; rows: IncomeRow[] }>>(`/finance/books/${bookId}/income-statement`, { params: { period } });

export const getCashFlowStatement = (bookId: number, period: string) =>
  request.get<ApiResponse<CashFlowData>>(`/finance/books/${bookId}/cashflow-statement`, { params: { period } });

export const exportReport = (bookId: number, type: string, period: string) =>
  request.get(`/finance/books/${bookId}/export-report`, {
    params: { type, period },
    responseType: 'blob',
  });
