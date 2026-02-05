from functools import wraps
from flask import request, jsonify
import jwt
from datetime import datetime, timedelta
from config import Config

def generate_token(user_id, username, role):
    """生成JWT token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token):
    """解码JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """JWT token验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # CORS 预检请求直接放行
        if request.method == 'OPTIONS':
            return '', 200
        
        token = None
        
        # 从请求头获取token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': '无效的token格式'}), 401
        
        if not token:
            return jsonify({'error': '缺少认证token'}), 401
        
        # 验证token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'token已过期或无效'}), 401
        
        # 将用户信息传递给路由函数
        return f(current_user=payload, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """管理员权限验证装饰器"""
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'error': '需要管理员权限'}), 403
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated

