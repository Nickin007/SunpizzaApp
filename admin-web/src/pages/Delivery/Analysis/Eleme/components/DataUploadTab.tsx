import React, { useState, useEffect } from 'react';
import { Upload, Table, message, Tag, Space, Card, Alert, Button, Popconfirm } from 'antd';
import { InboxOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import elemeApi from '../../../../../api/eleme';
import type { ImportLog } from '../../../../../api/eleme';
import dayjs from 'dayjs';

const { Dragger } = Upload;

const DataUploadTab: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await elemeApi.getImportLogs(page, pagination.pageSize);
      // 注意：后端返回的是 response.data.data.logs（嵌套两层data）
      const resData = (response.data as any).data || response.data;
      setLogs(resData.logs || []);
      setPagination({
        ...pagination,
        current: resData.page || 1,
        total: resData.total || 0,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取导入历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('请先选择文件');
      return;
    }

    try {
      setUploading(true);
      message.loading({ content: '正在上传并解析Excel文件...', key: 'upload', duration: 0 });
      
      const response = await elemeApi.uploadExcel(selectedFile);
      const resData = response.data as any;
      
      message.success({ content: resData.message || '上传成功！', key: 'upload', duration: 3 });
      
      // 清空已选文件
      setSelectedFile(null);
      
      // 刷新导入历史
      fetchLogs();
    } catch (error: any) {
      console.error('上传失败:', error);
      
      // 从错误响应中提取消息
      let errorMsg = '上传失败';
      if (error.response?.data) {
        const errorData = error.response.data;
        // 可能是 { message: "..." } 或 { error: "..." } 格式
        errorMsg = errorData.message || errorData.error || errorMsg;
      }
      
      // 显示多行错误消息（保留换行符）
      message.error({ 
        content: (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {errorMsg}
          </div>
        ),
        key: 'upload',
        duration: 8  // 延长显示时间，方便用户阅读
      });
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: (file: File) => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls');
      
      if (!isExcel) {
        message.error('只能上传 Excel 文件（.xlsx 或 .xls）！');
        return false;
      }

      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB！');
        return false;
      }

      // 保存文件，但不立即上传
      setSelectedFile(file);
      message.success(`已选择文件：${file.name}，请点击"确认上传"按钮`);
      
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setSelectedFile(null);
    },
    fileList: selectedFile ? [{
      uid: '-1',
      name: selectedFile.name,
      status: 'done' as const,
      size: selectedFile.size,
    }] : [],
  };

  const handleDelete = async (record: ImportLog) => {
    try {
      message.loading({ content: '正在删除...', key: 'delete', duration: 0 });
      
      // 使用批次ID删除
      await elemeApi.deleteDataByBatch(record.batch_id);
      
      message.success({ content: '删除成功！', key: 'delete', duration: 2 });
      
      // 刷新列表
      fetchLogs();
    } catch (error: any) {
      console.error('删除失败:', error);
      
      // 从错误响应中提取消息
      let errorMsg = '删除失败';
      if (error.response?.data) {
        const errorData = error.response.data;
        // 可能是 { message: "..." } 或 { error: "..." } 格式
        errorMsg = errorData.message || errorData.error || errorMsg;
      }
      
      message.error({ 
        content: errorMsg,
        key: 'delete',
        duration: 5 
      });
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
      width: 250,
    },
    {
      title: '数据日期',
      dataIndex: 'data_date',
      key: 'data_date',
      render: (text: string) => text || '-',
    },
    {
      title: '总行数',
      dataIndex: 'total_rows',
      key: 'total_rows',
    },
    {
      title: '成功行数',
      dataIndex: 'success_rows',
      key: 'success_rows',
      render: (text: number) => <span style={{ color: '#52c41a' }}>{text}</span>,
    },
    {
      title: '失败行数',
      dataIndex: 'failed_rows',
      key: 'failed_rows',
      render: (text: number) =>
        text > 0 ? <span style={{ color: '#ff4d4f' }}>{text}</span> : text,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ImportLog) => {
        // 如果数据已删除，显示"已删除"状态
        if (record.is_deleted) {
          return <Tag color="default">已删除</Tag>;
        }
        
        const statusConfig: Record<string, { color: string; text: string }> = {
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '完成' },
          failed: { color: 'error', text: '失败' },
        };
        const config = statusConfig[status] || statusConfig.processing;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '导入人',
      dataIndex: 'importer_name',
      key: 'importer_name',
    },
    {
      title: '导入时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ImportLog) => {
        // 已删除或处理中的记录禁用删除按钮
        const isDisabled = record.is_deleted || record.status === 'processing';
        
        return (
          <Popconfirm
            title="确认删除"
            description={`确定要删除日期 ${record.data_date} 的数据吗？此操作不可恢复！`}
            onConfirm={() => handleDelete(record)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={isDisabled}
          >
            <Button 
              type="link" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
              disabled={isDisabled}
            >
              {record.is_deleted ? '已删除' : '删除'}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div className="data-upload-tab">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="上传说明"
          description={
            <div>
              <p>1. 支持 .xlsx 和 .xls 格式的 Excel 文件</p>
              <p>2. 文件大小不超过 50MB</p>
              <p>3. Excel 必须包含"日期"和"门店名称"两列</p>
              <p>4. 系统会自动解析并导入数据</p>
            </div>
          }
          type="info"
          showIcon
        />

        <Card title="上传Excel文件" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Dragger {...uploadProps} disabled={uploading}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域选择文件</p>
              <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式（最大50MB）</p>
            </Dragger>
            
            {selectedFile && (
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!selectedFile}
                >
                  {uploading ? '正在上传...' : '确认上传'}
                </Button>
                <div style={{ marginTop: 8, color: '#666' }}>
                  已选择：{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
            )}
          </Space>
        </Card>

        <Card title="导入历史记录" size="small">
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              onChange: fetchLogs,
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default DataUploadTab;

