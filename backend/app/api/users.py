from flask import Blueprint, request
from app import db
from app.models import User
from app.utils.auth import generate_token, token_required, admin_required
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('users', __name__, url_prefix='/api/users')

# 可用角色列表
VALID_ROLES = ['admin', 'delivery_operation', 'SupplyChain_operation', 'Accouting_operation', 'DouyinANDOffline_operation']

ROLE_LABELS = {
    'admin': '系统管理员',
    'delivery_operation': '外卖运营',
    'SupplyChain_operation': '供应链运营',
    'Accouting_operation': '财务运营',
    'DouyinANDOffline_operation': '抖音/小程序运营',
}


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


@bp.route('/roles', methods=['GET'])
@token_required
def get_roles(current_user):
    """获取可用角色列表"""
    roles = [{'value': r, 'label': ROLE_LABELS.get(r, r)} for r in VALID_ROLES]
    return success_response(data=roles, message='获取角色列表成功')


@bp.route('/list', methods=['GET'])
@admin_required
def list_users(current_user):
    """获取所有用户列表（仅管理员）"""
    users = User.query.order_by(User.id.asc()).all()
    return success_response(
        data=[u.to_dict() for u in users],
        message='获取用户列表成功'
    )


@bp.route('/create', methods=['POST'])
@admin_required
def create_user(current_user):
    """创建用户（仅管理员）"""
    data = request.get_json()
    
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    real_name = data.get('real_name', '').strip()
    role = data.get('role', '').strip()
    
    if not username or not password or not real_name or not role:
        return error_response('用户名、密码、真实姓名和角色不能为空', 400)
    
    if role not in VALID_ROLES:
        return error_response(f'无效的角色: {role}', 400)
    
    if len(password) < 6:
        return error_response('密码长度不能少于6位', 400)
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return error_response('用户名已存在', 400)
    
    user = User(username=username, real_name=real_name, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return success_response(data=user.to_dict(), message='创建用户成功')


@bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(current_user, user_id):
    """编辑用户（仅管理员）"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    data = request.get_json()
    
    # 更新真实姓名
    if 'real_name' in data and data['real_name'].strip():
        user.real_name = data['real_name'].strip()
    
    # 更新角色
    if 'role' in data and data['role'].strip():
        if data['role'] not in VALID_ROLES:
            return error_response(f'无效的角色: {data["role"]}', 400)
        user.role = data['role']
    
    # 重置密码（可选）
    if 'password' in data and data['password'].strip():
        if len(data['password']) < 6:
            return error_response('密码长度不能少于6位', 400)
        user.set_password(data['password'])
    
    db.session.commit()
    
    return success_response(data=user.to_dict(), message='更新用户成功')


@bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, user_id):
    """删除用户（仅管理员）"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    # 不允许删除自己
    if user.id == current_user['user_id']:
        return error_response('不能删除当前登录的账号', 400)
    
    db.session.delete(user)
    db.session.commit()
    
    return success_response(message='删除用户成功')
