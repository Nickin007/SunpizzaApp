import React, { useEffect, useState } from 'react';
import { Button, Input, message, Spin, Typography, Alert, Space, Tag } from 'antd';
import { SaveOutlined, ReloadOutlined, FileMarkdownOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { readFile, updateFile } from '../../api/agent';

const { TextArea } = Input;
const { Title, Text } = Typography;

/** 文件路径到中文名的映射 */
const FILE_LABEL_MAP: Record<string, { label: string; description: string; tag: string; color: string }> = {
  'USER.md': {
    label: '用户档案',
    description: '记录你的基本信息、工作习惯和偏好。AI 每次对话都会读取此文件。',
    tag: '热层',
    color: '#f5222d',
  },
  'SOUL.md': {
    label: 'AI 人设',
    description: '定义 AI 的身份、性格和回复风格。修改后立即生效。',
    tag: '热层',
    color: '#f5222d',
  },
  'memory/preferences.md': {
    label: '偏好记忆',
    description: 'AI 自动记录你的偏好。涉及偏好话题时会自动加载。',
    tag: '温层',
    color: '#fa8c16',
  },
  'memory/contacts.md': {
    label: '联系人记忆',
    description: 'AI 自动记录你提到的联系人信息。',
    tag: '温层',
    color: '#fa8c16',
  },
};

const FileEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('path') || 'USER.md';

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInfo = FILE_LABEL_MAP[filePath];
  const hasChanges = content !== originalContent;

  const loadFileContent = async () => {
    setLoading(true);
    try {
      const resp = await readFile(filePath);
      if (resp.data?.code === 200) {
        const text = resp.data.data.content || '';
        setContent(text);
        setOriginalContent(text);
      } else {
        message.error(resp.data?.message || '读取失败');
      }
    } catch (err: any) {
      message.error('读取文件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFileContent();
  }, [filePath]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await updateFile(filePath, content);
      if (resp.data?.code === 200) {
        message.success('保存成功');
        setOriginalContent(content);
      } else {
        message.error(resp.data?.message || '保存失败');
      }
    } catch (err: any) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setContent(originalContent);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* 文件标题 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center">
          <FileMarkdownOutlined style={{ fontSize: 24 }} />
          <Title level={4} style={{ margin: 0 }}>
            {fileInfo?.label || filePath}
          </Title>
          {fileInfo && <Tag color={fileInfo.color}>{fileInfo.tag}</Tag>}
        </Space>
        {fileInfo && (
          <div style={{ marginTop: 6 }}>
            <Text type="secondary">{fileInfo.description}</Text>
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>文件路径：{filePath}</Text>
        </div>
      </div>

      {/* 编辑提示 */}
      <Alert
        type="info"
        showIcon
        message="Markdown 格式"
        description="使用 Markdown 语法编辑。建议用 ## 标题分节，用 - 列表记录信息。保存后立即生效。"
        style={{ marginBottom: 16 }}
      />

      {/* 编辑器 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoSize={{ minRows: 20, maxRows: 40 }}
            style={{
              fontFamily: '"Fira Code", "Source Code Pro", monospace',
              fontSize: 14,
              lineHeight: 1.6,
              borderRadius: 8,
            }}
          />

          {/* 操作按钮 */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            {hasChanges && (
              <Text type="warning" style={{ lineHeight: '32px', marginRight: 'auto' }}>
                有未保存的更改
              </Text>
            )}
            <Button icon={<ReloadOutlined />} onClick={handleRevert} disabled={!hasChanges || saving}>
              撤销更改
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}
              loading={saving} disabled={!hasChanges}>
              保存
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FileEditor;
