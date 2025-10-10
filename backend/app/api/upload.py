"""
文件上传API
"""
from flask import Blueprint, request, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from ..utils.auth import admin_required
from ..utils.response import success_response, error_response

bp = Blueprint('upload', __name__, url_prefix='/api/upload')

# 允许的文件扩展名
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_DOCUMENT_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}

# 文件大小限制（MB）
MAX_VIDEO_SIZE = 500  # 500MB
MAX_IMAGE_SIZE = 10   # 10MB
MAX_DOCUMENT_SIZE = 50  # 50MB


def allowed_file(filename, allowed_extensions):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def get_file_size_mb(file):
    """获取文件大小（MB）"""
    file.seek(0, os.SEEK_END)
    size = file.tell() / (1024 * 1024)
    file.seek(0)
    return size


@bp.route('/video', methods=['POST'])
@admin_required
def upload_video(current_user):
    """上传视频文件（仅管理员）"""
    if 'file' not in request.files:
        return error_response('没有上传文件', 400)
    
    file = request.files['file']
    
    if file.filename == '':
        return error_response('文件名为空', 400)
    
    if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
        return error_response(
            f'不支持的文件格式，仅支持: {", ".join(ALLOWED_VIDEO_EXTENSIONS)}',
            400
        )
    
    # 检查文件大小
    file_size = get_file_size_mb(file)
    if file_size > MAX_VIDEO_SIZE:
        return error_response(f'文件大小超过限制（最大{MAX_VIDEO_SIZE}MB）', 400)
    
    try:
        # 生成唯一文件名
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
        
        # 创建上传目录
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'videos')
        os.makedirs(upload_dir, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # 生成访问URL
        file_url = f"/uploads/videos/{unique_filename}"
        
        return success_response(
            data={
                'filename': original_filename,
                'url': file_url,
                'size': round(file_size, 2)
            },
            message='视频上传成功',
            code=201
        )
    
    except Exception as e:
        return error_response(f'上传失败: {str(e)}', 500)


@bp.route('/image', methods=['POST'])
@admin_required
def upload_image(current_user):
    """上传图片文件（仅管理员）"""
    if 'file' not in request.files:
        return error_response('没有上传文件', 400)
    
    file = request.files['file']
    
    if file.filename == '':
        return error_response('文件名为空', 400)
    
    if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return error_response(
            f'不支持的文件格式，仅支持: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}',
            400
        )
    
    # 检查文件大小
    file_size = get_file_size_mb(file)
    if file_size > MAX_IMAGE_SIZE:
        return error_response(f'文件大小超过限制（最大{MAX_IMAGE_SIZE}MB）', 400)
    
    try:
        # 生成唯一文件名
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
        
        # 创建上传目录
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'images')
        os.makedirs(upload_dir, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # 生成访问URL
        file_url = f"/uploads/images/{unique_filename}"
        
        return success_response(
            data={
                'filename': original_filename,
                'url': file_url,
                'size': round(file_size, 2)
            },
            message='图片上传成功',
            code=201
        )
    
    except Exception as e:
        return error_response(f'上传失败: {str(e)}', 500)


@bp.route('/document', methods=['POST'])
@admin_required
def upload_document(current_user):
    """上传文档文件（仅管理员）"""
    if 'file' not in request.files:
        return error_response('没有上传文件', 400)
    
    file = request.files['file']
    
    if file.filename == '':
        return error_response('文件名为空', 400)
    
    if not allowed_file(file.filename, ALLOWED_DOCUMENT_EXTENSIONS):
        return error_response(
            f'不支持的文件格式，仅支持: {", ".join(ALLOWED_DOCUMENT_EXTENSIONS)}',
            400
        )
    
    # 检查文件大小
    file_size = get_file_size_mb(file)
    if file_size > MAX_DOCUMENT_SIZE:
        return error_response(f'文件大小超过限制（最大{MAX_DOCUMENT_SIZE}MB）', 400)
    
    try:
        # 生成唯一文件名
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
        
        # 创建上传目录
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'documents')
        os.makedirs(upload_dir, exist_ok=True)
        
        # 保存文件
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # 生成访问URL
        file_url = f"/uploads/documents/{unique_filename}"
        
        return success_response(
            data={
                'filename': original_filename,
                'url': file_url,
                'size': round(file_size, 2)
            },
            message='文档上传成功',
            code=201
        )
    
    except Exception as e:
        return error_response(f'上传失败: {str(e)}', 500)

