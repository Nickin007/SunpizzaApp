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
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Breadcrumb,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { trainingApi } from '../../api/training';
import type { ExamQuestion, TrainingCourse } from '../../types';

const { TextArea } = Input;

const Questions: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  const loadData = async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const [questionsData, courseData] = await Promise.all([
        trainingApi.getCourseQuestions(parseInt(courseId)),
        trainingApi.getCourseDetail(parseInt(courseId)),
      ]);
      setQuestions(questionsData.data.data);
      setCourse(courseData.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingQuestion(null);
    form.resetFields();
    form.setFieldsValue({
      question_type: 'single_choice',
      is_subjective: false,
      score: 10,
      sort_order: questions.length + 1,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: ExamQuestion) => {
    setEditingQuestion(record);
    form.setFieldsValue({
      question_text: record.question_text,
      question_type: record.question_type,
      options: record.options,
      correct_answer: record.correct_answer,
      is_subjective: record.is_subjective,
      score: record.score,
      sort_order: record.sort_order,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await trainingApi.deleteQuestion(id);
      message.success('题目删除成功');
      loadData();
    } catch (error: any) {
      console.error('删除题目失败:', error);
      const errorMsg = error.response?.data?.message || error.message || '删除失败';
      message.error(errorMsg, 5);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理选项（将字符串数组转为JSON）
      if (values.options && typeof values.options === 'string') {
        values.options = values.options.split('\n').filter((o: string) => o.trim());
      }
      
      if (editingQuestion) {
        await trainingApi.updateQuestion(editingQuestion.id, values);
        message.success('更新成功');
      } else {
        if (!courseId) return;
        await trainingApi.addQuestions(parseInt(courseId), {
          questions: [values],
        });
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const handleBatchAdd = () => {
    batchForm.resetFields();
    setBatchModalVisible(true);
  };

  const handleBatchSubmit = async () => {
    try {
      const values = await batchForm.validateFields();
      if (!courseId) return;

      // 解析批量输入的题目
      const questionsText = values.questions_text;
      const lines = questionsText.split('\n').filter((line: string) => line.trim());
      
      const questions: any[] = [];
      let currentQuestion: any = null;

      for (const line of lines) {
        if (line.startsWith('Q:')) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          currentQuestion = {
            question_text: line.substring(2).trim(),
            question_type: 'single_choice',
            options: [],
            score: 10,
            sort_order: questions.length + 1,
          };
        } else if (line.startsWith('A:') && currentQuestion) {
          currentQuestion.correct_answer = line.substring(2).trim();
        } else if (line.startsWith('-') && currentQuestion) {
          currentQuestion.options.push(line.substring(1).trim());
        } else if (line.startsWith('主观:') && currentQuestion) {
          currentQuestion.question_type = 'subjective';
          currentQuestion.is_subjective = true;
          currentQuestion.options = null;
          currentQuestion.correct_answer = null;
          currentQuestion.score = 20;
        }
      }

      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      if (questions.length === 0) {
        message.warning('未解析到有效题目');
        return;
      }

      await trainingApi.addQuestions(parseInt(courseId), { questions });
      message.success(`成功添加 ${questions.length} 道题目`);
      setBatchModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '批量添加失败');
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '题目',
      dataIndex: 'question_text',
      key: 'question_text',
      width: 300,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'question_type',
      key: 'question_type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          single_choice: { text: '单选', color: 'blue' },
          multiple_choice: { text: '多选', color: 'green' },
          true_false: { text: '判断', color: 'orange' },
          subjective: { text: '主观', color: 'purple' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 80,
    },
    {
      title: '选项',
      dataIndex: 'options',
      key: 'options',
      width: 200,
      render: (options: string[] | null) => {
        if (!options) return <Tag>无</Tag>;
        return options.slice(0, 2).join(', ') + (options.length > 2 ? '...' : '');
      },
    },
    {
      title: '正确答案',
      dataIndex: 'correct_answer',
      key: 'correct_answer',
      width: 120,
      render: (answer: string | null, record: ExamQuestion) => {
        if (record.is_subjective) {
          return <Tag color="purple">主观题</Tag>;
        }
        return answer || '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ExamQuestion) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这道题目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const questionTypeOptions = [
    { label: '单选题', value: 'single_choice' },
    { label: '多选题', value: 'multiple_choice' },
    { label: '判断题', value: 'true_false' },
    { label: '主观题', value: 'subjective' },
  ];

  const renderOptionsInput = () => {
    const questionType = form.getFieldValue('question_type');
    const isSubjective = form.getFieldValue('is_subjective');

    if (isSubjective || questionType === 'subjective') {
      return null;
    }

    return (
      <>
        <Form.Item
          name="options"
          label="选项（每行一个）"
          rules={[{ required: true, message: '请输入选项' }]}
        >
          <TextArea
            placeholder="每行输入一个选项，例如：&#10;选项A&#10;选项B&#10;选项C"
            rows={4}
          />
        </Form.Item>

        <Form.Item
          name="correct_answer"
          label="正确答案"
          rules={[{ required: true, message: '请输入正确答案' }]}
        >
          <Input placeholder="例如：选项A 或 选项A,选项B（多选）" />
        </Form.Item>
      </>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Breadcrumb
          items={[
            {
              title: (
                <a onClick={() => navigate('/training')}>
                  <ArrowLeftOutlined /> 培训课程
                </a>
              ),
            },
            { title: course?.title || '题目管理' },
          ]}
        />
        <h2 className="page-title">题目管理 - {course?.title}</h2>
      </div>

      <div className="page-actions">
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增题目
          </Button>
          <Button onClick={handleBatchAdd}>批量导入</Button>
        </Space>
      </div>

      <div className="table-container">
        <Table
          loading={loading}
          dataSource={questions}
          columns={columns}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={false}
        />
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '新增题目'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="question_text"
            label="题目内容"
            rules={[{ required: true, message: '请输入题目内容' }]}
          >
            <TextArea placeholder="请输入题目内容" rows={3} />
          </Form.Item>

          <Form.Item
            name="question_type"
            label="题目类型"
            rules={[{ required: true, message: '请选择题目类型' }]}
          >
            <Select
              placeholder="请选择题目类型"
              options={questionTypeOptions}
              onChange={(value) => {
                if (value === 'subjective') {
                  form.setFieldsValue({ is_subjective: true });
                } else {
                  form.setFieldsValue({ is_subjective: false });
                }
              }}
            />
          </Form.Item>

          {renderOptionsInput()}

          <Form.Item
            name="score"
            label="分值"
            rules={[{ required: true, message: '请输入分值' }]}
          >
            <InputNumber min={1} max={100} placeholder="请输入分值" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="排序"
            rules={[{ required: true, message: '请输入排序' }]}
          >
            <InputNumber min={1} placeholder="请输入排序" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        title="批量导入题目"
        open={batchModalVisible}
        onOk={handleBatchSubmit}
        onCancel={() => setBatchModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item
            name="questions_text"
            label="题目格式（按以下格式输入）"
            rules={[{ required: true, message: '请输入题目' }]}
          >
            <TextArea
              placeholder={`Q:题目内容
-选项A
-选项B
-选项C
A:选项A

Q:这是主观题
主观:

Q:另一道单选题
-选项1
-选项2
A:选项1`}
              rows={15}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <h4>导入格式说明：</h4>
          <ul>
            <li>Q: 开头表示题目</li>
            <li>- 开头表示选项（客观题必需）</li>
            <li>A: 开头表示正确答案（客观题必需）</li>
            <li>主观: 表示这是主观题（无需选项和答案）</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default Questions;

