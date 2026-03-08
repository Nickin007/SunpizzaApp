import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  PlusOutlined, DeleteOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  SunOutlined, MoonOutlined, ArrowLeftOutlined, SearchOutlined,
  EditOutlined, CloseOutlined, CheckOutlined,
} from '@ant-design/icons';
import { Popconfirm, Spin } from 'antd';
import { useChatStore } from '../../store/chatStore';
import { useThemeStore } from '../../store/themeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Conversation } from '../../api/chat';
import { renameConversation as apiRenameConversation } from '../../api/chat';
import '../../styles/agent-themes.css';
import './style.css';

interface DateGroup {
  label: string;
  items: Conversation[];
}

function groupByDate(conversations: Conversation[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const last7 = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, Conversation[]> = {
    '今天': [], '昨天': [], '最近 7 天': [], '更早': [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updated_at);
    if (d >= today) groups['今天'].push(conv);
    else if (d >= yesterday) groups['昨天'].push(conv);
    else if (d >= last7) groups['最近 7 天'].push(conv);
    else groups['更早'].push(conv);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

const AgentLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchTerm, setSearchTerm] = useState('');
  const { theme, toggleTheme } = useThemeStore();

  const {
    conversations, currentConversationId, loadingConversations,
    loadConversations, createConversation, deleteConversation, setCurrentConversation,
    loadAgents,
  } = useChatStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    loadConversations();
    loadAgents();
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.trim().toLowerCase();
    return conversations.filter((c) =>
      (c.title || '新对话').toLowerCase().includes(term)
    );
  }, [conversations, searchTerm]);

  const dateGroups = useMemo(() => groupByDate(filteredConversations), [filteredConversations]);

  const currentTitle = useMemo(() => {
    if (!currentConversationId) return '';
    const conv = conversations.find((c) => c.id === currentConversationId);
    return conv?.title || '新对话';
  }, [conversations, currentConversationId]);

  const handleNewChat = async () => {
    await createConversation();
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectConv = (id: number) => {
    setCurrentConversation(id);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="agent-layout">
      {isMobile && sidebarOpen && (
        <div className="agent-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`agent-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="agent-sidebar-header">
          <button className="agent-sidebar-newchat" onClick={handleNewChat}>
            <PlusOutlined /> 新建对话
          </button>
          <button
            className="agent-sidebar-collapse-btn"
            onClick={() => setSidebarOpen(false)}
            title="收起侧边栏"
          >
            <MenuFoldOutlined />
          </button>
        </div>

        <div className="agent-search-box">
          <SearchOutlined className="agent-search-icon" />
          <input
            className="agent-search-input"
            type="text"
            placeholder="搜索对话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <CloseOutlined className="agent-search-clear" onClick={() => setSearchTerm('')} />
          )}
        </div>

        <div className="agent-sidebar-list">
          {loadingConversations ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="agent-sidebar-empty">
              {searchTerm ? '无匹配对话' : '暂无对话'}
            </div>
          ) : (
            dateGroups.map((group) => (
              <div key={group.label} className="agent-date-group">
                <div className="agent-date-label">{group.label}</div>
                {group.items.map((conv) => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === currentConversationId}
                    onSelect={() => handleSelectConv(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                    onRename={async (newTitle: string) => {
                      await apiRenameConversation(conv.id, newTitle);
                      loadConversations();
                    }}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="agent-sidebar-footer">
          <a className="agent-back-btn" onClick={() => navigate('/portal-select')}>
            <ArrowLeftOutlined /> 返回
          </a>
          <button className="agent-theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <><MoonOutlined /> 深色</> : <><SunOutlined /> 浅色</>}
          </button>
        </div>
      </aside>

      <main className="agent-main">
        <div className="agent-topbar">
          {!sidebarOpen && (
            <button
              className="agent-toggle-sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuUnfoldOutlined />
            </button>
          )}
          {currentConversationId && (
            <div className="agent-topbar-title">{currentTitle}</div>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  );
};

/* ===== 会话列表项 ===== */
const ConvItem: React.FC<{
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => Promise<void>;
}> = ({ conv, active, onSelect, onDelete, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startEdit = () => {
    setEditValue(conv.title || '新对话');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmEdit = async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conv.title) {
      await onRename(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const handleClick = () => {
    if (editing) return;
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = undefined;
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = undefined;
      onSelect();
    }, 220);
  };

  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = undefined;
    }
    startEdit();
  };

  return (
    <div
      className={`agent-conv-item ${active ? 'active' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <div className="agent-conv-edit-row" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            className="agent-conv-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <button className="agent-conv-action-btn" onClick={confirmEdit} title="确认">
            <CheckOutlined />
          </button>
          <button className="agent-conv-action-btn" onClick={cancelEdit} title="取消">
            <CloseOutlined />
          </button>
        </div>
      ) : (
        <>
          <span className="agent-conv-title">{conv.title || '新对话'}</span>
          <div className="agent-conv-actions">
            <button className="agent-conv-action-btn" onClick={(e) => { e.stopPropagation(); startEdit(); }}>
              <EditOutlined />
            </button>
            <Popconfirm
              title="删除此对话？"
              onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}
              okText="删除"
              cancelText="取消"
            >
              <button className="agent-conv-action-btn delete" onClick={(e) => e.stopPropagation()}>
                <DeleteOutlined />
              </button>
            </Popconfirm>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentLayout;
