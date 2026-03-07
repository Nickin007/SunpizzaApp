from functools import wraps
from flask import request, jsonify
import jwt
from datetime import datetime, timedelta
from config import Config

def generate_token(user_id, username, role):
    """生成JWT token，role 为逗号分隔的角色字符串"""
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

def has_any_role(current_user, *roles):
    """检查用户是否拥有指定角色中的任意一个"""
    user_roles = [r.strip() for r in current_user.get('role', '').split(',') if r.strip()]
    return any(r in user_roles for r in roles)

def token_required(f):
    """JWT token验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200
        
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': '无效的token格式'}), 401
        
        if not token:
            return jsonify({'error': '缺少认证token'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'token已过期或无效'}), 401
        
        return f(current_user=payload, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """管理员权限验证装饰器"""
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if not has_any_role(current_user, 'admin'):
            return jsonify({'error': '需要管理员权限'}), 403
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated

