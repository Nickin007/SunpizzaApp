from flask import Blueprint, request
from datetime import datetime
from app import db
from app.models import WorkOrder, TaskComment, TaskAttachment, DictTaskType, DictPriority, DictStatus, ActivityLog
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
        db.session.flush()  # 获取work_order的ID
        
        # 记录活动日志 - 工单创建
        activity = ActivityLog(
            action_type='work_order_created',
            work_order_id=work_order.id,
            user_id=current_user['user_id']
        )
        db.session.add(activity)
        
        # 如果分配给其他人，记录分配日志
        if assignee_id != current_user['user_id']:
            assign_activity = ActivityLog(
                action_type='work_order_assigned',
                work_order_id=work_order.id,
                user_id=current_user['user_id'],
                target_user_id=assignee_id
            )
            db.session.add(assign_activity)
        
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
        db.session.flush()
        
        # 如果状态改变，记录活动日志
        if status_changed and old_status_id != new_status_id:
            old_status = DictStatus.query.get(old_status_id)
            new_status = DictStatus.query.get(new_status_id)
            
            if old_status and new_status:
                # 记录活动日志
                activity = ActivityLog(
                    action_type='work_order_status_changed',
                    work_order_id=work_order.id,
                    user_id=current_user['user_id'],
                    old_value=old_status.status_name,
                    new_value=new_status.status_name
                )
                db.session.add(activity)
                
                # 自动添加评论记录
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
        
        # 记录活动日志
        activity = ActivityLog(
            action_type='work_order_comment',
            work_order_id=work_order_id,
            user_id=current_user['user_id'],
            comment=data['content'][:100]  # 只存储前100个字符
        )
        db.session.add(activity)
        
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

# ==================== 字典管理 - 新增功能 ====================

@bp.route('/dict/types', methods=['POST'])
@admin_required
def create_task_type(current_user):
    """创建任务类型（仅管理员）"""
    data = request.get_json()
    
    if not data.get('type_name'):
        return error_response('类型名称不能为空', 400)
    
    task_type = DictTaskType(
        type_name=data['type_name'],
        color=data.get('color', '#999999')
    )
    
    try:
        db.session.add(task_type)
        db.session.commit()
        return success_response(data=task_type.to_dict(), message='任务类型创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

@bp.route('/dict/priorities', methods=['POST'])
@admin_required
def create_priority(current_user):
    """创建优先级（仅管理员）"""
    data = request.get_json()
    
    if not data.get('priority_name'):
        return error_response('优先级名称不能为空', 400)
    
    priority = DictPriority(
        priority_name=data['priority_name'],
        color=data.get('color', '#999999'),
        sort_order=data.get('sort_order', 1)
    )
    
    try:
        db.session.add(priority)
        db.session.commit()
        return success_response(data=priority.to_dict(), message='优先级创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

@bp.route('/dict/statuses', methods=['POST'])
@admin_required
def create_status(current_user):
    """创建工单状态（仅管理员）"""
    data = request.get_json()
    
    if not data.get('status_name'):
        return error_response('状态名称不能为空', 400)
    
    status = DictStatus(
        status_name=data['status_name'],
        color=data.get('color', '#999999')
    )
    
    try:
        db.session.add(status)
        db.session.commit()
        return success_response(data=status.to_dict(), message='工单状态创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

# ==================== 字典管理 - 编辑功能 ====================

@bp.route('/dict/types/<int:type_id>', methods=['PUT'])
@admin_required
def update_task_type(current_user, type_id):
    """更新任务类型（仅管理员）"""
    task_type = DictTaskType.query.get(type_id)
    if not task_type:
        return error_response('任务类型不存在', 404)
    
    data = request.get_json()
    if 'type_name' in data:
        task_type.type_name = data['type_name']
    if 'color' in data:
        task_type.color = data['color']
    
    try:
        db.session.commit()
        return success_response(data=task_type.to_dict(), message='任务类型更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/dict/types/<int:type_id>', methods=['DELETE'])
@admin_required
def delete_task_type(current_user, type_id):
    """删除任务类型（仅管理员）"""
    task_type = DictTaskType.query.get(type_id)
    if not task_type:
        return error_response('任务类型不存在', 404)
    
    # 检查是否有工单使用此类型
    work_order_count = WorkOrder.query.filter_by(type_id=type_id).count()
    if work_order_count > 0:
        return error_response(f'无法删除，有 {work_order_count} 个工单正在使用此类型', 400)
    
    try:
        db.session.delete(task_type)
        db.session.commit()
        return success_response(message='任务类型删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

@bp.route('/dict/priorities/<int:priority_id>', methods=['PUT'])
@admin_required
def update_priority(current_user, priority_id):
    """更新优先级（仅管理员）"""
    priority = DictPriority.query.get(priority_id)
    if not priority:
        return error_response('优先级不存在', 404)
    
    data = request.get_json()
    if 'priority_name' in data:
        priority.priority_name = data['priority_name']
    if 'color' in data:
        priority.color = data['color']
    if 'sort_order' in data:
        priority.sort_order = data['sort_order']
    
    try:
        db.session.commit()
        return success_response(data=priority.to_dict(), message='优先级更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/dict/priorities/<int:priority_id>', methods=['DELETE'])
@admin_required
def delete_priority(current_user, priority_id):
    """删除优先级（仅管理员）"""
    priority = DictPriority.query.get(priority_id)
    if not priority:
        return error_response('优先级不存在', 404)
    
    # 检查是否有工单使用此优先级
    work_order_count = WorkOrder.query.filter_by(priority_id=priority_id).count()
    if work_order_count > 0:
        return error_response(f'无法删除，有 {work_order_count} 个工单正在使用此优先级', 400)
    
    try:
        db.session.delete(priority)
        db.session.commit()
        return success_response(message='优先级删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

@bp.route('/dict/statuses/<int:status_id>', methods=['PUT'])
@admin_required
def update_status(current_user, status_id):
    """更新工单状态（仅管理员）"""
    status = DictStatus.query.get(status_id)
    if not status:
        return error_response('工单状态不存在', 404)
    
    data = request.get_json()
    if 'status_name' in data:
        status.status_name = data['status_name']
    if 'color' in data:
        status.color = data['color']
    
    try:
        db.session.commit()
        return success_response(data=status.to_dict(), message='工单状态更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/dict/statuses/<int:status_id>', methods=['DELETE'])
@admin_required
def delete_status(current_user, status_id):
    """删除工单状态（仅管理员）"""
    status = DictStatus.query.get(status_id)
    if not status:
        return error_response('工单状态不存在', 404)
    
    # 检查是否有工单使用此状态
    work_order_count = WorkOrder.query.filter_by(status_id=status_id).count()
    if work_order_count > 0:
        return error_response(f'无法删除，有 {work_order_count} 个工单正在使用此状态', 400)
    
    try:
        db.session.delete(status)
        db.session.commit()
        return success_response(message='工单状态删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

# ==================== 工单统计 ====================

@bp.route('/stats', methods=['GET'])
@token_required
def get_work_order_stats(current_user):
    """获取工单统计数据（用于首页仪表盘）- 旧版API"""
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

@bp.route('/statistics', methods=['GET'])
@token_required
def get_statistics(current_user):
    """获取工单统计数据（标准格式）"""
    from app.models import Shop
    
    # 基础查询
    base_query = WorkOrder.query
    
    # 根据角色过滤数据
    if current_user['role'] == 'shop_manager':
        if current_user.get('shop_id'):
            base_query = base_query.filter(WorkOrder.shop_id == current_user['shop_id'])
        else:
            base_query = base_query.filter(
                (WorkOrder.creator_id == current_user['user_id']) |
                (WorkOrder.assignee_id == current_user['user_id'])
            )
    elif current_user['role'] == 'regional_manager':
        managed_shop_ids = [s.id for s in Shop.query.filter_by(regional_manager_id=current_user['user_id']).all()]
        if managed_shop_ids:
            base_query = base_query.filter(WorkOrder.shop_id.in_(managed_shop_ids))
        else:
            # 如果没有管辖门店，返回空统计
            return success_response(data={
                'total': 0,
                'pending': 0,
                'in_progress': 0,
                'completed': 0,
                'archived': 0
            })
    
    # 获取各状态ID（假设：1=待受理, 2=进行中, 3=已完成, 4=已归档）
    total = base_query.count()
    pending = base_query.filter_by(status_id=1).count()
    in_progress = base_query.filter_by(status_id=2).count()
    completed = base_query.filter_by(status_id=3).count()
    archived = base_query.filter_by(status_id=4).count()
    
    stats = {
        'total': total,
        'pending': pending,
        'in_progress': in_progress,
        'completed': completed,
        'archived': archived
    }
    
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

# ==================== 活动日志 ====================

@bp.route('/activities', methods=['GET'])
@token_required
def get_activities(current_user):
    """获取活动日志列表（用于首页最新动态）"""
    from app.models import User
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 基础查询 - 按时间倒序
    query = ActivityLog.query.order_by(ActivityLog.created_at.desc())
    
    # 根据角色过滤数据
    if current_user['role'] == 'shop_manager':
        # 店长只看与自己相关的工单活动
        # 1. 自己创建的工单
        # 2. 分配给自己的工单
        # 3. 自己门店的工单
        current_user_obj = User.query.get(current_user['user_id'])
        if current_user_obj and current_user_obj.shop_id:
            # 获取该店长相关的所有工单ID
            related_work_orders = WorkOrder.query.filter(
                (WorkOrder.creator_id == current_user['user_id']) |
                (WorkOrder.assignee_id == current_user['user_id']) |
                (WorkOrder.shop_id == current_user_obj.shop_id)
            ).all()
            related_work_order_ids = [wo.id for wo in related_work_orders]
            
            if related_work_order_ids:
                query = query.filter(ActivityLog.work_order_id.in_(related_work_order_ids))
            else:
                # 如果没有相关工单，返回空列表
                return success_response(
                    data=[],
                    message='获取活动日志成功',
                    page=1,
                    pages=0,
                    total=0,
                    per_page=per_page
                )
        else:
            # 如果没有门店，只看与自己直接相关的
            query = query.join(WorkOrder).filter(
                (WorkOrder.creator_id == current_user['user_id']) |
                (WorkOrder.assignee_id == current_user['user_id'])
            )
    
    elif current_user['role'] == 'regional_manager':
        # 区域经理能看到所有活动（暂时）
        pass
    
    # admin 可以看到所有活动
    
    # 分页
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    activities = [{
        **activity.to_dict(),
    } for activity in pagination.items]
    
    # 返回格式与前端期望一致
    return success_response(
        data={
            'data': activities,
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'per_page': per_page
        },
        message='获取活动日志成功'
    )

