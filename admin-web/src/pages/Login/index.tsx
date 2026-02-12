import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/logo.png';
import './index.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      console.log('🔐 正在登录...', values);
      const response = await authApi.login(values);
      console.log('✅ 登录响应:', response.data);
      
      const { token, user } = response.data.data;

      setAuth(token, user);
      message.success('登录成功！');
      
      // 登录后跳转到门户选择页
      navigate('/portal-select');
    } catch (error: any) {
      console.error('❌ 登录失败：', error);
      console.error('错误详情:', error.response);
      message.error(error.response?.data?.message || '登录失败，请检查网络连接和后端服务');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-row">
        {/* 左侧：品牌展示 */}
        <div className="login-left">
          <div className="brand-content">
            <div className="brand-logo">
              <img src={logoImage} alt="圣比萨 SUN PIZZA" />
            </div>
            <h1 className="brand-title">圣比萨</h1>
            <h3 className="brand-subtitle">数字化管理平台</h3>
            <p className="brand-description">
              外卖运营、供应链、财务、抖音/小程序一站式管理
            </p>
            <div className="features">
              <div className="feature-item">
                <LockOutlined className="feature-icon" />
                <span className="feature-text">安全可靠的数据管理</span>
              </div>
              <div className="feature-item">
                <UserOutlined className="feature-icon" />
                <span className="feature-text">多角色权限控制</span>
              </div>
              <div className="feature-item">
                <LockOutlined className="feature-icon" />
                <span className="feature-text">企业级安全保障</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：登录表单 */}
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-header">
              <h2>欢迎登录</h2>
              <p className="login-subtitle">请输入您的管理员账号</p>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              size="large"
              className="login-form"
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  {loading ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </Form>

            <div className="login-footer">
              <p className="copyright">
                © 2024 圣比萨 SUN PIZZA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

