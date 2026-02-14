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
