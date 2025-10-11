from flask import Blueprint, request
from datetime import datetime
from app import db
from app.models import TrainingCategory, TrainingCourse, LearningRecord
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response

bp = Blueprint('training', __name__, url_prefix='/api/training')

@bp.route('/categories', methods=['GET'])
@token_required
def get_categories(current_user):
    """获取培训分类树"""
    training_type = request.args.get('type')
    
    query = TrainingCategory.query.filter_by(parent_id=None)
    if training_type:
        query = query.filter_by(type=training_type)
    
    categories = query.order_by(TrainingCategory.sort_order).all()
    return success_response(
        data=[cat.to_dict(include_children=True) for cat in categories],
        message='获取分类成功'
    )

@bp.route('/courses', methods=['GET'])
@token_required
def get_courses(current_user):
    """获取课程列表"""
    category_id = request.args.get('category_id', type=int)
    
    query = TrainingCourse.query.filter_by(is_published=True)
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    courses = query.all()
    return success_response(
        data=[course.to_dict() for course in courses],
        message='获取课程列表成功'
    )

@bp.route('/courses/<int:course_id>', methods=['GET'])
@token_required
def get_course(current_user, course_id):
    """获取课程详情（包含视频、文档，但不包含考试答案）"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    # 获取用户的学习记录
    record = LearningRecord.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    course_data = course.to_dict(include_questions=False)
    course_data['learning_record'] = record.to_dict() if record else None
    
    return success_response(data=course_data, message='获取课程详情成功')

@bp.route('/courses/<int:course_id>/start', methods=['POST'])
@token_required
def start_learning(current_user, course_id):
    """开始学习课程"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    # 检查是否已有学习记录
    record = LearningRecord.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    if not record:
        record = LearningRecord(
            user_id=current_user['user_id'],
            course_id=course_id
        )
        db.session.add(record)
        db.session.commit()
    
    return success_response(data=record.to_dict(), message='开始学习')

@bp.route('/courses/<int:course_id>/complete', methods=['POST'])
@token_required
def complete_learning(current_user, course_id):
    """完成课程学习"""
    record = LearningRecord.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    if not record:
        return error_response('未找到学习记录', 404)
    
    from datetime import datetime
    record.completed = True
    record.completed_at = datetime.utcnow()
    db.session.commit()
    
    return success_response(data=record.to_dict(), message='课程学习完成')

@bp.route('/my-records', methods=['GET'])
@token_required
def get_my_learning_records(current_user):
    """获取我的学习记录"""
    records = LearningRecord.query.filter_by(user_id=current_user['user_id']).all()
    return success_response(
        data=[r.to_dict() for r in records],
        message='获取学习记录成功'
    )

# ==================== 管理员课程管理API ====================

@bp.route('/admin/courses', methods=['GET'])
@admin_required
def get_admin_courses(current_user):
    """获取所有课程列表（仅管理员）- 包括未发布的课程"""
    category_id = request.args.get('category_id', type=int)
    
    query = TrainingCourse.query  # 不过滤 is_published，返回所有课程
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    courses = query.order_by(TrainingCourse.created_at.desc()).all()
    return success_response(
        data=[course.to_dict() for course in courses],
        message='获取课程列表成功'
    )

@bp.route('/admin/courses', methods=['POST'])
@admin_required
def create_course(current_user):
    """创建课程（仅管理员）"""
    data = request.get_json()
    
    if not data.get('title') or not data.get('category_id'):
        return error_response('课程标题和分类不能为空', 400)
    
    course = TrainingCourse(
        title=data['title'],
        description=data.get('description', ''),
        category_id=data['category_id'],
        video_url=data.get('video_url'),
        document_content=data.get('document_content', ''),
        is_published=data.get('is_published', True)
    )
    
    db.session.add(course)
    db.session.commit()
    
    return success_response(data=course.to_dict(), message='课程创建成功', code=201)

@bp.route('/admin/courses/<int:course_id>', methods=['PUT'])
@admin_required
def update_course(current_user, course_id):
    """更新课程（仅管理员）"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    data = request.get_json()
    
    if 'title' in data:
        course.title = data['title']
    if 'description' in data:
        course.description = data['description']
    if 'category_id' in data:
        course.category_id = data['category_id']
    if 'video_url' in data:
        course.video_url = data['video_url']
    if 'document_content' in data:
        course.document_content = data['document_content']
    if 'is_published' in data:
        course.is_published = data['is_published']
    
    db.session.commit()
    
    return success_response(data=course.to_dict(), message='课程更新成功')

@bp.route('/admin/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def delete_course(current_user, course_id):
    """删除课程（仅管理员）- 只能删除未发布的课程"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    # 检查课程是否已发布
    if course.is_published:
        return error_response('无法删除已发布的课程，请先将课程设置为"未发布"状态', 400)
    
    try:
        # 统计相关记录数量（用于日志）
        record_count = LearningRecord.query.filter_by(course_id=course_id).count()
        
        # 删除学习记录
        LearningRecord.query.filter_by(course_id=course_id).delete()
        
        # 最后删除课程本身
        db.session.delete(course)
        db.session.commit()
        
        # 返回详细信息
        message = f'课程删除成功'
        if record_count > 0:
            message += f'（同时删除了{record_count}条学习记录）'
        
        return success_response(message=message)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)
