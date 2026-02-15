import React, { useEffect, useState } from 'react';
import {
  Button, Input, message, Spin, Typography, Space, Tag, Table, Modal,
  Empty, Popconfirm, Card, Statistic, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined,
  FileMarkdownOutlined, ReloadOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFileTree, readFile, createFile, deleteFile, updateFile } from '../../api/agent';
import { getVectorStats, rebuildVectorIndex, vectorSearch } from '../../api/agent';
import type { FileNode, VectorStats } from '../../api/agent';

const { TextArea } = Input;
const { Title, Text } = Typography;

const MemoryBrowser: React.FC = () => {
  const [searchParams] = useSearchParams();
  const folder = searchParams.get('folder') || 'projects';
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [vectorStats, setVectorStats] = useState<VectorStats | null>(null);

  // 新建文件
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [creating, setCreating] = useState(false);

  // 编辑文件
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPath, setEditPath] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // 向量搜索测试
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // 重建索引
  const [rebuilding, setRebuilding] = useState(false);

  const folderPath = `memory/${folder}`;
  const folderLabel = folder === 'projects' ? '项目记忆' : '每日记录';

  const loadFiles = async () => {
    setLoading(true);
    try {
      const resp = await getFileTree();
      if (resp.data?.code === 200) {
        const tree: FileNode = resp.data.data;
        // 找到 memory 目录下的目标子目录
        const memDir = tree.children?.find((c: FileNode) => c.name === 'memory');
        const targetDir = memDir?.children?.find((c: FileNode) => c.name === folder);
        setFiles(targetDir?.children || []);
      }
    } catch (err) {
      message.error('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVectorStats = async () => {
    try {
      const resp = await getVectorStats();
      if (resp.data?.code === 200) {
        setVectorStats(resp.data.data);
      }
    } catch {}
  };

  useEffect(() => {
    loadFiles();
    loadVectorStats();
  }, [folder]);

  const handleCreate = async () => {
    if (!newFileName.trim()) {
      message.warning('请输入文件名');
      return;
    }
    const name = newFileName.trim().endsWith('.md') ? newFileName.trim() : `${newFileName.trim()}.md`;
    const path = `${folderPath}/${name}`;
    setCreating(true);
    try {
      const resp = await createFile(path, newFileContent || `# ${newFileName.replace('.md', '')}\n\n`);
      if (resp.data?.code === 200) {
        message.success('创建成功');
        setCreateModalOpen(false);
        setNewFileName('');
        setNewFileContent('');
        loadFiles();
        loadVectorStats();
      } else {
        message.error(resp.data?.message || '创建失败');
      }
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (path: string) => {
    try {
      const resp = await readFile(path);
      if (resp.data?.code === 200) {
        setEditPath(path);
        setEditContent(resp.data.data.content || '');
        setEditModalOpen(true);
      }
    } catch {
      message.error('读取失败');
    }
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const resp = await updateFile(editPath, editContent);
      if (resp.data?.code === 200) {
        message.success('保存成功');
        setEditModalOpen(false);
        loadFiles();
        loadVectorStats();
      } else {
        message.error(resp.data?.message || '保存失败');
      }
    } catch {
      message.error('保存失败');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      const resp = await deleteFile(path);
      if (resp.data?.code === 200) {
        message.success('删除成功');
        loadFiles();
        loadVectorStats();
      } else {
        message.error(resp.data?.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      const resp = await rebuildVectorIndex();
      if (resp.data?.code === 200) {
        message.success(resp.data.message || '重建完成');
        loadVectorStats();
      }
    } catch {
      message.error('重建失败');
    } finally {
      setRebuilding(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await vectorSearch(searchQuery.trim());
      if (resp.data?.code === 200) {
        setSearchResults(resp.data.data || []);
      }
    } catch {
      message.error('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FileMarkdownOutlined style={{ color: '#1890ff' }} />
          <Text>{name}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => `${size || 0} B`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: any, record: FileNode) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => handleEdit(record.path)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.path)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <FolderOutlined style={{ fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>{folderLabel}</Title>
          <Tag color={folder === 'projects' ? 'blue' : 'green'}>{folderPath}</Tag>
          <Tag color="default">冷层 - 向量检索</Tag>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadFiles(); loadVectorStats(); }}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新建{folder === 'projects' ? '项目' : '记录'}
          </Button>
        </Space>
      </div>

      {/* 向量索引统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="索引文件数" value={vectorStats?.indexed_files?.length || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="文本片段数" value={vectorStats?.total_chunks || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已向量化" value={vectorStats?.chunks_with_vectors || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Button icon={<ThunderboltOutlined />} loading={rebuilding}
              onClick={handleRebuild} block>
              重建索引
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 文件列表 */}
      <Table
        dataSource={files}
        columns={columns}
        rowKey="path"
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description={`暂无${folderLabel}文件`} /> }}
        style={{ marginBottom: 24 }}
      />

      {/* 向量搜索测试 */}
      <Card title="语义搜索测试" size="small">
        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <Input
            placeholder="输入搜索内容，测试语义检索效果..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button icon={<SearchOutlined />} loading={searching} onClick={handleSearch}>搜索</Button>
        </Space.Compact>
        {searchResults.length > 0 && (
          <div>
            {searchResults.map((r, i) => (
              <div key={i} style={{ padding: 8, background: '#f9f9f9', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color="blue">{r.file_path}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    相似度：{(r.similarity * 100).toFixed(1)}%
                  </Text>
                </div>
                <Text style={{ fontSize: 13 }}>{r.chunk_text}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 新建文件 Modal */}
      <Modal
        title={`新建${folder === 'projects' ? '项目记忆' : '每日记录'}`}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>文件名：</Text>
          <Input
            placeholder={folder === 'projects' ? '例如：选址分析' : '例如：2026-02-06'}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            suffix=".md"
          />
        </div>
        <div>
          <Text>初始内容（可选）：</Text>
          <TextArea
            value={newFileContent}
            onChange={(e) => setNewFileContent(e.target.value)}
            rows={6}
            placeholder="使用 Markdown 格式..."
          />
        </div>
      </Modal>

      {/* 编辑文件 Modal */}
      <Modal
        title={`编辑：${editPath}`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSaveEdit}
        confirmLoading={editSaving}
        width={700}
      >
        <TextArea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          autoSize={{ minRows: 15, maxRows: 30 }}
          style={{ fontFamily: '"Fira Code", "Source Code Pro", monospace', fontSize: 13 }}
        />
      </Modal>
    </div>
  );
};

export default MemoryBrowser;
