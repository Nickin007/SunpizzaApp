from flask import Blueprint, request
from app import db
from app.models import User
from app.utils.auth import generate_token, token_required, admin_required
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('users', __name__, url_prefix='/api/users')

VALID_ROLES = ['admin', 'delivery_operation', 'SupplyChain_operation', 'Accouting_operation', 'DouyinANDOffline_operation', 'model_operation', 'warehouse_admin', 'store_manager']

ROLE_LABELS = {
    'admin': '系统管理员',
    'delivery_operation': '外卖运营',
    'SupplyChain_operation': '供应链运营',
    'Accouting_operation': '财务运营',
    'DouyinANDOffline_operation': '抖音/小程序运营',
    'model_operation': '模型运营',
    'warehouse_admin': '仓库管理员',
    'store_manager': '门店店长',
}


def _parse_roles(data):
    """从请求数据中解析角色，支持数组或逗号分隔字符串，返回 (roles_list, error_msg)"""
    raw = data.get('roles', data.get('role'))
    if raw is None:
        return None, None
    if isinstance(raw, list):
        roles = [r.strip() for r in raw if isinstance(r, str) and r.strip()]
    elif isinstance(raw, str):
        roles = [r.strip() for r in raw.split(',') if r.strip()]
    else:
        return None, '角色格式无效'
    if not roles:
        return None, '角色不能为空'
    invalid = [r for r in roles if r not in VALID_ROLES]
    if invalid:
        return None, f'无效的角色: {", ".join(invalid)}'
    return roles, None


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

    roles, err = _parse_roles(data)
    if err:
        return error_response(err, 400)
    if not roles:
        return error_response('角色不能为空', 400)

    if not username or not password or not real_name:
        return error_response('用户名、密码和真实姓名不能为空', 400)

    if len(password) < 6:
        return error_response('密码长度不能少于6位', 400)

    if User.query.filter_by(username=username).first():
        return error_response('用户名已存在', 400)

    user = User(username=username, real_name=real_name, role=','.join(roles))
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

    if 'real_name' in data and data['real_name'].strip():
        user.real_name = data['real_name'].strip()

    if 'roles' in data or 'role' in data:
        roles, err = _parse_roles(data)
        if err:
            return error_response(err, 400)
        if roles:
            user.role = ','.join(roles)

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
