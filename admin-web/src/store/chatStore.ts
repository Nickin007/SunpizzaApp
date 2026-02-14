import { create } from 'zustand';
import type { Conversation, ChatMessage, ToolCall } from '../api/chat';
import {
  listConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  getMessages,
  sendMessageStream,
  executeToolsStream,
} from '../api/chat';

interface ChatState {
  // UI state
  drawerVisible: boolean;
  toggleDrawer: () => void;
  setDrawerVisible: (visible: boolean) => void;

  // Conversations
  conversations: Conversation[];
  currentConversationId: number | null;
  loadingConversations: boolean;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<number | null>;
  deleteConversation: (id: number) => Promise<void>;
  setCurrentConversation: (id: number | null) => void;

  // Messages
  messages: ChatMessage[];
  loadingMessages: boolean;
  loadMessages: (conversationId: number) => Promise<void>;

  // Sending (streaming)
  sending: boolean;
  streamingContent: string;
  sendMessage: (content: string) => Promise<void>;

  // Tool calls
  pendingToolCalls: ToolCall[] | null;
  toolContext: any[];  // 多轮工具调用时保存的前几轮上下文
  executingTools: boolean;
  toolStatus: string;
  confirmToolCalls: () => Promise<void>;
  rejectToolCalls: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // UI state
  drawerVisible: false,
  toggleDrawer: () => set((s) => ({ drawerVisible: !s.drawerVisible })),
  setDrawerVisible: (visible) => set({ drawerVisible: visible }),

  // Conversations
  conversations: [],
  currentConversationId: null,
  loadingConversations: false,

  loadConversations: async () => {
    set({ loadingConversations: true });
    try {
      const resp = await listConversations();
      if (resp.data?.code === 200) {
        set({ conversations: resp.data.data || [] });
      }
    } catch (e) {
      console.error('加载会话列表失败', e);
    } finally {
      set({ loadingConversations: false });
    }
  },

  createConversation: async (title) => {
    try {
      const resp = await apiCreateConversation(title);
      if (resp.data?.code === 200) {
        const newConv = resp.data.data;
        set((s) => ({
          conversations: [newConv, ...s.conversations],
          currentConversationId: newConv.id,
          messages: [],
        }));
        return newConv.id;
      }
    } catch (e) {
      console.error('创建会话失败', e);
    }
    return null;
  },

  deleteConversation: async (id) => {
    try {
      await apiDeleteConversation(id);
      set((s) => {
        const newConvs = s.conversations.filter((c) => c.id !== id);
        const newCurrent =
          s.currentConversationId === id
            ? newConvs.length > 0
              ? newConvs[0].id
              : null
            : s.currentConversationId;
        return {
          conversations: newConvs,
          currentConversationId: newCurrent,
          messages: s.currentConversationId === id ? [] : s.messages,
        };
      });
      const state = get();
      if (state.currentConversationId) {
        await state.loadMessages(state.currentConversationId);
      }
    } catch (e) {
      console.error('删除会话失败', e);
    }
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id, messages: [], pendingToolCalls: null, toolContext: [], toolStatus: '' });
    if (id) {
      get().loadMessages(id);
    }
  },

  // Messages
  messages: [],
  loadingMessages: false,

  loadMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const resp = await getMessages(conversationId);
      if (resp.data?.code === 200) {
        set({ messages: resp.data.data || [] });
      }
    } catch (e) {
      console.error('加载消息失败', e);
    } finally {
      set({ loadingMessages: false });
    }
  },

  // Sending
  sending: false,
  streamingContent: '',

  sendMessage: async (content) => {
    const { currentConversationId, messages } = get();
    if (!currentConversationId || !content.trim()) return;

    // Optimistic: add user message to UI
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: currentConversationId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    set({
      sending: true,
      streamingContent: '',
      messages: [...messages, tempUserMsg],
      pendingToolCalls: null,
      toolContext: [],
      toolStatus: '',
    });

    await sendMessageStream(currentConversationId, content.trim(), {
      onChunk: (text) => {
        set((s) => ({ streamingContent: s.streamingContent + text }));
      },
      onToolCalls: (toolCalls, toolContext) => {
        // AI 想调用工具 - 显示确认卡片（第一轮 toolContext 为空）
        set({ pendingToolCalls: toolCalls, toolContext: toolContext || [], sending: false, streamingContent: '' });
      },
      onToolStatus: (message) => {
        set({ toolStatus: message });
      },
      onDone: () => {
        const { streamingContent } = get();
        if (streamingContent) {
          // 流式结束，将 streamingContent 转为正式消息
          const assistantMsg: ChatMessage = {
            id: Date.now() + 1,
            conversation_id: currentConversationId,
            role: 'assistant',
            content: streamingContent,
            created_at: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            sending: false,
            streamingContent: '',
          }));
          get().loadConversations();
        } else {
          set({ sending: false, streamingContent: '' });
        }
      },
      onError: (err) => {
        const errorMsg: ChatMessage = {
          id: Date.now() + 1,
          conversation_id: currentConversationId,
          role: 'assistant',
          content: `[错误] ${err}`,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, errorMsg],
          sending: false,
          streamingContent: '',
        }));
      },
    });
  },

  // Tool calls
  pendingToolCalls: null,
  toolContext: [],
  executingTools: false,
  toolStatus: '',

  confirmToolCalls: async () => {
    const { currentConversationId, pendingToolCalls, toolContext } = get();
    if (!currentConversationId || !pendingToolCalls) return;

    const toolCallsCopy = [...pendingToolCalls];
    const toolContextCopy = [...toolContext];
    set({
      executingTools: true,
      pendingToolCalls: null,
      streamingContent: '',
      toolStatus: '',
    });

    await executeToolsStream(currentConversationId, toolCallsCopy, toolContextCopy, {
      onChunk: (text) => {
        set((s) => ({ streamingContent: s.streamingContent + text }));
      },
      onToolCalls: (toolCalls, newToolContext) => {
        // AI 又想调用更多工具（多轮）- 保存累积的上下文
        set({
          pendingToolCalls: toolCalls,
          toolContext: newToolContext || [],
          executingTools: false,
          streamingContent: '',
          toolStatus: '',
        });
      },
      onToolStatus: (message) => {
        set({ toolStatus: message });
      },
      onDone: () => {
        const { streamingContent } = get();
        if (streamingContent) {
          const assistantMsg: ChatMessage = {
            id: Date.now() + 1,
            conversation_id: currentConversationId,
            role: 'assistant',
            content: streamingContent,
            created_at: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            executingTools: false,
            streamingContent: '',
            toolStatus: '',
          }));
          get().loadConversations();
        } else {
          set({ executingTools: false, streamingContent: '', toolStatus: '' });
        }
      },
      onError: (err) => {
        const errorMsg: ChatMessage = {
          id: Date.now() + 1,
          conversation_id: currentConversationId,
          role: 'assistant',
          content: `[工具执行错误] ${err}`,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, errorMsg],
          executingTools: false,
          streamingContent: '',
          toolStatus: '',
        }));
      },
    });
  },

  rejectToolCalls: () => {
    const { currentConversationId } = get();
    const rejectMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: currentConversationId || 0,
      role: 'assistant',
      content: '已取消工具调用。',
      created_at: new Date().toISOString(),
    };
    set((s) => ({
      pendingToolCalls: null,
      toolContext: [],
      toolStatus: '',
      messages: [...s.messages, rejectMsg],
    }));
  },
}));
