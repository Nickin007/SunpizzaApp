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
    valid_roles = ['admin', 'regional_manager', 'shop_manager', 'delivery_operation']
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
    """删除用户及其所有相关数据（仅管理员可操作）"""
    from app.models import WorkOrder, TaskComment, TaskAttachment, ActivityLog
    
    user = User.query.get(user_id)
    if not user:
        return error_response('用户不存在', 404)
    
    # 防止删除自己
    if user_id == current_user['user_id']:
        return error_response('不能删除当前登录的用户', 400)
    
    try:
        # 统计将要删除的数据
        work_orders_created = WorkOrder.query.filter_by(creator_id=user_id).count()
        work_orders_assigned = WorkOrder.query.filter_by(assignee_id=user_id).count()
        comments_count = TaskComment.query.filter_by(author_id=user_id).count()
        
        # 1. 删除该用户创建的工单及其关联数据
        created_work_orders = WorkOrder.query.filter_by(creator_id=user_id).all()
        for wo in created_work_orders:
            # 删除工单的评论
            TaskComment.query.filter_by(work_order_id=wo.id).delete()
            # 删除工单的附件
            TaskAttachment.query.filter_by(work_order_id=wo.id).delete()
            # 删除工单的活动日志
            ActivityLog.query.filter_by(work_order_id=wo.id).delete()
            # 删除工单本身
            db.session.delete(wo)
        
        # 2. 删除分配给该用户的工单及其关联数据
        assigned_work_orders = WorkOrder.query.filter_by(assignee_id=user_id).all()
        for wo in assigned_work_orders:
            # 避免重复删除（如果用户既是创建者又是被分配人）
            if wo.creator_id != user_id:
                TaskComment.query.filter_by(work_order_id=wo.id).delete()
                TaskAttachment.query.filter_by(work_order_id=wo.id).delete()
                ActivityLog.query.filter_by(work_order_id=wo.id).delete()
                db.session.delete(wo)
        
        # 3. 删除该用户发表的评论（其他人工单上的评论）
        TaskComment.query.filter_by(author_id=user_id).delete()
        
        # 4. 删除该用户的活动日志
        # - 删除该用户执行的操作日志
        ActivityLog.query.filter_by(user_id=user_id).delete()
        # - 删除目标是该用户的操作日志（如"分配给该用户"的日志）
        ActivityLog.query.filter_by(target_user_id=user_id).delete()
        
        # 5. 删除该用户上传的附件（其他人工单上的附件）
        TaskAttachment.query.filter_by(uploaded_by=user_id).delete()
        
        # 6. 最后删除用户本身
        db.session.delete(user)
        
        # 提交所有更改
        db.session.commit()
        
        return success_response(
            message='用户及其所有相关数据已删除',
            data={
                'deleted_user': {
                    'id': user.id,
                    'username': user.username,
                    'real_name': user.real_name
                },
                'statistics': {
                    'work_orders_created': work_orders_created,
                    'work_orders_assigned': work_orders_assigned,
                    'comments': comments_count
                }
            }
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

@bp.route('/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def reset_password(current_user, user_id):
    """重置用户密码（仅管理员可操作）"""
    data = request.get_json()
    
    # 验证必填字段
    if not data.get('admin_password') or not data.get('new_password'):
        return error_response('管理员密码和新密码不能为空', 400)
    
    # 验证管理员密码
    admin_user = User.query.get(current_user['user_id'])
    if not admin_user or not admin_user.check_password(data['admin_password']):
        return error_response('管理员密码错误', 401)
    
    # 获取目标用户
    target_user = User.query.get(user_id)
    if not target_user:
        return error_response('目标用户不存在', 404)
    
    # 重置密码
    try:
        target_user.set_password(data['new_password'])
        db.session.commit()
        return success_response(
            message='密码重置成功',
            data={
                'user_id': target_user.id,
                'username': target_user.username,
                'new_password': data['new_password']  # 返回新密码供管理员记录
            }
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f'密码重置失败: {str(e)}', 500)

