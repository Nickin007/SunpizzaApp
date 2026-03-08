import request from '../utils/request';

// ==================== 类型定义 ====================

export interface Conversation {
  id: number;
  user_id: number;
  agent_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  status: 'active' | 'placeholder' | 'disabled';
  children?: AgentDefinition[];
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  msg_type?: 'text' | 'tool_call' | 'tool_result';
  type?: 'text' | 'tool_call' | 'tool_result';
  toolName?: string;
  toolCode?: string;
  toolOutput?: string;
  toolSuccess?: boolean;
  metadata?: Record<string, any>;
  fileInfo?: { filename: string };
  fileInfos?: { filename: string }[];
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
  onReasoning?: (content: string) => void;
  onToolCallStart: (name: string) => void;
  onToolCallDelta: (codeDelta: string) => void;
  onToolCallEnd: (fullCode: string) => void;
  onToolResult: (output: string, success: boolean) => void;
  onStatus?: (message: string) => void;
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
            if (parsed.type === 'reasoning') {
              callbacks.onReasoning?.(parsed.content || '');
            }
            if (parsed.content) {
              receivedContent = true;
              callbacks.onChunk(parsed.content);
            }
            if (parsed.type === 'tool_call_start') {
              callbacks.onToolCallStart(parsed.name || 'python_execute');
            }
            if (parsed.type === 'tool_call_delta') {
              callbacks.onToolCallDelta(parsed.code_delta || '');
            }
            if (parsed.type === 'tool_call_end') {
              callbacks.onToolCallEnd(parsed.code || '');
            }
            if (parsed.type === 'tool_result') {
              callbacks.onToolResult(parsed.output || '', parsed.success ?? true);
            }
            if (parsed.type === 'status') {
              callbacks.onStatus?.(parsed.message || '处理中...');
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
    callbacks.onDone();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }
    if (receivedContent) {
      callbacks.onDone();
    } else {
      callbacks.onError(err.message || '网络错误');
    }
  }
}

function getAuthHeaders(isJson = true) {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function getBaseURL() {
  return (request.defaults.baseURL || '').replace(/\/$/, '');
}

// ==================== 会话 API ====================

export function listConversations() {
  return request.get<any, any>('/chat/conversations');
}

export function createConversation(title?: string, agentId?: string) {
  return request.post<any, any>('/chat/conversations', { title, agent_id: agentId });
}

export function listAgents() {
  return request.get<any, any>('/agents');
}

export function getAgentTree() {
  return request.get<any, any>('/agents/tree');
}

export function deleteConversation(id: number) {
  return request.delete<any, any>(`/chat/conversations/${id}`);
}

export function renameConversation(id: number, title: string) {
  return request.patch<any, any>(`/chat/conversations/${id}`, { title });
}

export function getMessages(conversationId: number) {
  return request.get<any, any>(`/chat/conversations/${conversationId}/messages`);
}

// ==================== 工具：将后端消息映射为前端格式 ====================

export function mapBackendMessage(msg: any): ChatMessage {
  const msgType = msg.msg_type || 'text';
  const meta = msg.metadata || {};
  const result: ChatMessage = {
    id: msg.id,
    conversation_id: msg.conversation_id,
    role: msg.role,
    content: msg.content,
    created_at: msg.created_at,
    msg_type: msgType,
    type: msgType,
  };
  if (msgType === 'tool_call') {
    result.toolName = meta.tool_name || 'python_execute';
    result.toolCode = msg.content;
  } else if (msgType === 'tool_result') {
    result.toolOutput = msg.content;
    result.toolSuccess = meta.success ?? true;
  }
  if (msg.role === 'user') {
    if (meta.files && Array.isArray(meta.files)) {
      result.fileInfos = meta.files.map((f: any) => ({ filename: f.filename }));
    } else if (meta.filename) {
      result.fileInfo = { filename: meta.filename };
    }
  }
  return result;
}

// ==================== 文件上传 ====================

export async function uploadFile(file: File): Promise<{
  file_token: string;
  filename: string;
  summary: string;
  shape: number[];
  columns: string[];
} | null> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const resp = await fetch(`${getBaseURL()}/chat/upload`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    const json = await resp.json();
    if (json.code === 200) {
      return json.data;
    }
    console.error('Upload failed:', json.message);
    return null;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

// ==================== 流式发送消息 ====================

export async function sendMessageStream(
  conversationId: number,
  content: string,
  callbacks: StreamCallbacks,
  fileTokens?: string[],
  thinking?: boolean,
  signal?: AbortSignal,
) {
  try {
    const body: any = { content };
    if (fileTokens && fileTokens.length > 0) {
      body.file_tokens = fileTokens;
    }
    if (thinking !== undefined) {
      body.thinking = thinking;
    }

    const resp = await fetch(`${getBaseURL()}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
      signal,
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
      if (json.code === 200 && json.data?.assistant_message) {
        callbacks.onChunk(json.data.assistant_message.content);
        callbacks.onDone();
      } else {
        callbacks.onError(json.message || '未知错误');
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }
    callbacks.onError(err.message || '网络错误');
  }
}