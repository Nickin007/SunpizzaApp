from flask import Blueprint, request
from app import db
from app.models import TrainingCategory, TrainingCourse, ExamQuestion, LearningRecord
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
    """获取课程详情"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    return success_response(data=course.to_dict(), message='获取课程详情成功')

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

