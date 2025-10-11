from flask import Blueprint, request
from app import db
from app.models import User, Shop
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

@bp.route('/register', methods=['POST'])
@admin_required
def register(current_user):
    """注册新用户（仅管理员可操作）"""
    data = request.get_json()
    
    # 验证必填字段
    required_fields = ['username', 'password', 'real_name', 'role']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'字段 {field} 不能为空', 400)
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=data['username']).first():
        return error_response('用户名已存在', 400)
    
    # 验证角色
    valid_roles = ['admin', 'regional_manager', 'shop_manager']
    if data['role'] not in valid_roles:
        return error_response('无效的用户角色', 400)
    
    # 创建用户
    user = User(
        username=data['username'],
        real_name=data['real_name'],
        role=data['role'],
        shop_id=data.get('shop_id')
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        return success_response(data=user.to_dict(), message='用户创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

@bp.route('/', methods=['GET'])
@token_required
def get_users(current_user):
    """获取用户列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    role = request.args.get('role')
    shop_id = request.args.get('shop_id', type=int)
    
    query = User.query
    
    # 筛选条件
    if role:
        query = query.filter_by(role=role)
    if shop_id:
        query = query.filter_by(shop_id=shop_id)
    
    # 分页
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    users = [user.to_dict() for user in pagination.items]
    
    return paginated_response(
        items=users,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message='获取用户列表成功'
    )

@bp.route('/<int:user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    """获取用户详情"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    return success_response(data=user.to_dict(), message='获取用户信息成功')

@bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(current_user, user_id):
    """更新用户信息（仅管理员可操作）"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    data = request.get_json()
    
    # 更新允许的字段
    if 'real_name' in data:
        user.real_name = data['real_name']
    if 'role' in data:
        user.role = data['role']
    if 'shop_id' in data:
        user.shop_id = data['shop_id']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    
    try:
        db.session.commit()
        return success_response(data=user.to_dict(), message='用户更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, user_id):
    """删除用户（仅管理员可操作）"""
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    try:
        db.session.delete(user)
        db.session.commit()
        return success_response(message='用户删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

