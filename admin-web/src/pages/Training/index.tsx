import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tag,
  Tabs,
  Tooltip,
  Upload,
  Progress,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { trainingApi } from '../../api/training';
import { uploadApi } from '../../api/upload';
import type { TrainingCourse, TrainingCategory } from '../../types';
import './index.css';

const { TextArea } = Input;
const { TabPane } = Tabs;

const Training: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesData, categoriesData] = await Promise.all([
        trainingApi.getCourses(),
        trainingApi.getCategories(),
      ]);
      setCourses(coursesData.data.data);
      setCategories(categoriesData.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCourse(null);
    form.resetFields();
    form.setFieldsValue({
      has_exam: false,
      is_published: true,
      document_content: '',
    });
    setUploadedFileName(''); // 清空上传文件名
    setModalVisible(true);
  };

  const handleEdit = (record: TrainingCourse) => {
    setEditingCourse(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      category_id: record.category_id,
      video_url: record.video_url,
      document_content: record.document_content || '',
      has_exam: record.has_exam,
      is_published: record.is_published,
    });
    // 如果已有视频，显示文件名（从URL提取）
    if (record.video_url) {
      const fileName = record.video_url.split('/').pop() || '已有视频';
      setUploadedFileName(fileName);
    } else {
      setUploadedFileName('');
    }
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await trainingApi.deleteCourse(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      console.error('删除失败:', error);
      const errorMsg = error.response?.data?.message || error.message || '删除失败';
      message.error(errorMsg, 5); // 显示5秒，让用户有时间看清错误信息
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCourse) {
        await trainingApi.updateCourse(editingCourse.id, values);
        message.success('更新成功');
      } else {
        await trainingApi.createCourse(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await uploadApi.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });

      if (response.data?.data?.url) {
        // 构建完整的视频URL
        const videoUrl = `http://118.89.73.199:5000${response.data.data.url}`;
        form.setFieldsValue({ video_url: videoUrl });
        
        // 保存上传的文件名
        setUploadedFileName(response.data.data.filename);
        
        message.success(`视频上传成功！文件：${response.data.data.filename}，大小：${response.data.data.size}MB`, 5);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '视频上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }

    return false; // 阻止默认上传行为
  };

  const handleManageQuestions = (record: TrainingCourse) => {
    // 跳转到题目管理页面
    navigate(`/training/questions/${record.id}`);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '课程标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: TrainingCategory) => (
        <Tag color="blue">{category?.name}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: '视频',
      dataIndex: 'video_url',
      key: 'video_url',
      width: 80,
      render: (url: string | null) => (
        url ? <Tag color="green">有</Tag> : <Tag>无</Tag>
      ),
    },
    {
      title: '文档',
      dataIndex: 'document_content',
      key: 'document_content',
      width: 80,
      render: (content: string | null) => (
        content ? <Tag color="green">有</Tag> : <Tag>无</Tag>
      ),
    },
    {
      title: '考试',
      dataIndex: 'has_exam',
      key: 'has_exam',
      width: 80,
      render: (hasExam: boolean) => (
        hasExam ? <Tag color="orange">有</Tag> : <Tag>无</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_published',
      key: 'is_published',
      width: 80,
      render: (isPublished: boolean) => (
        <Tag color={isPublished ? 'success' : 'default'}>
          {isPublished ? '已发布' : '未发布'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: TrainingCourse) => (
        <Space size="small">
          {record.has_exam && (
            <Button
              type="link"
              size="small"
              icon={<QuestionCircleOutlined />}
              onClick={() => handleManageQuestions(record)}
            >
              题目
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          
          {/* 只有未发布的课程才能删除 */}
          {!record.is_published ? (
            <Popconfirm
              title="确定要删除这个课程吗？"
              description={
                <div>
                  <div>⚠️ 此操作将同时删除：</div>
                  <div>• 所有考试题目</div>
                  <div>• 所有学习记录</div>
                  <div>• 所有考试提交记录</div>
                  <div style={{ marginTop: 8, color: '#ff4d4f', fontWeight: 'bold' }}>
                    删除后无法恢复！
                  </div>
                </div>
              }
              onConfirm={() => handleDelete(record.id)}
              okText="确定删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title='已发布的课程不能删除，请先设置为"未发布"'>
              <Button 
                type="link" 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                disabled
              >
                删除
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const getCategoryOptions = () => {
    return categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">培训课程管理</h2>
      </div>

      <div className="page-actions">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增课程
        </Button>
      </div>

      <div className="table-container">
        <Table
          loading={loading}
          dataSource={courses}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingCourse ? '编辑课程' : '新增课程'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="课程标题"
            rules={[{ required: true, message: '请输入课程标题' }]}
          >
            <Input placeholder="请输入课程标题" />
          </Form.Item>

          <Form.Item name="description" label="课程描述">
            <TextArea
              placeholder="请输入课程描述"
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="课程分类"
            rules={[{ required: true, message: '请选择课程分类' }]}
          >
            <Select
              placeholder="请选择课程分类"
              options={getCategoryOptions()}
            />
          </Form.Item>

          <Form.Item name="video_url" label="教学视频">
            <div>
              <Input 
                placeholder="视频URL（可手动输入或点击下方按钮上传）" 
                style={{ marginBottom: 12 }}
                prefix={<VideoCameraOutlined />}
              />
              
              {/* 显示已上传的文件标签 */}
              {uploadedFileName && (
                <Tag 
                  color="success" 
                  icon={<VideoCameraOutlined />}
                  closable
                  onClose={() => {
                    setUploadedFileName('');
                    form.setFieldsValue({ video_url: '' });
                  }}
                  style={{ marginBottom: 12 }}
                >
                  已上传：{uploadedFileName}
                </Tag>
              )}
              
              <Upload
                accept="video/*"
                showUploadList={false}
                beforeUpload={handleVideoUpload}
                disabled={uploading}
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  disabled={uploading}
                >
                  {uploading ? '上传中...' : uploadedFileName ? '重新上传视频' : '选择并上传视频文件'}
                </Button>
              </Upload>
              
              {uploading && (
                <Progress 
                  percent={uploadProgress} 
                  status="active"
                  style={{ marginTop: 12 }}
                />
              )}
              
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                支持格式：MP4, AVI, MOV, MKV等 | 最大500MB
              </div>
            </div>
          </Form.Item>

          <Form.Item 
            name="document_content" 
            label="文档内容（HTML格式）"
            tooltip="支持HTML标签，APP端会自动渲染"
            extra={
              <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
                <strong>常用HTML标签示例：</strong>
                <br />• 标题：&lt;h1&gt;主标题&lt;/h1&gt;, &lt;h2&gt;副标题&lt;/h2&gt;
                <br />• 段落：&lt;p&gt;段落内容&lt;/p&gt;
                <br />• 粗体：&lt;strong&gt;粗体文字&lt;/strong&gt;
                <br />• 列表：&lt;ul&gt;&lt;li&gt;项目1&lt;/li&gt;&lt;li&gt;项目2&lt;/li&gt;&lt;/ul&gt;
                <br />• 有序列表：&lt;ol&gt;&lt;li&gt;步骤1&lt;/li&gt;&lt;li&gt;步骤2&lt;/li&gt;&lt;/ol&gt;
                <br />• 颜色：&lt;p style="color: red"&gt;红色文字&lt;/p&gt;
              </div>
            }
          >
            <TextArea
              placeholder="请输入HTML格式的文档内容，例如：&#10;<h1>披萨制作标准流程</h1>&#10;<h2>一、面团制作</h2>&#10;<p>高筋面粉500g，温水300ml，酵母5g...</p>&#10;<ol>&#10;  <li>步骤1：混合材料</li>&#10;  <li>步骤2：揉成面团</li>&#10;</ol>"
              rows={12}
              showCount
              style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' }}
            />
          </Form.Item>

          <Form.Item name="has_exam" label="是否包含考试" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="is_published" label="是否发布" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Training;

