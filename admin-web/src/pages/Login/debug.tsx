import React from 'react';

// 简单的调试组件
const LoginDebug: React.FC = () => {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex',
      background: '#f0f0f0'
    }}>
      {/* 左侧 */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div>
          <h1>左侧区域</h1>
          <p>阳光披萨</p>
        </div>
      </div>

      {/* 右侧 */}
      <div style={{ 
        flex: 1, 
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2>右侧登录表单区域</h2>
          <input 
            type="text" 
            placeholder="用户名" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }} 
          />
          <input 
            type="password" 
            placeholder="密码" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }} 
          />
          <button 
            style={{ 
              width: '100%', 
              padding: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            登录
          </button>
          <p style={{ marginTop: '20px', color: '#666' }}>
            这是调试页面。如果你能看到这个，说明 React 和路由工作正常。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginDebug;

