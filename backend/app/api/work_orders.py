from flask import Blueprint, request
from datetime import datetime
from app import db
from app.models import WorkOrder, TaskComment, TaskAttachment, DictTaskType, DictPriority, DictStatus
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('work_orders', __name__, url_prefix='/api/work-orders')

@bp.route('/', methods=['GET'])
@token_required
def get_work_orders(current_user):
    """获取工单列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 筛选参数
    status_id = request.args.get('status_id', type=int)
    type_id = request.args.get('type_id', type=int)
    priority_id = request.args.get('priority_id', type=int)
    shop_id = request.args.get('shop_id', type=int)
    assignee_id = request.args.get('assignee_id', type=int)
    creator_id = request.args.get('creator_id', type=int)
    
    query = WorkOrder.query
    
    # 根据角色过滤
    if current_user['role'] == 'shop_manager':
        # 店长可以看到自己门店的所有工单
        if current_user.get('shop_id'):
            query = query.filter(WorkOrder.shop_id == current_user['shop_id'])
        else:
            # 如果店长没有关联门店，只能看到自己创建的或分配给自己的工单
            query = query.filter(
                (WorkOrder.creator_id == current_user['user_id']) |
                (WorkOrder.assignee_id == current_user['user_id'])
            )
    elif current_user['role'] == 'regional_manager':
        # 区域经理可以看到管辖门店的所有工单
        from app.models import Shop
        managed_shop_ids = [s.id for s in Shop.query.filter_by(regional_manager_id=current_user['user_id']).all()]
        query = query.filter(WorkOrder.shop_id.in_(managed_shop_ids))
    
    # 应用筛选条件
    if status_id:
        query = query.filter_by(status_id=status_id)
    if type_id:
        query = query.filter_by(type_id=type_id)
    if priority_id:
        query = query.filter_by(priority_id=priority_id)
    if shop_id:
        query = query.filter_by(shop_id=shop_id)
    if assignee_id:
        query = query.filter_by(assignee_id=assignee_id)
    if creator_id:
        query = query.filter_by(creator_id=creator_id)
    
    # 按优先级和创建时间排序
    query = query.join(DictPriority).order_by(DictPriority.sort_order.desc(), WorkOrder.created_at.desc())
    
    # 分页
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    work_orders = [wo.to_dict() for wo in pagination.items]
    
    return paginated_response(
        items=work_orders,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message='获取工单列表成功'
    )

@bp.route('/<int:work_order_id>', methods=['GET'])
@token_required
def get_work_order(current_user, work_order_id):
    """获取工单详情"""
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return error_response('工单不存在', 404)
    
    # 权限检查
    if current_user['role'] != 'admin':
        if current_user['role'] == 'shop_manager':
            if work_order.creator_id != current_user['user_id'] and work_order.assignee_id != current_user['user_id']:
                return error_response('无权访问该工单', 403)
    
    return success_response(data=work_order.to_dict(include_details=True), message='获取工单详情成功')

@bp.route('/', methods=['POST'])
@token_required
def create_work_order(current_user):
    """创建工单"""
    data = request.get_json()
    
    # 验证必填字段（只要求必须的字段）
    required_fields = ['title', 'type_id', 'priority_id']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'字段 {field} 不能为空', 400)
    
    # 自动设置门店（从当前用户的门店）
    shop_id = data.get('shop_id') or current_user.get('shop_id')
    if not shop_id:
        if current_user['role'] == 'admin':
            return error_response('请指定工单所属门店（shop_id）', 400)
        else:
            return error_response('无法确定工单所属门店，请联系管理员', 400)
    
    # 自动设置受理人（如果未指定，默认分配给当前用户）
    assignee_id = data.get('assignee_id') or current_user['user_id']
    
    # 解析截止日期（如果提供）
    due_date = None
    if data.get('due_date'):
        try:
            due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            return error_response('截止日期格式错误', 400)
    else:
        # 如果没有提供截止日期，设置为7天后
        from datetime import timedelta
        due_date = datetime.utcnow() + timedelta(days=7)
    
    work_order = WorkOrder(
        title=data['title'],
        description=data.get('description', ''),
        type_id=data['type_id'],
        priority_id=data['priority_id'],
        status_id=data.get('status_id', 1),  # 默认状态为"待受理"（ID=1）
        creator_id=current_user['user_id'],
        assignee_id=assignee_id,
        shop_id=shop_id,
        due_date=due_date
    )
    
    try:
        db.session.add(work_order)
        db.session.commit()
        
        # TODO: 发送推送通知给被分配人
        
        return success_response(data=work_order.to_dict(), message='工单创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

@bp.route('/<int:work_order_id>', methods=['PUT'])
@token_required
def update_work_order(current_user, work_order_id):
    """更新工单"""
    from app.models import User
    
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return error_response('工单不存在', 404)
    
    data = request.get_json()
    
    # 获取当前用户信息
    current_user_obj = User.query.get(current_user['user_id'])
    if not current_user_obj:
        return error_response('用户不存在', 404)
    
    old_status_id = work_order.status_id
    new_status_id = data.get('status_id')
    
    # 权限控制：状态更新
    if 'status_id' in data:
        role = current_user['role']
        
        # admin 可以更新任何状态
        if role == 'admin':
            # admin 将工单归档时，必须先完成
            if new_status_id == 4 and old_status_id != 3:
                return error_response('只有已完成的工单才能归档', 400)
        
        # shop_manager 只能将"进行中"改为"已完成"
        elif role == 'shop_manager':
            if old_status_id != 2 or new_status_id != 3:
                return error_response('店长只能将进行中的工单标记为已完成', 403)
        
        # 其他角色不能更新状态
        else:
            return error_response('您没有权限更新工单状态', 403)
    
    # 权限控制：只有 admin 可以更新优先级
    if 'priority_id' in data and current_user['role'] != 'admin':
        return error_response('只有管理员可以更新工单优先级', 403)
    
    # 更新允许的字段
    status_changed = False
    if 'title' in data:
        work_order.title = data['title']
    if 'description' in data:
        work_order.description = data['description']
    if 'status_id' in data:
        work_order.status_id = data['status_id']
        status_changed = True
    if 'priority_id' in data:
        work_order.priority_id = data['priority_id']
    if 'completion_notes' in data:
        work_order.completion_notes = data['completion_notes']
    if 'due_date' in data:
        try:
            work_order.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            return error_response('截止日期格式错误', 400)
    
    try:
        db.session.commit()
        
        # 如果状态改变，自动添加评论记录
        if status_changed and old_status_id != new_status_id:
            old_status = DictStatus.query.get(old_status_id)
            new_status = DictStatus.query.get(new_status_id)
            
            if old_status and new_status:
                comment_content = f'📝 {current_user_obj.real_name} 于 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")} 将该工单从"{old_status.status_name}"状态转至"{new_status.status_name}"状态'
                
                comment = TaskComment(
                    work_order_id=work_order_id,
                    author_id=current_user['user_id'],
                    content=comment_content
                )
                db.session.add(comment)
                db.session.commit()
        
        return success_response(data=work_order.to_dict(), message='工单更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/<int:work_order_id>/comments', methods=['POST'])
@token_required
def add_comment(current_user, work_order_id):
    """添加评论"""
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return error_response('工单不存在', 404)
    
    data = request.get_json()
    
    if not data.get('content'):
        return error_response('评论内容不能为空', 400)
    
    comment = TaskComment(
        work_order_id=work_order_id,
        author_id=current_user['user_id'],
        content=data['content'],
        attachment_url=data.get('attachment_url')
    )
    
    try:
        db.session.add(comment)
        db.session.commit()
        return success_response(data=comment.to_dict(), message='评论添加成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加失败: {str(e)}', 500)

@bp.route('/dict/types', methods=['GET'])
@token_required
def get_task_types(current_user):
    """获取任务类型列表"""
    types = DictTaskType.query.all()
    return success_response(data=[t.to_dict() for t in types], message='获取任务类型成功')

@bp.route('/dict/priorities', methods=['GET'])
@token_required
def get_priorities(current_user):
    """获取优先级列表"""
    priorities = DictPriority.query.order_by(DictPriority.sort_order.desc()).all()
    return success_response(data=[p.to_dict() for p in priorities], message='获取优先级列表成功')

@bp.route('/dict/statuses', methods=['GET'])
@token_required
def get_statuses(current_user):
    """获取状态列表"""
    statuses = DictStatus.query.all()
    return success_response(data=[s.to_dict() for s in statuses], message='获取状态列表成功')

@bp.route('/stats', methods=['GET'])
@token_required
def get_work_order_stats(current_user):
    """获取工单统计数据（用于首页仪表盘）"""
    from app.models import User, Shop
    from sqlalchemy import func
    
    # 基础查询
    base_query = WorkOrder.query
    
    # 根据角色过滤数据
    if current_user['role'] == 'shop_manager':
        # 店长只看自己创建的或分配给自己的工单
        base_query = base_query.filter(
            (WorkOrder.creator_id == current_user['user_id']) |
            (WorkOrder.assignee_id == current_user['user_id'])
        )
    elif current_user['role'] == 'regional_manager':
        # 区域经理看管辖门店的所有工单
        managed_shop_ids = [s.id for s in Shop.query.filter_by(regional_manager_id=current_user['user_id']).all()]
        base_query = base_query.filter(WorkOrder.shop_id.in_(managed_shop_ids))
    
    # 统计各状态的工单数量
    stats = {}
    statuses = DictStatus.query.all()
    
    for status in statuses:
        count = base_query.filter_by(status_id=status.id).count()
        stats[status.status_name] = count
    
    return success_response(data=stats, message='获取统计数据成功')

@bp.route('/assignable-users', methods=['GET'])
@token_required
def get_assignable_users(current_user):
    """获取可分配的用户列表（用于创建/编辑工单时选择受理人）"""
    from app.models import User
    
    # 获取同一门店的用户（如果当前用户有门店）
    if current_user.get('shop_id'):
        users = User.query.filter_by(shop_id=current_user['shop_id']).all()
    else:
        # 管理员可以看到所有用户
        users = User.query.all()
    
    user_list = [{
        'id': u.id,
        'real_name': u.real_name,
        'role': u.role,
        'shop_name': u.shop.name if u.shop else None
    } for u in users]
    
    return success_response(data=user_list, message='获取用户列表成功')

@bp.route('/search-user-by-name', methods=['GET'])
@token_required
def search_user_by_name(current_user):
    """根据真实姓名搜索用户"""
    from app.models import User
    
    real_name = request.args.get('real_name', '').strip()
    if not real_name:
        return error_response('请输入受理人姓名', 400)
    
    # 精确匹配真实姓名
    user = User.query.filter_by(real_name=real_name).first()
    
    if not user:
        return error_response(f'未找到姓名为"{real_name}"的用户', 404)
    
    # 返回用户信息
    return success_response(
        data={
            'id': user.id,
            'username': user.username,
            'real_name': user.real_name,
            'role': user.role,
            'shop_id': user.shop_id
        },
        message='找到用户'
    )

@bp.route('/<int:work_order_id>', methods=['DELETE'])
@admin_required
def delete_work_order(current_user, work_order_id):
    """删除工单（仅管理员）"""
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return error_response('工单不存在', 404)
    
    try:
        # 先删除关联的评论
        TaskComment.query.filter_by(work_order_id=work_order_id).delete()
        
        # 删除关联的附件
        TaskAttachment.query.filter_by(work_order_id=work_order_id).delete()
        
        # 删除工单
        db.session.delete(work_order)
        db.session.commit()
        
        return success_response(message='工单删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败：{str(e)}', 500)

