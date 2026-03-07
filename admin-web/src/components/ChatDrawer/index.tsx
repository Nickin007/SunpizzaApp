import React, { useEffect, useRef, useState } from 'react';
import {
  Drawer,
  Button,
  Input,
  Select,
  Tooltip,
  Popconfirm,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Divider,
  message,
} from 'antd';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CloseOutlined,
  PaperClipOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import type { ChatMessage } from '../../api/chat';
import MarkdownRenderer from '../MarkdownRenderer';
import './style.css';

const { TextArea } = Input;
const { Text } = Typography;

const ChatDrawer: React.FC = () => {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const {
    drawerVisible,
    toggleDrawer,
    setDrawerVisible,
    conversations,
    currentConversationId,
    loadingConversations,
    loadConversations,
    createConversation,
    deleteConversation,
    setCurrentConversation,
    messages,
    loadingMessages,
    sending,
    streamingContent,
    statusMessage,
    sendMessage,
    uploadedFiles,
    uploading,
    uploadFile,
    removeUploadedFile,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user || !user.roles?.includes('admin')) return null;

  useEffect(() => {
    if (drawerVisible && conversations.length === 0) {
      loadConversations();
    }
  }, [drawerVisible]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }
    const msg = inputValue.trim();
    const tokens = uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.fileToken) : undefined;
    setInputValue('');
    await sendMessage(msg, tokens);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const ok = await uploadFile(file);
    if (!ok) {
      message.error('文件上传失败');
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'tool_call') {
      return (
        <div key={msg.id} className="chat-message chat-message-assistant">
          <div className="chat-message-avatar">
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#722ed1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CodeOutlined style={{ color: '#fff', fontSize: 13 }} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#722ed1', fontWeight: 500, marginBottom: 2 }}>AI 执行代码</div>
            <pre style={{
              margin: 0, padding: 8, background: '#1e1e1e', color: '#d4d4d4',
              borderRadius: 6, fontSize: 12, lineHeight: 1.4, overflowX: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200,
            }}>
              <code>{msg.toolCode || msg.content}</code>
            </pre>
          </div>
        </div>
      );
    }

    if (msg.type === 'tool_result') {
      return (
        <div key={msg.id} className="chat-message chat-message-assistant">
          <div className="chat-message-avatar">
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: msg.toolSuccess ? '#52c41a' : '#ff4d4f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.toolSuccess
                ? <CheckCircleOutlined style={{ color: '#fff', fontSize: 13 }} />
                : <CloseCircleOutlined style={{ color: '#fff', fontSize: 13 }} />}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, color: msg.toolSuccess ? '#52c41a' : '#ff4d4f' }}>
              {msg.toolSuccess ? '执行结果' : '执行出错'}
            </div>
            <pre style={{
              margin: 0, padding: 8, background: '#f6f8fa', border: '1px solid #e1e4e8',
              borderRadius: 6, fontSize: 12, lineHeight: 1.4, overflowX: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 250,
            }}>
              {msg.toolOutput || msg.content}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
        <div className="chat-message-avatar">
          {msg.role === 'user' ? (
            <div className="chat-avatar-user"><UserOutlined /></div>
          ) : (
            <div className="chat-avatar-assistant"><RobotOutlined /></div>
          )}
        </div>
        <div className={`chat-message-bubble chat-bubble-${msg.role}`}>
          {msg.role === 'user' && msg.fileInfo && (
            <div style={{
              padding: '4px 10px', background: 'rgba(255,255,255,0.15)',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            }}>
              <PaperClipOutlined />
              <span>{msg.fileInfo.filename}</span>
            </div>
          )}
          {msg.role === 'user' ? msg.content : <MarkdownRenderer content={msg.content} compact />}
        </div>
      </div>
    );
  };

  return (
    <>
      <Tooltip title="AI 助手" placement="left">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined />}
          className="chat-fab-button"
          onClick={toggleDrawer}
        />
      </Tooltip>

      <Drawer
        title={null}
        placement="right"
        width={isMobile ? '100%' : 440}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        closable={false}
        className="chat-drawer"
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
          header: { display: 'none' },
        }}
      >
        {/* Header */}
        <div className="chat-drawer-header">
          <div className="chat-drawer-header-left">
            <RobotOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span className="chat-drawer-title">AI 助手</span>
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>DeepSeek</Tag>
          </div>
          <div className="chat-drawer-header-right">
            <Tooltip title="新对话">
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => createConversation()} />
            </Tooltip>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setDrawerVisible(false)} />
          </div>
        </div>

        {/* Conversation Selector */}
        <div className="chat-conv-selector">
          <Select
            style={{ flex: 1 }}
            size="small"
            placeholder="选择会话..."
            value={currentConversationId}
            onChange={(val) => setCurrentConversation(val)}
            loading={loadingConversations}
            options={conversations.map((c) => ({
              label: c.title || '新对话',
              value: c.id,
            }))}
            allowClear
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ padding: '4px 8px' }}>
                  <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => createConversation()}>
                    新建对话
                  </Button>
                </div>
              </>
            )}
          />
          {currentConversationId && (
            <Popconfirm
              title="确定删除此会话？"
              onConfirm={() => currentConversationId && deleteConversation(currentConversationId)}
              okText="删除"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </div>

        {/* Messages Area */}
        <div className="chat-messages-area">
          {loadingMessages ? (
            <div className="chat-loading"><Spin tip="加载中..." /></div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="chat-empty">
              <Empty
                image={<RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">你好，我是圣比萨AI助手</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>有什么可以帮您的？</Text>
                  </Space>
                }
              />
            </div>
          ) : (
            <>
              {messages.map((msg) => renderMessage(msg))}

              {sending && streamingContent && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-avatar">
                    <div className="chat-avatar-assistant"><RobotOutlined /></div>
                  </div>
                  <div className="chat-message-bubble chat-bubble-assistant">
                    <MarkdownRenderer content={streamingContent} compact />
                    <span className="chat-cursor-blink">|</span>
                  </div>
                </div>
              )}
              {sending && !streamingContent && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-avatar">
                    <div className="chat-avatar-assistant"><RobotOutlined /></div>
                  </div>
                  <div className="chat-message-bubble chat-bubble-assistant">
                    {statusMessage ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LoadingOutlined style={{ color: '#722ed1' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{statusMessage}</Text>
                      </div>
                    ) : (
                      <div className="chat-typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Uploaded file tag */}
        {uploadedFiles.length > 0 && (
          <div style={{
            padding: '4px 12px', background: '#f6ffed', borderTop: '1px solid #b7eb8f',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
          }}>
            <PaperClipOutlined style={{ color: '#52c41a' }} />
            {uploadedFiles.map((f, i) => (
              <Tag key={i} color="green" closable onClose={() => removeUploadedFile(i)} style={{ fontSize: 11 }}>
                {f.filename}
              </Tag>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="chat-input-area">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />
          <Button
            type="text"
            size="small"
            icon={uploading ? <LoadingOutlined /> : <PaperClipOutlined />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            title="上传 Excel/CSV"
            style={{ flexShrink: 0 }}
          />
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uploadedFiles.length > 0 ? "输入分析问题..." : "输入消息... (Enter 发送)"}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending}
            className="chat-input"
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!inputValue.trim()}
            className="chat-send-btn"
          />
        </div>
      </Drawer>
    </>
  );
};

export default ChatDrawer;
