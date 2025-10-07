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
        # 店长只能看到自己创建的或分配给自己的工单
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
    
    # 验证必填字段
    required_fields = ['title', 'type_id', 'priority_id', 'assignee_id', 'shop_id', 'due_date']
    for field in required_fields:
        if not data.get(field):
            return error_response(f'字段 {field} 不能为空', 400)
    
    # 解析截止日期
    try:
        due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
    except:
        return error_response('截止日期格式错误', 400)
    
    work_order = WorkOrder(
        title=data['title'],
        description=data.get('description', ''),
        type_id=data['type_id'],
        priority_id=data['priority_id'],
        status_id=data.get('status_id', 1),  # 默认状态为"待受理"
        creator_id=current_user['user_id'],
        assignee_id=data['assignee_id'],
        shop_id=data['shop_id'],
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
    work_order = WorkOrder.query.get(work_order_id)
    if not work_order:
        return error_response('工单不存在', 404)
    
    data = request.get_json()
    
    # 更新允许的字段
    if 'title' in data:
        work_order.title = data['title']
    if 'description' in data:
        work_order.description = data['description']
    if 'status_id' in data:
        work_order.status_id = data['status_id']
    if 'priority_id' in data:
        work_order.priority_id = data['priority_id']
    if 'completion_progress' in data:
        work_order.completion_progress = data['completion_progress']
    if 'completion_notes' in data:
        work_order.completion_notes = data['completion_notes']
    if 'due_date' in data:
        try:
            work_order.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            return error_response('截止日期格式错误', 400)
    
    try:
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

