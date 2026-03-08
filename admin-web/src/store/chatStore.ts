import { create } from 'zustand';
import type { Conversation, ChatMessage, AgentDefinition } from '../api/chat';
import {
  listConversations,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  getMessages,
  sendMessageStream,
  uploadFile as apiUploadFile,
  mapBackendMessage,
  getAgentTree,
} from '../api/chat';

interface UploadedFile {
  fileToken: string;
  filename: string;
  summary: string;
}

interface ChatState {
  drawerVisible: boolean;
  toggleDrawer: () => void;
  setDrawerVisible: (visible: boolean) => void;

  agents: AgentDefinition[];
  currentAgentId: string;
  loadAgents: () => Promise<void>;
  setCurrentAgent: (agentId: string) => void;

  conversations: Conversation[];
  currentConversationId: number | null;
  loadingConversations: boolean;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string, agentId?: string) => Promise<number | null>;
  deleteConversation: (id: number) => Promise<void>;
  setCurrentConversation: (id: number | null) => void;

  messages: ChatMessage[];
  loadingMessages: boolean;
  loadMessages: (conversationId: number) => Promise<void>;

  sending: boolean;
  streamingContent: string;
  reasoningContent: string;
  statusMessage: string;
  sendMessage: (content: string, fileTokens?: string[], thinking?: boolean) => Promise<void>;
  stopGeneration: () => void;

  uploadedFiles: UploadedFile[];
  uploading: boolean;
  uploadFile: (file: File) => Promise<boolean>;
  removeUploadedFile: (index: number) => void;
  clearAllUploadedFiles: () => void;
}

const activeStreams = new Map<number, AbortController>();

export const useChatStore = create<ChatState>((set, get) => ({
  drawerVisible: false,
  toggleDrawer: () => set((s) => ({ drawerVisible: !s.drawerVisible })),
  setDrawerVisible: (visible) => set({ drawerVisible: visible }),

  agents: [],
  currentAgentId: 'strategy_ai',

  loadAgents: async () => {
    try {
      const resp = await getAgentTree();
      if (resp.data?.code === 200) {
        set({ agents: resp.data.data || [] });
      }
    } catch (e) {
      console.error('加载 Agent 列表失败', e);
    }
  },

  setCurrentAgent: (agentId) => {
    set({ currentAgentId: agentId });
  },

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

  createConversation: async (title, agentId) => {
    try {
      const aid = agentId || get().currentAgentId;
      const resp = await apiCreateConversation(title, aid);
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
      activeStreams.get(id)?.abort();
      activeStreams.delete(id);
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
    if (activeStreams.has(id!)) {
      activeStreams.get(id!)?.abort();
      activeStreams.delete(id!);
    }
    set({ currentConversationId: id, messages: [], sending: false, streamingContent: '', statusMessage: '' });
    if (id) {
      get().loadMessages(id);
    }
  },

  messages: [],
  loadingMessages: false,

  loadMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const resp = await getMessages(conversationId);
      if (resp.data?.code === 200) {
        const rawMessages = resp.data.data || [];
        const mapped = rawMessages.map(mapBackendMessage);
        set({ messages: mapped });
      }
    } catch (e) {
      console.error('加载消息失败', e);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sending: false,
  streamingContent: '',
  reasoningContent: '',
  statusMessage: '',

  sendMessage: async (content, fileTokens, thinking) => {
    const { currentConversationId, messages } = get();
    if (!currentConversationId || !content.trim()) return;

    const convId = currentConversationId;

    activeStreams.get(convId)?.abort();
    const abortController = new AbortController();
    activeStreams.set(convId, abortController);

    const files = get().uploadedFiles;
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: convId,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      ...(files.length > 0 ? { fileInfos: files.map((f) => ({ filename: f.filename })) } : {}),
    };

    set({
      sending: true,
      streamingContent: '',
      reasoningContent: '',
      statusMessage: '',
      messages: [...messages, tempUserMsg],
      uploadedFiles: [],
    });

    await sendMessageStream(convId, content.trim(), {
      onChunk: (text) => {
        if (get().currentConversationId !== convId) return;
        set((s) => ({ streamingContent: s.streamingContent + text, statusMessage: '', reasoningContent: '' }));
      },

      onReasoning: (content) => {
        if (get().currentConversationId !== convId) return;
        set((s) => ({ reasoningContent: s.reasoningContent + content, statusMessage: '' }));
      },

      onToolCallStart: (name) => {
        if (get().currentConversationId !== convId) return;
        const { streamingContent, messages: msgs } = get();
        const newMsgs = [...msgs];
        if (streamingContent) {
          newMsgs.push({
            id: Date.now(),
            conversation_id: convId,
            role: 'assistant',
            content: streamingContent,
            created_at: new Date().toISOString(),
          });
        }
        newMsgs.push({
          id: Date.now() + 1,
          conversation_id: convId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          type: 'tool_call',
          toolName: name,
          toolCode: '',
        });
        set({ messages: newMsgs, streamingContent: '', statusMessage: '' });
      },

      onToolCallDelta: (codeDelta) => {
        if (get().currentConversationId !== convId) return;
        set((s) => {
          const msgs = [...s.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === 'tool_call') {
              msgs[i] = {
                ...msgs[i],
                toolCode: (msgs[i].toolCode || '') + codeDelta,
                content: (msgs[i].toolCode || '') + codeDelta,
              };
              break;
            }
          }
          return { messages: msgs };
        });
      },

      onToolCallEnd: (fullCode) => {
        if (get().currentConversationId !== convId) return;
        set((s) => {
          const msgs = [...s.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].type === 'tool_call') {
              msgs[i] = { ...msgs[i], toolCode: fullCode, content: fullCode };
              break;
            }
          }
          return { messages: msgs };
        });
      },

      onToolResult: (output, success) => {
        if (get().currentConversationId !== convId) return;
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: Date.now() + 2,
              conversation_id: convId,
              role: 'assistant',
              content: output,
              created_at: new Date().toISOString(),
              type: 'tool_result',
              toolOutput: output,
              toolSuccess: success,
            },
          ],
          statusMessage: '',
        }));
      },

      onStatus: (message) => {
        if (get().currentConversationId !== convId) return;
        set({ statusMessage: message });
      },

      onDone: () => {
        activeStreams.delete(convId);
        if (get().currentConversationId !== convId) return;
        const { streamingContent } = get();
        if (streamingContent) {
          const assistantMsg: ChatMessage = {
            id: Date.now() + 3,
            conversation_id: convId,
            role: 'assistant',
            content: streamingContent,
            created_at: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            sending: false,
            streamingContent: '',
            reasoningContent: '',
            statusMessage: '',
          }));
        } else {
          set({ sending: false, streamingContent: '', reasoningContent: '', statusMessage: '' });
        }
        get().loadConversations();
      },

      onError: (err) => {
        activeStreams.delete(convId);
        if (get().currentConversationId !== convId) return;
        const errorMsg: ChatMessage = {
          id: Date.now() + 4,
          conversation_id: convId,
          role: 'assistant',
          content: `[错误] ${err}`,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, errorMsg],
          sending: false,
          streamingContent: '',
          reasoningContent: '',
          statusMessage: '',
        }));
      },
    }, fileTokens, thinking, abortController.signal);
  },

  stopGeneration: () => {
    const convId = get().currentConversationId;
    if (!convId) return;
    activeStreams.get(convId)?.abort();
    activeStreams.delete(convId);
    const { streamingContent } = get();
    if (streamingContent) {
      const msg: ChatMessage = {
        id: Date.now(),
        conversation_id: convId,
        role: 'assistant',
        content: streamingContent,
        created_at: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, msg],
        sending: false,
        streamingContent: '',
        reasoningContent: '',
        statusMessage: '',
      }));
    } else {
      set({ sending: false, streamingContent: '', reasoningContent: '', statusMessage: '' });
    }
  },

  uploadedFiles: [],
  uploading: false,

  uploadFile: async (file) => {
    set({ uploading: true });
    try {
      const result = await apiUploadFile(file);
      if (result) {
        set((s) => ({
          uploadedFiles: [
            ...s.uploadedFiles,
            { fileToken: result.file_token, filename: result.filename, summary: result.summary },
          ],
          uploading: false,
        }));
        return true;
      }
      set({ uploading: false });
      return false;
    } catch (e) {
      console.error('上传文件失败', e);
      set({ uploading: false });
      return false;
    }
  },

  removeUploadedFile: (index) =>
    set((s) => ({ uploadedFiles: s.uploadedFiles.filter((_, i) => i !== index) })),

  clearAllUploadedFiles: () => set({ uploadedFiles: [] }),
}));
