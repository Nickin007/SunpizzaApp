import React, { useEffect, useMemo, useRef, useState } from 'react';
import { message, Tooltip, Tag } from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined, PaperClipOutlined,
  LoadingOutlined, CodeOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CloseOutlined, RightOutlined, ThunderboltOutlined, DownOutlined, CheckOutlined,
  CopyOutlined, LockOutlined,
  RocketOutlined, ShoppingCartOutlined, GlobalOutlined, ShopOutlined, DollarOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import type { ChatMessage, AgentDefinition } from '../../api/chat';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const ICON_MAP: Record<string, React.ReactNode> = {
  RocketOutlined: <RocketOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  GlobalOutlined: <GlobalOutlined />,
  ShopOutlined: <ShopOutlined />,
  DollarOutlined: <DollarOutlined />,
};

function getAgentIcon(icon: string | null, size = 16): React.ReactNode {
  const node = (icon && ICON_MAP[icon]) || <RocketOutlined />;
  return <span style={{ fontSize: size }}>{node}</span>;
}

/* ===== 主组件 ===== */
const AgentChat: React.FC = () => {
  const {
    currentConversationId,
    messages, loadingMessages, sending, streamingContent, reasoningContent, statusMessage, sendMessage,
    stopGeneration,
    uploadedFiles, uploading, uploadFile, removeUploadedFile,
    createConversation,
    agents, currentAgentId, setCurrentAgent,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const agentPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const flatAgents = useMemo(() => {
    const result: AgentDefinition[] = [];
    const flatten = (list: AgentDefinition[]) => {
      for (const a of list) {
        result.push(a);
        if (a.children?.length) flatten(a.children);
      }
    };
    flatten(agents);
    return result;
  }, [agents]);

  const currentAgent = flatAgents.find((a) => a.id === currentAgentId);
  const visibleAgents = flatAgents.filter((a) => a.level <= 2);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (agentPickerRef.current && !agentPickerRef.current.contains(e.target as Node)) {
        setAgentPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    setInputValue('');
    const tokens = uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.fileToken) : undefined;
    if (!currentConversationId) {
      const newId = await createConversation();
      if (newId) setTimeout(() => sendMessage(text, tokens, thinkingEnabled), 100);
    } else {
      sendMessage(text, tokens, thinkingEnabled);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const fileArray = Array.from(fileList);
    e.target.value = '';
    for (const file of fileArray) {
      const ok = await uploadFile(file);
      if (!ok) message.error(`文件 ${file.name} 上传失败`);
    }
  };

  const inputBox = (
    <div className="agent-input-area">
      <div className="agent-input-wrapper">
        {uploadedFiles.length > 0 && (
          <div className="agent-input-file-tag">
            {uploadedFiles.map((f, i) => (
              <span className="tag" key={i}>
                <PaperClipOutlined />
                {f.filename}
                <CloseOutlined className="tag-close" onClick={() => removeUploadedFile(i)} />
              </span>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="agent-input-textarea"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="问点难的，让我多想一步"
          rows={1}
          disabled={sending}
        />
        <div className="agent-input-toolbar">
          <div className="agent-input-toolbar-left">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" multiple onChange={handleFileSelect} />
            <button
              className="agent-toolbar-btn attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              title="上传 Excel/CSV"
            >
              {uploading ? <LoadingOutlined /> : <PaperClipOutlined />}
            </button>
          </div>
          <div className="agent-input-toolbar-right">
            <button
              className={`agent-toolbar-capsule ${thinkingEnabled ? 'active' : ''}`}
              onClick={() => setThinkingEnabled(!thinkingEnabled)}
            >
              <ThunderboltOutlined />
              <span>深度思考</span>
            </button>

            <div className="agent-picker-wrap" ref={agentPickerRef}>
              <button
                className="agent-toolbar-capsule agent-picker-trigger"
                onClick={() => setAgentPickerOpen(!agentPickerOpen)}
              >
                {getAgentIcon(currentAgent?.icon || null, 13)}
                <span>{currentAgent?.name?.split(' - ')[1] || 'StrategyAI'}</span>
                <DownOutlined style={{ fontSize: 9 }} />
              </button>
              {agentPickerOpen && (
                <div className="agent-picker-dropdown">
                  {visibleAgents.map((agent) => {
                    const isActive = currentAgentId === agent.id;
                    const isPlaceholder = agent.status === 'placeholder';
                    const displayName = agent.name?.split(' - ')[1] || agent.name;
                    return (
                      <button
                        key={agent.id}
                        className={`agent-picker-option ${isActive ? 'active' : ''} ${isPlaceholder ? 'disabled' : ''}`}
                        disabled={isPlaceholder}
                        onClick={() => { if (!isPlaceholder) { setCurrentAgent(agent.id); setAgentPickerOpen(false); } }}
                      >
                        <span className="agent-picker-option-icon">{getAgentIcon(agent.icon, 14)}</span>
                        <span className="agent-picker-option-name">{displayName}</span>
                        {agent.level > 1 && <span className="agent-picker-option-level">L{agent.level}</span>}
                        {isPlaceholder && <LockOutlined style={{ fontSize: 10, opacity: 0.4 }} />}
                        {isActive && !isPlaceholder && <CheckOutlined style={{ fontSize: 11, color: 'var(--agent-accent)' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {sending ? (
              <button className="agent-toolbar-btn stop" onClick={stopGeneration} title="终止生成">
                <span className="stop-icon" />
              </button>
            ) : (
              <button className="agent-toolbar-btn send" onClick={handleSend} disabled={!inputValue.trim()}>
                <SendOutlined />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!currentConversationId) {
    return (
      <div className="agent-welcome">
        <div className="agent-welcome-inner">
          <div className="agent-welcome-hero">
            <div className="agent-welcome-logo">
              {getAgentIcon(currentAgent?.icon || 'RocketOutlined', 32)}
            </div>
            <h1 className="agent-welcome-title">
              {currentAgent?.name?.split(' - ')[1] || 'AI 助手'}
            </h1>
            <p className="agent-welcome-subtitle">
              {currentAgent?.description || '选择一个 Agent 开始对话'}
            </p>
          </div>

          <div className="agent-cards-section">
            <div className="agent-cards-grid">
              {visibleAgents.map((agent) => {
                const isActive = currentAgentId === agent.id;
                const isPlaceholder = agent.status === 'placeholder';
                const displayName = agent.name?.split(' - ')[1] || agent.name;
                return (
                  <button
                    key={agent.id}
                    className={`agent-card ${isActive ? 'active' : ''} ${isPlaceholder ? 'disabled' : ''}`}
                    onClick={() => !isPlaceholder && setCurrentAgent(agent.id)}
                    disabled={isPlaceholder}
                  >
                    <div className={`agent-card-icon ${isActive ? 'highlight' : ''}`}>
                      {getAgentIcon(agent.icon, 18)}
                    </div>
                    <div className="agent-card-info">
                      <div className="agent-card-name">{displayName}</div>
                      <div className="agent-card-desc">{agent.description || ''}</div>
                    </div>
                    {isPlaceholder && <Tag className="agent-card-tag">即将上线</Tag>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {inputBox}
      </div>
    );
  }

  return (
    <div className="agent-chat-container">
      <div className="agent-messages">
        {loadingMessages ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <LoadingOutlined style={{ fontSize: 24, color: 'var(--agent-text-tertiary)' }} />
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="agent-messages-inner">
            <div className="agent-empty-conv">
              <div className="agent-empty-conv-icon">{getAgentIcon(currentAgent?.icon || null, 28)}</div>
              <div className="agent-empty-conv-text">有什么可以帮您？</div>
            </div>
          </div>
        ) : (
          <div className="agent-messages-inner">
            <MessageList messages={messages} />

            {sending && (reasoningContent || streamingContent) && (
              <div className="agent-msg">
                <div className="agent-msg-icon assistant"><RobotOutlined /></div>
                <div className="agent-msg-body">
                  {reasoningContent && (
                    <ReasoningBlock content={reasoningContent} isStreaming={!streamingContent} />
                  )}
                  {streamingContent && (
                    <>
                      <MarkdownRenderer content={streamingContent} />
                      <span className="agent-cursor" />
                    </>
                  )}
                </div>
              </div>
            )}

            {sending && !streamingContent && !reasoningContent && (
              <div className="agent-thinking">
                <div className="agent-msg-icon assistant"><RobotOutlined /></div>
                <div className="agent-msg-body">
                  {statusMessage ? (
                    <span style={{ color: 'var(--agent-text-secondary)', fontSize: 14 }}>
                      <LoadingOutlined style={{ marginRight: 6 }} />
                      {statusMessage}
                    </span>
                  ) : (
                    <div className="agent-thinking-dots"><span /><span /><span /></div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {inputBox}
    </div>
  );
};

/* ===== 消息列表 ===== */
const MessageList: React.FC<{ messages: ChatMessage[] }> = ({ messages }) => {
  const groups: (ChatMessage | { type: 'tool_group'; call: ChatMessage; result?: ChatMessage })[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === 'tool_call') {
      const next = messages[i + 1];
      if (next && next.type === 'tool_result') {
        groups.push({ type: 'tool_group', call: msg, result: next });
        i++;
      } else {
        groups.push({ type: 'tool_group', call: msg });
      }
    } else if (msg.type === 'tool_result') {
      groups.push({ type: 'tool_group', call: msg });
    } else {
      groups.push(msg);
    }
  }

  return (
    <>
      {groups.map((item, idx) => {
        if ('type' in item && item.type === 'tool_group') {
          return <ToolBlock key={idx} call={item.call} result={item.result} />;
        }
        const msg = item as ChatMessage;
        return <MessageItem key={msg.id} msg={msg} />;
      })}
    </>
  );
};

/* ===== 单条消息 ===== */
const MessageItem: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="agent-msg">
      <div className={`agent-msg-icon ${msg.role === 'user' ? 'user' : 'assistant'}`}>
        {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
      </div>
      <div className={`agent-msg-body ${msg.role === 'user' ? 'user-body' : ''}`}>
        {msg.role === 'user' && msg.fileInfos && msg.fileInfos.length > 0 && (
          <div className="agent-msg-file">
            {msg.fileInfos.map((f, i) => (
              <span key={i} style={{ marginRight: 8 }}><PaperClipOutlined /> {f.filename}</span>
            ))}
          </div>
        )}
        {msg.role === 'user' && !msg.fileInfos && msg.fileInfo && (
          <div className="agent-msg-file"><PaperClipOutlined /> {msg.fileInfo.filename}</div>
        )}
        {msg.role === 'user' ? msg.content : <MarkdownRenderer content={msg.content} />}
        {msg.role === 'assistant' && msg.content && (
          <div className="agent-msg-actions">
            <Tooltip title={copied ? '已复制' : '复制'}>
              <button className="agent-msg-action-btn" onClick={handleCopy}>
                {copied ? <CheckOutlined /> : <CopyOutlined />}
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

/* ===== 思考过程折叠块 ===== */
const ReasoningBlock: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="agent-reasoning-block">
      <div className="agent-reasoning-header" onClick={() => setOpen(!open)}>
        <RightOutlined className={`agent-tool-chevron ${open ? 'open' : ''}`} />
        <ThunderboltOutlined />
        <span>深度思考</span>
        {isStreaming && <LoadingOutlined style={{ marginLeft: 8, fontSize: 12 }} />}
      </div>
      <div className={`agent-reasoning-body ${open ? 'open' : ''}`}>
        <pre>{content}</pre>
      </div>
    </div>
  );
};

/* ===== 工具执行折叠块 ===== */
const ToolBlock: React.FC<{ call: ChatMessage; result?: ChatMessage }> = ({ call, result }) => {
  const [open, setOpen] = useState(false);
  const success = result?.toolSuccess !== false;
  const code = call.toolCode || call.content;
  const output = result?.toolOutput || result?.content || '';

  let statusClass = 'running';
  let statusText = '执行中...';
  let StatusIcon = LoadingOutlined;
  if (result) {
    statusClass = success ? 'success' : 'error';
    statusText = success ? '执行成功' : '执行出错';
    StatusIcon = success ? CheckCircleOutlined : CloseCircleOutlined;
  }

  return (
    <div className="agent-tool-block">
      <div className="agent-tool-header" onClick={() => setOpen(!open)}>
        <RightOutlined className={`agent-tool-chevron ${open ? 'open' : ''}`} />
        <CodeOutlined />
        <span>执行 Python 代码</span>
        <span className={`agent-tool-status ${statusClass}`}>
          <StatusIcon /> {statusText}
        </span>
      </div>
      <div className={`agent-tool-body ${open ? 'open' : ''}`}>
        <div className="agent-tool-code"><pre><code>{code}</code></pre></div>
        {output && <div className="agent-tool-output"><pre>{output}</pre></div>}
      </div>
    </div>
  );
};

export default AgentChat;
