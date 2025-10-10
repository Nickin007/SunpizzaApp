import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Tag,
  Descriptions,
  Divider,
  Input,
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { trainingApi } from '../../api/training';
import type { ExamSubmission, ExamQuestion } from '../../types';

const { TextArea } = Input;

const ExamReview: React.FC = () => {
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<ExamSubmission | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await trainingApi.getPendingExams();
      setSubmissions(response.data.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (record: ExamSubmission) => {
    setCurrentSubmission(record);
    form.resetFields();
    form.setFieldsValue({
      subjective_score: 0,
      passing_score: 60,
      feedback: '',
    });
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!currentSubmission) return;

    try {
      const values = await form.validateFields();
      await trainingApi.reviewExam(currentSubmission.id, values);
      message.success('审核完成');
      setReviewModalVisible(false);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '审核失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '学员',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 120,
    },
    {
      title: '课程',
      dataIndex: 'course_name',
      key: 'course_name',
      width: 200,
    },
    {
      title: '客观题得分',
      dataIndex: 'objective_score',
      key: 'objective_score',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending_review: { text: '待审核', color: 'orange' },
          passed: { text: '已通过', color: 'green' },
          failed: { text: '未通过', color: 'red' },
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ExamSubmission) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleReview(record)}
        >
          审核
        </Button>
      ),
    },
  ];

  const renderQuestionAnswer = (question: ExamQuestion, userAnswer: string) => {
    if (question.is_subjective) {
      return (
        <Card size="small" style={{ marginBottom: 16 }}>
          <h4>{question.question_text}</h4>
          <p>
            <strong>类型：</strong>
            <Tag color="purple">主观题</Tag>
            <strong>分值：</strong>
            {question.score}分
          </p>
          <Divider />
          <p>
            <strong>学员回答：</strong>
          </p>
          <div
            style={{
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {userAnswer || '未作答'}
          </div>
        </Card>
      );
    }

    const isCorrect = userAnswer === question.correct_answer;

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <h4>{question.question_text}</h4>
        <p>
          <strong>类型：</strong>
          <Tag color="blue">客观题</Tag>
          <strong>分值：</strong>
          {question.score}分
          <strong>得分：</strong>
          {isCorrect ? (
            <Tag color="success">
              <CheckCircleOutlined /> {question.score}分
            </Tag>
          ) : (
            <Tag color="error">
              <CloseCircleOutlined /> 0分
            </Tag>
          )}
        </p>
        {question.options && (
          <p>
            <strong>选项：</strong>
            {question.options.join(', ')}
          </p>
        )}
        <p>
          <strong>学员回答：</strong>
          <Tag color={isCorrect ? 'success' : 'error'}>{userAnswer || '未作答'}</Tag>
        </p>
        <p>
          <strong>正确答案：</strong>
          <Tag color="success">{question.correct_answer}</Tag>
        </p>
      </Card>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">考试审核</h2>
      </div>

      <div className="table-container">
        <Table
          loading={loading}
          dataSource={submissions}
          columns={columns}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条待审核`,
          }}
        />
      </div>

      {/* 审核弹窗 */}
      <Modal
        title="审核考试"
        open={reviewModalVisible}
        onOk={handleSubmitReview}
        onCancel={() => setReviewModalVisible(false)}
        width={900}
        destroyOnClose
      >
        {currentSubmission && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学员">
                {currentSubmission.student_name}
              </Descriptions.Item>
              <Descriptions.Item label="课程">
                {currentSubmission.course_name}
              </Descriptions.Item>
              <Descriptions.Item label="客观题得分">
                {currentSubmission.objective_score}分
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {new Date(currentSubmission.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>答题详情</Divider>

            <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
              {currentSubmission.questions?.map((question) => {
                const userAnswer = currentSubmission.answers[question.id.toString()];
                return renderQuestionAnswer(question, userAnswer);
              })}
            </div>

            <Divider>评分</Divider>

            <Form form={form} layout="vertical">
              <Form.Item
                name="subjective_score"
                label="主观题得分"
                rules={[{ required: true, message: '请输入主观题得分' }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  placeholder="请输入主观题得分"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="passing_score"
                label="及格分数"
                rules={[{ required: true, message: '请输入及格分数' }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  placeholder="请输入及格分数（默认60分）"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item name="feedback" label="审核反馈">
                <TextArea
                  placeholder="请输入审核反馈（可选）"
                  rows={4}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>

            <div
              style={{
                padding: 12,
                background: '#f0f9ff',
                border: '1px solid #91caff',
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>总分计算：</strong>
                客观题得分 ({currentSubmission.objective_score}分) + 主观题得分 (
                {form.getFieldValue('subjective_score') || 0}分) ={' '}
                {currentSubmission.objective_score + (form.getFieldValue('subjective_score') || 0)}
                分
              </p>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ExamReview;

