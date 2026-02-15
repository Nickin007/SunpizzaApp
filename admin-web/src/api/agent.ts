import request from '../utils/request';

// ==================== 类型定义 ====================

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileNode[];
}

export interface VectorStats {
  total_chunks: number;
  chunks_with_vectors: number;
  indexed_files: string[];
}

// ==================== 文件管理 API ====================

/** 获取记忆文件目录树 */
export function getFileTree() {
  return request.get<any, any>('/agent/files/tree');
}

/** 读取记忆文件内容 */
export function readFile(path: string) {
  return request.get<any, any>('/agent/files', { params: { path } });
}

/** 更新记忆文件内容（覆盖写入） */
export function updateFile(path: string, content: string) {
  return request.put<any, any>(`/agent/files?path=${encodeURIComponent(path)}`, { content });
}

/** 创建新记忆文件 */
export function createFile(path: string, content: string) {
  return request.post<any, any>(`/agent/files?path=${encodeURIComponent(path)}`, { content });
}

/** 删除记忆文件 */
export function deleteFile(path: string) {
  return request.delete<any, any>(`/agent/files?path=${encodeURIComponent(path)}`);
}

// ==================== 向量索引 API ====================

/** 获取向量索引统计 */
export function getVectorStats() {
  return request.get<any, any>('/agent/vector/stats');
}

/** 重建向量索引 */
export function rebuildVectorIndex() {
  return request.post<any, any>('/agent/vector/rebuild');
}

/** 测试向量搜索 */
export function vectorSearch(query: string, topK?: number) {
  return request.post<any, any>('/agent/vector/search', { query, top_k: topK || 5 });
}
