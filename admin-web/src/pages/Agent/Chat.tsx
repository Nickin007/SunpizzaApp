import React, { useEffect, useRef, useState } from 'react';
import { message, Switch, Tooltip } from 'antd';
import {
  SendOutlined, RobotOutlined, UserOutlined, PaperClipOutlined,
  LoadingOutlined, CodeOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CloseOutlined, RightOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import type { ChatMessage } from '../../api/chat';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const AgentChat: React.FC = () => {
  const {
    currentConversationId,
    messages, loadingMessages, sending, streamingContent, reasoningContent, statusMessage, sendMessage,
    stopGeneration,
    uploadedFiles, uploading, uploadFile, removeUploadedFile,
    createConversation,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {!currentConversationId ? (
        <div className="agent-empty">
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: 'var(--agent-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8,
          }}>
            <RobotOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <div className="agent-empty-text" style={{ fontWeight: 500 }}>圣比萨 AI 助手</div>
          <div style={{ color: 'var(--agent-text-tertiary)', fontSize: 14 }}>
            选择一个对话或创建新对话开始
          </div>
        </div>
      ) : (
        <>
          <div className="agent-messages">
            {loadingMessages ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <LoadingOutlined style={{ fontSize: 24, color: 'var(--agent-text-tertiary)' }} />
              </div>
            ) : messages.length === 0 && !sending ? (
              <div className="agent-messages-inner">
                <div className="agent-empty">
                  <RobotOutlined className="agent-empty-icon" />
                  <div className="agent-empty-text">开始新的对话</div>
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
                        <div className="agent-thinking-dots">
                          <span /><span /><span />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 输入区域 */}
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
              <div className="agent-input-row">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls,.csv"
                  multiple
                  onChange={handleFileSelect}
                />
                <button
                  className="agent-input-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  title="上传 Excel/CSV"
                >
                  {uploading ? <LoadingOutlined /> : <PaperClipOutlined />}
                </button>
                <Tooltip title={thinkingEnabled ? '深度思考已开启' : '深度思考已关闭'}>
                  <div className={`agent-thinking-toggle ${thinkingEnabled ? 'active' : ''}`}
                    onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  >
                    <ThunderboltOutlined />
                    <span className="agent-thinking-toggle-label">深度思考</span>
                  </div>
                </Tooltip>
                <textarea
                  ref={textareaRef}
                  className="agent-input-textarea"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息... (Shift+Enter 换行)"
                  rows={1}
                  disabled={sending}
                />
                {sending ? (
                  <button
                    className="agent-input-btn stop"
                    onClick={stopGeneration}
                    title="终止生成"
                  >
                    <span style={{
                      display: 'inline-block', width: 12, height: 12,
                      borderRadius: 2, background: 'currentColor',
                    }} />
                  </button>
                ) : (
                  <button
                    className="agent-input-btn send"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                  >
                    <SendOutlined />
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ===== 消息列表（合并 tool_call + tool_result 为折叠块）===== */
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
const MessageItem: React.FC<{ msg: ChatMessage }> = ({ msg }) => (
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
        <div className="agent-msg-file">
          <PaperClipOutlined /> {msg.fileInfo.filename}
        </div>
      )}
      {msg.role === 'user' ? msg.content : <MarkdownRenderer content={msg.content} />}
    </div>
  </div>
);

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

  const isRunning = !result;
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
        <div className="agent-tool-code">
          <pre><code>{code}</code></pre>
        </div>
        {output && (
          <div className="agent-tool-output">
            <pre>{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentChat;
