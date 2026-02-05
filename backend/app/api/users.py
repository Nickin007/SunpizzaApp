from flask import Blueprint, request
from app import db
from app.models import User
from app.utils.auth import generate_token, token_required, admin_required
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return error_response('用户名和密码不能为空', 400)
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return error_response('用户名或密码错误', 401)
    
    # 生成token
    token = generate_token(user.id, user.username, user.role)
    
    return success_response(
        data={
            'token': token,
            'user': user.to_dict()
        },
        message='登录成功'
    )

@bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """获取当前登录用户信息"""
    user = User.query.get(current_user['user_id'])
    if not user:
        return error_response('用户不存在', 404)
    
    return success_response(data=user.to_dict(), message='获取用户信息成功')
