import { http } from '../utils/request';
import type { 
  TrainingCategory, 
  TrainingCourse, 
  ExamQuestion, 
  ExamSubmission,
  PaginationResponse 
} from '../types';

export const trainingApi = {
  // ==================== 分类管理 ====================
  
  // 获取分类列表
  getCategories: (params?: { type?: string }) =>
    http.get<TrainingCategory[]>('/training/categories', { params }),

  // 创建分类
  createCategory: (data: {
    name: string;
    type: 'product' | 'service' | 'operation';
    sort_order?: number;
  }) => http.post<TrainingCategory>('/training/admin/categories', data),

  // 更新分类
  updateCategory: (id: number, data: {
    name?: string;
    type?: 'product' | 'service' | 'operation';
    sort_order?: number;
  }) => http.put<TrainingCategory>(`/training/admin/categories/${id}`, data),

  // 删除分类
  deleteCategory: (id: number) =>
    http.delete(`/training/admin/categories/${id}`),

  // ==================== 课程管理 ====================
  
  // 获取课程列表（管理员专用，包含未发布的课程）
  getCourses: (params?: { 
    category_id?: number;
    page?: number;
    per_page?: number;
  }) => http.get<TrainingCourse[]>('/training/admin/courses', { params }),

  // 获取课程详情（含题目）
  getCourseDetail: (id: number) =>
    http.get<TrainingCourse>(`/training/courses/${id}`),

  // 创建课程
  createCourse: (data: {
    title: string;
    description?: string;
    category_id: number;
    video_url?: string;
    document_content?: string;
    has_exam?: boolean;
    is_published?: boolean;
  }) => http.post<TrainingCourse>('/training/admin/courses', data),

  // 更新课程
  updateCourse: (id: number, data: {
    title?: string;
    description?: string;
    category_id?: number;
    video_url?: string;
    document_content?: string;
    has_exam?: boolean;
    is_published?: boolean;
  }) => http.put<TrainingCourse>(`/training/admin/courses/${id}`, data),

  // 删除课程
  deleteCourse: (id: number) =>
    http.delete(`/training/admin/courses/${id}`),

  // ==================== 题目管理 ====================
  
  // 获取课程的所有题目
  getCourseQuestions: (courseId: number) =>
    http.get<ExamQuestion[]>(`/training/admin/courses/${courseId}/questions`),

  // 批量添加题目
  addQuestions: (courseId: number, data: {
    questions: Array<{
      question_text: string;
      question_type: 'single_choice' | 'multiple_choice' | 'true_false' | 'subjective';
      options?: string[];
      correct_answer?: string;
      is_subjective?: boolean;
      score?: number;
      sort_order?: number;
    }>;
  }) => http.post<ExamQuestion[]>(`/training/admin/courses/${courseId}/questions`, data),

  // 更新题目
  updateQuestion: (questionId: number, data: {
    question_text?: string;
    question_type?: 'single_choice' | 'multiple_choice' | 'true_false' | 'subjective';
    options?: string[];
    correct_answer?: string;
    is_subjective?: boolean;
    score?: number;
    sort_order?: number;
  }) => http.put<ExamQuestion>(`/training/admin/questions/${questionId}`, data),

  // 删除题目
  deleteQuestion: (questionId: number) =>
    http.delete(`/training/admin/questions/${questionId}`),

  // ==================== 考试审核 ====================
  
  // 获取待审核的考试列表
  getPendingExams: () =>
    http.get<ExamSubmission[]>('/training/admin/pending-exams'),

  // 审核考试
  reviewExam: (submissionId: number, data: {
    subjective_score: number;
    feedback?: string;
    passing_score?: number;
  }) => http.post<ExamSubmission>(`/training/admin/review-exam/${submissionId}`, data),
};

