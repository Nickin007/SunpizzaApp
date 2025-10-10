from flask import Blueprint, request
from datetime import datetime
from app import db
from app.models import TrainingCategory, TrainingCourse, ExamQuestion, LearningRecord, ExamSubmission
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
    
    # 获取考试提交记录
    exam_submission = ExamSubmission.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    course_data = course.to_dict(include_questions=False)
    course_data['learning_record'] = record.to_dict() if record else None
    course_data['exam_submission'] = exam_submission.to_dict(include_answers=False) if exam_submission else None
    
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

# ==================== 考试相关API ====================

@bp.route('/courses/<int:course_id>/exam', methods=['GET'])
@token_required
def get_exam_questions(current_user, course_id):
    """获取考试题目（不含答案）"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    if not course.has_exam:
        return error_response('该课程没有考试', 400)
    
    # 检查是否已经提交过考试
    existing_submission = ExamSubmission.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    if existing_submission:
        return error_response('您已经提交过该课程的考试', 400)
    
    questions = ExamQuestion.query.filter_by(course_id=course_id).order_by(ExamQuestion.sort_order).all()
    
    return success_response(
        data={
            'course_id': course_id,
            'course_title': course.title,
            'questions': [q.to_dict(include_answer=False) for q in questions],
            'total_score': sum(q.score for q in questions)
        },
        message='获取考试题目成功'
    )

@bp.route('/courses/<int:course_id>/submit-exam', methods=['POST'])
@token_required
def submit_exam(current_user, course_id):
    """提交考试答案"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    if not course.has_exam:
        return error_response('该课程没有考试', 400)
    
    # 检查是否已经提交过
    existing_submission = ExamSubmission.query.filter_by(
        user_id=current_user['user_id'],
        course_id=course_id
    ).first()
    
    if existing_submission:
        return error_response('您已经提交过该课程的考试', 400)
    
    data = request.get_json()
    answers = data.get('answers', {})  # 格式: {"1": "A", "2": "B,C", "3": "主观题答案..."}
    
    # 获取所有题目
    questions = ExamQuestion.query.filter_by(course_id=course_id).all()
    
    # 自动判分客观题
    objective_score = 0
    for question in questions:
        if not question.is_subjective:
            user_answer = str(answers.get(str(question.id), '')).strip()
            correct_answer = str(question.correct_answer).strip()
            
            if user_answer == correct_answer:
                objective_score += question.score
    
    # 创建提交记录
    submission = ExamSubmission(
        user_id=current_user['user_id'],
        course_id=course_id,
        answers=answers,
        objective_score=objective_score,
        subjective_score=0,  # 待审核
        total_score=objective_score,  # 暂时只有客观题得分
        status='pending_review'  # 等待审核主观题
    )
    
    db.session.add(submission)
    db.session.commit()
    
    return success_response(
        data=submission.to_dict(),
        message='考试提交成功，请等待管理员审核主观题',
        code=201
    )

@bp.route('/my-exams', methods=['GET'])
@token_required
def get_my_exams(current_user):
    """获取我的考试记录"""
    submissions = ExamSubmission.query.filter_by(user_id=current_user['user_id']).order_by(ExamSubmission.created_at.desc()).all()
    
    return success_response(
        data=[s.to_dict(include_answers=False) for s in submissions],
        message='获取考试记录成功'
    )

# ==================== 管理员审核API ====================

@bp.route('/admin/pending-exams', methods=['GET'])
@admin_required
def get_pending_exams(current_user):
    """获取待审核的考试列表（仅管理员）"""
    submissions = ExamSubmission.query.filter_by(status='pending_review').order_by(ExamSubmission.created_at).all()
    
    result = []
    for submission in submissions:
        submission_data = submission.to_dict(include_answers=True)
        
        # 添加题目详情（包含答案，用于对比）
        questions = ExamQuestion.query.filter_by(course_id=submission.course_id).order_by(ExamQuestion.sort_order).all()
        submission_data['questions'] = [q.to_dict(include_answer=True) for q in questions]
        
        result.append(submission_data)
    
    return success_response(
        data=result,
        message='获取待审核考试成功'
    )

@bp.route('/admin/review-exam/<int:submission_id>', methods=['POST'])
@admin_required
def review_exam(current_user, submission_id):
    """审核主观题并评分（仅管理员）"""
    submission = ExamSubmission.query.get(submission_id)
    if not submission:
        return error_response('考试提交记录不存在', 404)
    
    if submission.status != 'pending_review':
        return error_response('该考试已经审核过了', 400)
    
    data = request.get_json()
    subjective_score = data.get('subjective_score', 0)  # 主观题得分
    feedback = data.get('feedback', '')  # 审核反馈
    
    # 计算总分
    submission.subjective_score = subjective_score
    submission.total_score = submission.objective_score + subjective_score
    submission.reviewed_by = current_user['user_id']
    submission.reviewed_at = datetime.utcnow()
    submission.feedback = feedback
    
    # 判断是否通过（默认60分及格）
    passing_score = data.get('passing_score', 60)
    if submission.total_score >= passing_score:
        submission.status = 'passed'
    else:
        submission.status = 'failed'
    
    db.session.commit()
    
    return success_response(
        data=submission.to_dict(),
        message='审核完成'
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
        has_exam=data.get('has_exam', False),
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
    if 'has_exam' in data:
        course.has_exam = data['has_exam']
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
        submission_count = ExamSubmission.query.filter_by(course_id=course_id).count()
        question_count = ExamQuestion.query.filter_by(course_id=course_id).count()
        
        # 级联删除：先删除考试提交（有外键依赖）
        ExamSubmission.query.filter_by(course_id=course_id).delete()
        
        # 删除学习记录
        LearningRecord.query.filter_by(course_id=course_id).delete()
        
        # 删除考试题目
        ExamQuestion.query.filter_by(course_id=course_id).delete()
        
        # 最后删除课程本身
        db.session.delete(course)
        db.session.commit()
        
        # 返回详细信息
        deleted_info = []
        if record_count > 0:
            deleted_info.append(f'{record_count}条学习记录')
        if submission_count > 0:
            deleted_info.append(f'{submission_count}条考试记录')
        if question_count > 0:
            deleted_info.append(f'{question_count}道题目')
        
        message = f'课程删除成功'
        if deleted_info:
            message += f'（同时删除了{", ".join(deleted_info)}）'
        
        return success_response(message=message)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

# ==================== 题目管理API ====================

@bp.route('/admin/courses/<int:course_id>/questions', methods=['POST'])
@admin_required
def add_questions(current_user, course_id):
    """批量添加考试题目（仅管理员）"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    data = request.get_json()
    questions_data = data.get('questions', [])
    
    if not questions_data:
        return error_response('题目列表不能为空', 400)
    
    questions = []
    for idx, q_data in enumerate(questions_data):
        question = ExamQuestion(
            course_id=course_id,
            question_text=q_data['question_text'],
            question_type=q_data['question_type'],
            options=q_data.get('options'),
            correct_answer=q_data.get('correct_answer'),
            is_subjective=q_data.get('is_subjective', q_data['question_type'] == 'subjective'),
            score=q_data.get('score', 10),
            sort_order=q_data.get('sort_order', idx)
        )
        questions.append(question)
    
    db.session.add_all(questions)
    course.has_exam = True  # 自动设置为有考试
    db.session.commit()
    
    return success_response(
        data=[q.to_dict(include_answer=True) for q in questions],
        message=f'成功添加 {len(questions)} 道题目',
        code=201
    )

@bp.route('/admin/questions/<int:question_id>', methods=['PUT'])
@admin_required
def update_question(current_user, question_id):
    """更新题目（仅管理员）"""
    question = ExamQuestion.query.get(question_id)
    if not question:
        return error_response('题目不存在', 404)
    
    data = request.get_json()
    
    if 'question_text' in data:
        question.question_text = data['question_text']
    if 'question_type' in data:
        question.question_type = data['question_type']
    if 'options' in data:
        question.options = data['options']
    if 'correct_answer' in data:
        question.correct_answer = data['correct_answer']
    if 'is_subjective' in data:
        question.is_subjective = data['is_subjective']
    if 'score' in data:
        question.score = data['score']
    if 'sort_order' in data:
        question.sort_order = data['sort_order']
    
    db.session.commit()
    
    return success_response(data=question.to_dict(include_answer=True), message='题目更新成功')

@bp.route('/admin/questions/<int:question_id>', methods=['DELETE'])
@admin_required
def delete_question(current_user, question_id):
    """删除题目（仅管理员）"""
    question = ExamQuestion.query.get(question_id)
    if not question:
        return error_response('题目不存在', 404)
    
    db.session.delete(question)
    db.session.commit()
    
    return success_response(message='题目删除成功')

@bp.route('/admin/courses/<int:course_id>/questions', methods=['GET'])
@admin_required
def get_course_questions(current_user, course_id):
    """获取课程的所有题目（仅管理员，含答案）"""
    course = TrainingCourse.query.get(course_id)
    if not course:
        return error_response('课程不存在', 404)
    
    questions = ExamQuestion.query.filter_by(course_id=course_id).order_by(ExamQuestion.sort_order).all()
    
    return success_response(
        data=[q.to_dict(include_answer=True) for q in questions],
        message='获取题目列表成功'
    )

