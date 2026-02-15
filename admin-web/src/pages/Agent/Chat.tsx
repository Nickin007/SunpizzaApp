import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Tooltip,
  Popconfirm,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Card,
  List,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import type { ToolCall } from '../../api/chat';

const { TextArea } = Input;
const { Text, Title } = Typography;

const ARG_LABEL_MAP: Record<string, string> = {
  keyword: '关键词', keywords: '品牌列表', city: '城市',
  save_to_db: '保存到数据库', poi_category: 'POI类别',
  brand_name: '品牌', category: '分类', brands: '品牌列表', store_ids: '门店ID',
  max_pages: '最大页数', longitude: '经度', latitude: '纬度',
  radius_meters: '半径(米)', brand_filter: '品牌筛选',
};

function formatToolArgs(args: Record<string, any>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    const label = ARG_LABEL_MAP[key] || key;
    if (Array.isArray(value)) parts.push(`${label}: ${value.join(', ')}`);
    else if (typeof value === 'boolean') parts.push(`${label}: ${value ? '是' : '否'}`);
    else if (value !== undefined && value !== null && value !== '') parts.push(`${label}: ${value}`);
  }
  return parts.join(' | ') || '无参数';
}

const AgentChat: React.FC = () => {
  const {
    conversations, currentConversationId, loadingConversations,
    loadConversations, createConversation, deleteConversation, setCurrentConversation,
    messages, loadingMessages, sending, streamingContent, sendMessage,
    pendingToolCalls, executingTools, toolStatus, confirmToolCalls, rejectToolCalls,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, pendingToolCalls, executingTools, toolStatus]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending || executingTools) return;
    setInputValue('');
    if (!currentConversationId) {
      const newId = await createConversation();
      if (newId) {
        setTimeout(() => sendMessage(text), 100);
      }
    } else {
      sendMessage(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderToolCallCard = () => {
    if (!pendingToolCalls || pendingToolCalls.length === 0) return null;
    return (
      <Card size="small" style={{ margin: '12px 0', border: '1px solid #faad14', background: '#fffbe6' }}>
        <div style={{ marginBottom: 8 }}>
          <ToolOutlined style={{ color: '#faad14', marginRight: 6 }} />
          <Text strong>AI 请求调用工具</Text>
          <Tag color="warning" style={{ marginLeft: 8 }}>需要确认</Tag>
        </div>
        {pendingToolCalls.map((tc: ToolCall) => (
          <div key={tc.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <Text strong style={{ color: '#1890ff' }}>{tc.name_cn || tc.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{formatToolArgs(tc.arguments)}</Text>
          </div>
        ))}
        <Space style={{ marginTop: 12 }}>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
            onClick={confirmToolCalls}>确认执行</Button>
          <Button size="small" icon={<CloseCircleOutlined />}
            onClick={rejectToolCalls}>取消</Button>
        </Space>
      </Card>
    );
  };

  const renderToolExecuting = () => {
    if (!executingTools) return null;
    return (
      <div style={{ padding: '12px 0' }}>
        {toolStatus && (
          <div style={{ padding: '4px 12px', background: '#e6f7ff', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
            {toolStatus}
          </div>
        )}
        {streamingContent && (
          <div style={{ padding: 12, background: '#f6f6f6', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {streamingContent}
            <span className="typing-cursor">|</span>
          </div>
        )}
        {!streamingContent && !toolStatus && <Spin size="small" />}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#fff' }}>
      {/* 左侧会话列表 */}
      <div style={{
        width: 260, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
        background: '#fafafa',
      }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Button type="primary" icon={<PlusOutlined />} block
            onClick={() => createConversation()}>
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {loadingConversations ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conv) => (
                <List.Item
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv.id)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer',
                    background: conv.id === currentConversationId ? '#e6f7ff' : 'transparent',
                    borderLeft: conv.id === currentConversationId ? '3px solid #1890ff' : '3px solid transparent',
                  }}
                  actions={[
                    <Popconfirm title="确定删除此对话？" onConfirm={(e) => { e?.stopPropagation(); deleteConversation(conv.id); }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={<Text ellipsis style={{ maxWidth: 150 }}>{conv.title || '新对话'}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(conv.updated_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>}
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!currentConversationId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="选择一个对话或创建新对话" />
          </div>
        ) : (
          <>
            {/* 消息区域 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>开始新的对话吧</div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    display: 'flex', marginBottom: 16,
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    {msg.role !== 'user' && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#1890ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: 8, flexShrink: 0,
                      }}>
                        <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                      background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                      color: msg.role === 'user' ? '#fff' : '#333',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14,
                    }}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#52c41a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginLeft: 8, flexShrink: 0,
                      }}>
                        <UserOutlined style={{ color: '#fff', fontSize: 16 }} />
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* 流式输出中 */}
              {sending && streamingContent && (
                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#1890ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 8, flexShrink: 0,
                  }}>
                    <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                    background: '#f0f0f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14,
                  }}>
                    {streamingContent}<span style={{ animation: 'blink 1s infinite' }}>|</span>
                  </div>
                </div>
              )}

              {sending && !streamingContent && (
                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#1890ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 8, flexShrink: 0,
                  }}>
                    <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <LoadingOutlined style={{ marginRight: 8 }} />
                    <Text type="secondary">思考中...</Text>
                  </div>
                </div>
              )}

              {renderToolCallCard()}
              {renderToolExecuting()}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div style={{
              padding: '12px 24px', borderTop: '1px solid #f0f0f0',
              background: '#fafafa', display: 'flex', gap: 12, alignItems: 'flex-end',
            }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Shift+Enter 换行)"
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={sending || executingTools}
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!inputValue.trim() || sending || executingTools}
                style={{ borderRadius: 8, height: 36 }}
              >
                发送
              </Button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AgentChat;
