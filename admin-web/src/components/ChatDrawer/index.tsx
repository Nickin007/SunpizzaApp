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
  Card,
} from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CloseOutlined,
  BookOutlined,
  ClearOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import type { ToolCall } from '../../api/chat';
import './style.css';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * 工具参数摘要：将工具的参数对象展示为简洁的中文文本
 */
function formatToolArgs(name: string, args: Record<string, any>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    const label = ARG_LABEL_MAP[key] || key;
    if (Array.isArray(value)) {
      parts.push(`${label}: ${value.join(', ')}`);
    } else if (typeof value === 'boolean') {
      parts.push(`${label}: ${value ? '是' : '否'}`);
    } else if (value !== undefined && value !== null && value !== '') {
      parts.push(`${label}: ${value}`);
    }
  }
  return parts.join(' | ') || '无参数';
}

const ARG_LABEL_MAP: Record<string, string> = {
  keyword: '关键词',
  keywords: '品牌列表',
  city: '城市',
  save_to_db: '保存到数据库',
  poi_category: 'POI类别',
  brand_name: '品牌',
  category: '分类',
  brands: '品牌列表',
  store_ids: '门店ID',
};

const ChatDrawer: React.FC = () => {
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
    sendMessage,
    pendingToolCalls,
    executingTools,
    toolStatus,
    confirmToolCalls,
    rejectToolCalls,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 非管理员不渲染
  if (!user || user.role !== 'admin') return null;

  // 加载会话列表
  useEffect(() => {
    if (drawerVisible && conversations.length === 0) {
      loadConversations();
    }
  }, [drawerVisible]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, pendingToolCalls, executingTools]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }
    const msg = inputValue.trim();
    setInputValue('');
    await sendMessage(msg);
  };

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 简单 Markdown 渲染（代码块、加粗、列表）
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    let inCodeBlock = false;
    const result: React.ReactNode[] = [];
    let codeBuffer: string[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          result.push(
            <pre key={`code-${idx}`} className="chat-code-block">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // List items
      if (line.startsWith('- ')) {
        result.push(
          <div key={idx} style={{ paddingLeft: 12 }}>
            &bull; {rendered.slice(0).map((r, i) => (typeof r === 'string' ? r.replace(/^- /, '') : r))}
          </div>
        );
      } else {
        result.push(
          <div key={idx}>
            {rendered}
          </div>
        );
      }
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      result.push(
        <pre key="code-end" className="chat-code-block">
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
    }

    return result;
  };

  // 渲染工具调用确认卡片
  const renderToolCallCard = () => {
    if (!pendingToolCalls || pendingToolCalls.length === 0) return null;

    return (
      <div className="chat-tool-call-card">
        <div className="chat-tool-call-header">
          <ToolOutlined style={{ color: '#faad14', marginRight: 6 }} />
          <Text strong style={{ color: '#faad14' }}>AI 请求调用工具</Text>
          <Tag color="warning" style={{ marginLeft: 8, fontSize: 11 }}>需要确认</Tag>
        </div>
        <div className="chat-tool-call-list">
          {pendingToolCalls.map((tc, idx) => (
            <div key={tc.id || idx} className="chat-tool-call-item">
              <div className="chat-tool-call-name">
                <Tag color="blue">{tc.name_cn}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>{tc.name}</Text>
              </div>
              <div className="chat-tool-call-args">
                <Text style={{ fontSize: 12 }}>{formatToolArgs(tc.name, tc.arguments)}</Text>
              </div>
            </div>
          ))}
        </div>
        <div className="chat-tool-call-actions">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={confirmToolCalls}
            loading={executingTools}
            style={{ marginRight: 8 }}
          >
            确认执行
          </Button>
          <Button
            icon={<CloseCircleOutlined />}
            onClick={rejectToolCalls}
            disabled={executingTools}
          >
            取消
          </Button>
        </div>
      </div>
    );
  };

  // 渲染工具执行中的状态（含状态信息 + 流式输出）
  const renderToolExecuting = () => {
    if (!executingTools) return null;
    return (
      <>
        {/* 工具状态消息 */}
        {toolStatus && (
          <div className="chat-tool-status">
            <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{toolStatus}</Text>
          </div>
        )}
        {/* 工具执行后的 AI 流式回复 */}
        {streamingContent ? (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-avatar">
              <div className="chat-avatar-assistant">
                <RobotOutlined />
              </div>
            </div>
            <div className="chat-message-bubble chat-bubble-assistant">
              {renderContent(streamingContent)}
              <span className="chat-cursor-blink">|</span>
            </div>
          </div>
        ) : (
          <div className="chat-tool-executing">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#1890ff' }} spin />} />
            <Text style={{ marginLeft: 8, color: '#1890ff', fontSize: 13 }}>
              {toolStatus || '正在执行工具调用，请稍候...'}
            </Text>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* 悬浮按钮 */}
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

      {/* 抽屉 */}
      <Drawer
        title={null}
        placement="right"
        width={440}
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
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => createConversation()}
              />
            </Tooltip>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setDrawerVisible(false)}
            />
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
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => createConversation()}
                  >
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
            <div className="chat-loading">
              <Spin tip="加载中..." />
            </div>
          ) : messages.length === 0 && !streamingContent ? (
            <div className="chat-empty">
              <Empty
                image={<RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">你好，我是圣比萨AI助手</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      有什么可以帮您的？
                    </Text>
                  </Space>
                }
              />
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message chat-message-${msg.role}`}
                >
                  <div className="chat-message-avatar">
                    {msg.role === 'user' ? (
                      <div className="chat-avatar-user">
                        <UserOutlined />
                      </div>
                    ) : (
                      <div className="chat-avatar-assistant">
                        <RobotOutlined />
                      </div>
                    )}
                  </div>
                  <div className={`chat-message-bubble chat-bubble-${msg.role}`}>
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}
              {/* Streaming indicator */}
              {sending && streamingContent && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-avatar">
                    <div className="chat-avatar-assistant">
                      <RobotOutlined />
                    </div>
                  </div>
                  <div className="chat-message-bubble chat-bubble-assistant">
                    {renderContent(streamingContent)}
                    <span className="chat-cursor-blink">|</span>
                  </div>
                </div>
              )}
              {sending && !streamingContent && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-avatar">
                    <div className="chat-avatar-assistant">
                      <RobotOutlined />
                    </div>
                  </div>
                  <div className="chat-message-bubble chat-bubble-assistant">
                    <div className="chat-typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              {/* Tool call confirmation card */}
              {renderToolCallCard()}
              {/* Tool executing indicator */}
              {renderToolExecuting()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending || executingTools}
            className="chat-input"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!inputValue.trim() || executingTools}
            className="chat-send-btn"
          />
        </div>
      </Drawer>
    </>
  );
};

export default ChatDrawer;
