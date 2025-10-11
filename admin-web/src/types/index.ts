// ==================== 用户相关类型 ====================
export interface User {
  id: number;
  username: string;
  real_name: string;
  role: 'admin' | 'regional_manager' | 'shop_manager' | 'staff';
  shop_id: number | null;
  created_at: string;
  shop?: Shop;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ==================== 门店相关类型 ====================
export interface Shop {
  id: number;
  name: string;
  address: string;
  regional_manager_id: number;
  manager_id?: number;
  created_at: string;
  regional_manager?: User;
  manager?: User;
}

// ==================== 工单相关类型 ====================
export interface WorkOrder {
  id: number;
  title: string;
  description: string;
  type_id: number;
  priority_id: number;
  status_id: number;
  creator_id: number;
  assignee_id: number;
  shop_id: number;
  due_date: string;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  type?: DictTaskType;
  priority?: DictPriority;
  status?: DictStatus;
  creator?: User;
  assignee?: User;
  shop?: Shop;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export interface TaskComment {
  id: number;
  work_order_id: number;
  author_id: number;
  content: string;
  created_at: string;
  author?: User;
}

export interface TaskAttachment {
  id: number;
  work_order_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_by: number;
  created_at: string;
  uploader?: User;
}

// ==================== 字典类型 ====================
export interface DictTaskType {
  id: number;
  type_name: string;
  color: string;
}

export interface DictPriority {
  id: number;
  priority_name: string;
  color: string;
  sort_order: number;
}

export interface DictStatus {
  id: number;
  status_name: string;
  color: string;
}

// ==================== API 响应类型 ====================
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Statistics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  archived: number;
}

// ==================== 培训模块类型 ====================
export interface TrainingCategory {
  id: number;
  name: string;
  parent_id: number | null;
  type: 'product' | 'service' | 'operation';
  sort_order: number;
}

export interface TrainingCourse {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  category?: TrainingCategory;
  video_url: string | null;
  document_content: string | null;
  has_exam: boolean;
  is_published: boolean;
  created_at: string;
  exam_questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: number;
  course_id: number;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'subjective';
  options: string[] | null;
  correct_answer: string | null;
  is_subjective: boolean;
  score: number;
  sort_order: number;
}

export interface ExamSubmission {
  id: number;
  user_id: number;
  student_name: string | null;
  course_id: number;
  course_name: string | null;
  answers: Record<string, string>;
  objective_score: number;
  subjective_score: number;
  total_score: number;
  status: 'pending_review' | 'passed' | 'failed';
  reviewed_by: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  feedback: string | null;
  created_at: string;
  questions?: ExamQuestion[];
}

