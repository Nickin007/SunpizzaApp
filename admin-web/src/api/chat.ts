import request from '../utils/request';

// ==================== 类型定义 ====================

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  name_cn: string;
  arguments: Record<string, any>;
}

export interface MemoryEntry {
  id: number;
  user_id: number;
  tier: 'hot' | 'warm' | 'cold';
  category: string;
  content: string;
  source_conversation_id: number | null;
  relevance_score: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== SSE 流式回调接口 ====================

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onToolCalls: (toolCalls: ToolCall[], toolContext?: any[]) => void;
  onToolStatus: (message: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

// ==================== 通用 SSE 流解析 ====================

async function processSSEStream(resp: Response, callbacks: StreamCallbacks) {
  const reader = resp.body?.getReader();
  if (!reader) {
    callbacks.onError('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedContent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              callbacks.onError(parsed.error);
              return;
            }
            if (parsed.type === 'tool_calls') {
              callbacks.onToolCalls(parsed.tool_calls, parsed.tool_context);
            } else if (parsed.type === 'tool_status') {
              callbacks.onToolStatus(parsed.message);
            } else if (parsed.content) {
              receivedContent = true;
              callbacks.onChunk(parsed.content);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
    callbacks.onDone();
  } catch (err: any) {
    // If we already received content, treat stream closure as normal completion
    if (receivedContent) {
      callbacks.onDone();
    } else {
      callbacks.onError(err.message || '网络错误');
    }
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function getBaseURL() {
  return (request.defaults.baseURL || '').replace(/\/$/, '');
}

// ==================== 会话 API ====================

export function listConversations() {
  return request.get<any, any>('/chat/conversations');
}

export function createConversation(title?: string) {
  return request.post<any, any>('/chat/conversations', { title });
}

export function deleteConversation(id: number) {
  return request.delete<any, any>(`/chat/conversations/${id}`);
}

export function getMessages(conversationId: number) {
  return request.get<any, any>(`/chat/conversations/${conversationId}/messages`);
}

// ==================== 流式发送消息 ====================

export async function sendMessageStream(
  conversationId: number,
  content: string,
  callbacks: StreamCallbacks,
) {
  try {
    const resp = await fetch(`${getBaseURL()}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, stream: true }),
    });

    if (!resp.ok) {
      // 可能是 JSON 错误响应
      try {
        const errJson = await resp.json();
        callbacks.onError(errJson.message || `HTTP ${resp.status}`);
      } catch {
        callbacks.onError(`HTTP ${resp.status}`);
      }
      return;
    }

    // 检查是否是 SSE 流
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      await processSSEStream(resp, callbacks);
    } else {
      // JSON 响应（不应出现，但以防万一）
      const json = await resp.json();
      if (json.code === 200 && json.data?.assistant_message) {
        callbacks.onChunk(json.data.assistant_message.content);
        callbacks.onDone();
      } else {
        callbacks.onError(json.message || '未知错误');
      }
    }
  } catch (err: any) {
    callbacks.onError(err.message || '网络错误');
  }
}

// ==================== 流式工具执行 ====================

export async function executeToolsStream(
  conversationId: number,
  toolCalls: ToolCall[],
  priorToolContext: any[],
  callbacks: StreamCallbacks,
) {
  try {
    const resp = await fetch(`${getBaseURL()}/chat/conversations/${conversationId}/execute-tools`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tool_calls: toolCalls, prior_tool_context: priorToolContext }),
    });

    if (!resp.ok) {
      try {
        const errJson = await resp.json();
        callbacks.onError(errJson.message || `HTTP ${resp.status}`);
      } catch {
        callbacks.onError(`HTTP ${resp.status}`);
      }
      return;
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      await processSSEStream(resp, callbacks);
    } else {
      const json = await resp.json();
      callbacks.onError(json.message || '未知响应格式');
    }
  } catch (err: any) {
    callbacks.onError(err.message || '网络错误');
  }
}

// ==================== 记忆 API ====================

export function listMemory(tier?: string) {
  const params = tier ? { tier } : {};
  return request.get<any, any>('/chat/memory', { params });
}

export function addMemory(data: { tier: string; category: string; content: string }) {
  return request.post<any, any>('/chat/memory', data);
}

export function deleteMemory(id: number) {
  return request.delete<any, any>(`/chat/memory/${id}`);
}

export function summarizeConversation(conversationId: number) {
  return request.post<any, any>(`/chat/memory/summarize/${conversationId}`);
}
