"""
饿了么数据分析API
"""

from flask import Blueprint, request, current_app
from app import db
from app.models import ElemeStoreDailyData, ElemeImportLog, ElemeFieldConfig
from app.services.excel_parser import ExcelParser
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response
from werkzeug.utils import secure_filename
from datetime import datetime, date
from sqlalchemy import func, and_, or_
import os
import uuid

bp = Blueprint('eleme', __name__, url_prefix='/api/eleme')

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/upload', methods=['POST'])
@token_required
def upload_excel(current_user):
    """
    上传Excel文件并解析数据
    """
    # 检查文件是否存在
    if 'file' not in request.files:
        return error_response('没有上传文件', 400)
    
    file = request.files['file']
    if file.filename == '':
        return error_response('文件名为空', 400)
    
    if not allowed_file(file.filename):
        return error_response('不支持的文件格式，仅支持 .xlsx 和 .xls', 400)
    
    try:
        # 生成批次ID
        batch_id = f"ELEME_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # 保存文件
        filename = secure_filename(file.filename)
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, f"{batch_id}_{filename}")
        file.save(file_path)
        
        # 创建导入日志
        import_log = ElemeImportLog(
            batch_id=batch_id,
            file_name=filename,
            imported_by=current_user['user_id'],
            status='processing'
        )
        db.session.add(import_log)
        db.session.commit()
        
        # 解析Excel
        success, data, error_msg = ExcelParser.parse_excel(file_path)
        if not success:
            import_log.status = 'failed'
            import_log.error_message = error_msg
            import_log.completed_at = datetime.now()
            db.session.commit()
            
            # 删除临时文件
            try:
                os.remove(file_path)
            except:
                pass
            
            return error_response(error_msg, 400)
        
        # 检查数据日期是否已存在（去重检查）
        data_dates = set()
        for row_data in data:
            if row_data.get('data_date'):
                data_dates.add(row_data['data_date'])
        
        if data_dates:
            # 查询数据库中是否已存在这些日期的数据
            existing_dates = db.session.query(
                ElemeStoreDailyData.data_date
            ).filter(
                ElemeStoreDailyData.data_date.in_(data_dates)
            ).distinct().all()
            
            if existing_dates:
                existing_dates_list = [d[0].isoformat() for d in existing_dates]
                import_log.status = 'failed'
                import_log.error_message = f'数据已存在，请勿重复上传。已存在的日期: {", ".join(existing_dates_list)}'
                import_log.completed_at = datetime.now()
                db.session.commit()
                
                # 删除临时文件
                try:
                    os.remove(file_path)
                except:
                    pass
                
                return error_response(
                    f'数据已存在，请勿重复上传！\n\n已存在的日期：{", ".join(existing_dates_list)}\n\n如需更新数据，请先删除旧数据，再重新上传。',
                    400
                )
        
        # 批量插入数据
        success_count = 0
        failed_count = 0
        data_date = None
        
        for row_data in data:
            try:
                # 验证数据
                is_valid, error_msg = ExcelParser.validate_data(row_data)
                if not is_valid:
                    failed_count += 1
                    continue
                
                # 记录数据日期
                if row_data.get('data_date'):
                    data_date = row_data['data_date']
                
                # 添加批次ID
                row_data['import_batch_id'] = batch_id
                
                # 创建数据对象
                store_data = ElemeStoreDailyData(**row_data)
                db.session.add(store_data)
                success_count += 1
                
            except Exception as e:
                print(f"插入数据失败: {str(e)}")
                failed_count += 1
                continue
        
        # 提交事务
        try:
            db.session.commit()
            
            # 更新导入日志
            import_log.status = 'completed'
            import_log.data_date = data_date
            import_log.total_rows = len(data)
            import_log.success_rows = success_count
            import_log.failed_rows = failed_count
            import_log.completed_at = datetime.now()
            db.session.commit()
            
            # 删除临时文件
            try:
                os.remove(file_path)
            except:
                pass
            
            return success_response(
                message=f'数据导入成功，成功 {success_count} 条，失败 {failed_count} 条',
                data={
                    'batch_id': batch_id,
                    'total_rows': len(data),
                    'success_rows': success_count,
                    'failed_rows': failed_count,
                    'data_date': data_date.isoformat() if data_date else None
                }
            )
            
        except Exception as e:
            db.session.rollback()
            
            import_log.status = 'failed'
            import_log.error_message = f'数据库提交失败: {str(e)}'
            import_log.completed_at = datetime.now()
            db.session.commit()
            
            return error_response(f'数据库提交失败: {str(e)}', 500)
        
    except Exception as e:
        return error_response(f'文件上传失败: {str(e)}', 500)


@bp.route('/import-logs', methods=['GET'])
@token_required
def get_import_logs(current_user):
    """
    获取导入日志列表
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ElemeImportLog.query.order_by(ElemeImportLog.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response(data={
            'logs': [log.to_dict() for log in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取导入日志失败: {str(e)}', 500)


@bp.route('/data', methods=['GET'])
@token_required
def get_store_data(current_user):
    """
    获取门店数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - city: 城市
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 构建查询
        query = ElemeStoreDailyData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeStoreDailyData.data_date >= start_date_obj)
            except:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeStoreDailyData.data_date <= end_date_obj)
            except:
                pass
        
        # 门店筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeStoreDailyData.store_id == store_id)
        
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeStoreDailyData.store_name.like(f'%{store_name}%'))
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeStoreDailyData.city == city)
        
        # 排序
        query = query.order_by(ElemeStoreDailyData.data_date.desc(), ElemeStoreDailyData.store_name)
        
        # 分页
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response(data={
            'data': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取数据失败: {str(e)}', 500)


@bp.route('/statistics', methods=['GET'])
@token_required
def get_statistics(current_user):
    """
    获取统计数据
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - city: 城市
    """
    try:
        # 构建基础查询
        query = db.session.query(
            func.sum(ElemeStoreDailyData.valid_orders).label('total_orders'),
            func.sum(ElemeStoreDailyData.income).label('total_income'),
            func.avg(ElemeStoreDailyData.avg_payment_per_order).label('avg_order_payment'),
            func.avg(ElemeStoreDailyData.store_score).label('avg_store_score'),
            func.count(func.distinct(ElemeStoreDailyData.store_id)).label('store_count')
        )
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeStoreDailyData.data_date >= start_date_obj)
            except:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeStoreDailyData.data_date <= end_date_obj)
            except:
                pass
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeStoreDailyData.city == city)
        
        result = query.first()
        
        return success_response(data={
            'total_orders': int(result.total_orders) if result.total_orders else 0,
            'total_income': float(result.total_income) if result.total_income else 0,
            'avg_order_payment': float(result.avg_order_payment) if result.avg_order_payment else 0,
            'avg_store_score': float(result.avg_store_score) if result.avg_store_score else 0,
            'store_count': result.store_count if result.store_count else 0
        })
        
    except Exception as e:
        return error_response(f'获取统计数据失败: {str(e)}', 500)


@bp.route('/cities', methods=['GET'])
@token_required
def get_cities(current_user):
    """
    获取城市列表
    """
    try:
        cities = db.session.query(
            ElemeStoreDailyData.city
        ).filter(
            ElemeStoreDailyData.city.isnot(None)
        ).distinct().order_by(ElemeStoreDailyData.city).all()
        
        city_list = [city[0] for city in cities if city[0]]
        
        return success_response(data={'cities': city_list})
        
    except Exception as e:
        return error_response(f'获取城市列表失败: {str(e)}', 500)


@bp.route('/stores', methods=['GET'])
@token_required
def get_stores(current_user):
    """
    获取门店列表
    
    Query参数:
    - city: 城市筛选
    """
    try:
        query = db.session.query(
            ElemeStoreDailyData.store_id,
            ElemeStoreDailyData.store_name,
            ElemeStoreDailyData.city
        ).filter(
            ElemeStoreDailyData.store_id.isnot(None)
        )
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeStoreDailyData.city == city)
        
        stores = query.distinct().order_by(ElemeStoreDailyData.store_name).all()
        
        store_list = [
            {
                'store_id': store[0],
                'store_name': store[1],
                'city': store[2]
            }
            for store in stores
        ]
        
        return success_response(data={'stores': store_list})
        
    except Exception as e:
        return error_response(f'获取门店列表失败: {str(e)}', 500)


# =========================== 字段配置管理 API ===========================

@bp.route('/fields', methods=['GET'])
@token_required
def get_field_configs(current_user):
    """
    获取字段配置列表
    
    Query参数:
    - category: 字段分类
    """
    try:
        query = ElemeFieldConfig.query
        
        # 分类筛选
        category = request.args.get('category')
        if category:
            query = query.filter(ElemeFieldConfig.field_category == category)
        
        # 排序
        query = query.order_by(ElemeFieldConfig.sort_order, ElemeFieldConfig.id)
        
        fields = query.all()
        
        return success_response(data={
            'fields': [field.to_dict() for field in fields]
        })
        
    except Exception as e:
        return error_response(f'获取字段配置失败: {str(e)}', 500)


@bp.route('/fields', methods=['POST'])
@admin_required
def create_field_config(current_user):
    """
    创建字段配置（仅管理员）
    """
    try:
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('field_name') or not data.get('display_name'):
            return error_response('字段名称和显示名称不能为空', 400)
        
        # 检查字段是否已存在
        existing = ElemeFieldConfig.query.filter_by(
            field_name=data['field_name']
        ).first()
        if existing:
            return error_response('字段已存在', 400)
        
        # 创建字段配置
        field_config = ElemeFieldConfig(
            field_name=data['field_name'],
            display_name=data['display_name'],
            field_type=data.get('field_type', 'VARCHAR'),
            field_category=data.get('field_category'),
            is_active=data.get('is_active', True),
            sort_order=data.get('sort_order', 0),
            description=data.get('description')
        )
        
        db.session.add(field_config)
        db.session.commit()
        
        return success_response(
            message='字段配置创建成功',
            data=field_config.to_dict()
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建字段配置失败: {str(e)}', 500)


@bp.route('/fields/<int:field_id>', methods=['PUT'])
@admin_required
def update_field_config(current_user, field_id):
    """
    更新字段配置（仅管理员）
    """
    try:
        field_config = ElemeFieldConfig.query.get(field_id)
        if not field_config:
            return error_response('字段配置不存在', 404)
        
        data = request.get_json()
        
        # 更新字段
        if 'display_name' in data:
            field_config.display_name = data['display_name']
        if 'field_type' in data:
            field_config.field_type = data['field_type']
        if 'field_category' in data:
            field_config.field_category = data['field_category']
        if 'is_active' in data:
            field_config.is_active = data['is_active']
        if 'sort_order' in data:
            field_config.sort_order = data['sort_order']
        if 'description' in data:
            field_config.description = data['description']
        
        db.session.commit()
        
        return success_response(
            message='字段配置更新成功',
            data=field_config.to_dict()
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新字段配置失败: {str(e)}', 500)


@bp.route('/fields/<int:field_id>', methods=['DELETE'])
@admin_required
def delete_field_config(current_user, field_id):
    """
    删除字段配置（仅管理员）
    """
    try:
        field_config = ElemeFieldConfig.query.get(field_id)
        if not field_config:
            return error_response('字段配置不存在', 404)
        
        db.session.delete(field_config)
        db.session.commit()
        
        return success_response(message='字段配置删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除字段配置失败: {str(e)}', 500)


# =========================== 数据管理 API ===========================

@bp.route('/data/dates', methods=['GET'])
@token_required
def get_data_dates(current_user):
    """
    获取所有已上传的数据日期列表
    """
    try:
        dates = db.session.query(
            ElemeStoreDailyData.data_date
        ).distinct().order_by(ElemeStoreDailyData.data_date.desc()).all()
        
        date_list = [d[0].isoformat() for d in dates if d[0]]
        
        return success_response(data={'dates': date_list})
        
    except Exception as e:
        return error_response(f'获取日期列表失败: {str(e)}', 500)


@bp.route('/data/date/<date_str>', methods=['DELETE'])
@token_required
def delete_data_by_date(current_user, date_str):
    """
    删除指定日期的所有数据（管理员和外卖运营可操作）
    
    Args:
        date_str: 日期字符串，格式：YYYY-MM-DD
    """
    try:
        # 解析日期
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            return error_response('日期格式错误，请使用 YYYY-MM-DD 格式', 400)
        
        # 查询该日期的数据
        count = ElemeStoreDailyData.query.filter_by(data_date=target_date).count()
        
        if count == 0:
            return error_response(f'未找到日期 {date_str} 的数据', 404)
        
        # 删除数据
        ElemeStoreDailyData.query.filter_by(data_date=target_date).delete()
        db.session.commit()
        
        return success_response(
            message=f'成功删除日期 {date_str} 的数据',
            data={'deleted_count': count, 'date': date_str}
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除数据失败: {str(e)}', 500)


@bp.route('/data/batch/<batch_id>', methods=['DELETE'])
@token_required
def delete_data_by_batch(current_user, batch_id):
    """
    删除指定批次的所有数据（管理员和外卖运营可操作）
    
    Args:
        batch_id: 导入批次ID
    """
    try:
        # 查询导入日志
        import_log = ElemeImportLog.query.filter_by(batch_id=batch_id).first()
        if not import_log:
            return error_response(f'未找到批次 {batch_id}', 404)
        
        # 检查是否已经删除
        if import_log.is_deleted:
            return error_response(f'批次 {batch_id} 的数据已被删除', 400)
        
        # 查询该批次的数据
        count = ElemeStoreDailyData.query.filter_by(import_batch_id=batch_id).count()
        
        if count == 0:
            return error_response(f'未找到批次 {batch_id} 的数据', 404)
        
        # 删除数据
        ElemeStoreDailyData.query.filter_by(import_batch_id=batch_id).delete()
        
        # 更新导入日志状态（标记为已删除，但不删除日志记录）
        import_log.is_deleted = True
        import_log.deleted_at = datetime.now()
        
        db.session.commit()
        
        return success_response(
            message=f'成功删除批次 {batch_id} 的数据',
            data={'deleted_count': count, 'batch_id': batch_id}
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除数据失败: {str(e)}', 500)

