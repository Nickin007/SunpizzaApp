"""
饿了么数据分析API
"""

from flask import Blueprint, request, current_app
from app import db
from app.models import ElemeStoreDailyData, ElemeOrderData, ElemeOrderElemeData, ElemeProductData, ElemeReviewData, ElemeGrowthData, ElemeFansData, ElemeImportLog, ElemeFieldConfig, ElemeActiveStore
from app.services.excel_parser import ExcelParser
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response
from werkzeug.utils import secure_filename
from datetime import datetime, date, time
from sqlalchemy import func, and_, or_
import os
import uuid

bp = Blueprint('eleme', __name__, url_prefix='/api/eleme')

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

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
        return error_response('不支持的文件格式，仅支持 .xlsx、.xls 和 .csv', 400)
    
    # 获取数据类型
    data_type = request.form.get('data_type', 'store')
    print(f"📊 接收到的数据类型: {data_type}")  # 调试日志
    print(f"📋 表单数据: {dict(request.form)}")  # 查看所有表单数据
    
    if data_type not in ['store', 'order_shiheng', 'order_eleme', 'product', 'review', 'growth', 'fans']:
        return error_response('无效的数据类型', 400)
    
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
            data_type=data_type,
            imported_by=current_user['user_id'],
            status='processing'
        )
        db.session.add(import_log)
        db.session.commit()
        
        # 解析Excel（传入数据类型）
        success, data, error_msg = ExcelParser.parse_excel(file_path, data_type)
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
        
        # 去重检查（根据数据类型）
        if data_type == 'store':
            # 门店数据：按日期去重
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
        elif data_type == 'order_shiheng':
            # 订单数据（食亨）：按订单号去重（检查当前Excel中是否有已存在的订单号）
            order_ids = set()
            for row_data in data:
                if row_data.get('order_id'):
                    order_ids.add(row_data['order_id'])
            
            if order_ids:
                # 查询数据库中是否已存在这些订单号
                existing_orders = db.session.query(
                    ElemeOrderData.order_id
                ).filter(
                    ElemeOrderData.order_id.in_(order_ids)
                ).all()
                
                if existing_orders:
                    existing_order_ids = [o[0] for o in existing_orders]
                    # 订单数据允许部分重复，自动跳过已存在的订单
                    print(f"检测到 {len(existing_order_ids)} 个重复订单（食亨），将自动跳过")
                    # 不返回错误，继续处理，在插入时会自动跳过重复订单
        elif data_type == 'order_eleme':
            # 订单数据（饿了么）：按订单号去重
            order_ids = set()
            for row_data in data:
                if row_data.get('order_id'):
                    order_ids.add(row_data['order_id'])
            
            if order_ids:
                # 查询数据库中是否已存在这些订单号
                existing_orders = db.session.query(
                    ElemeOrderElemeData.order_id
                ).filter(
                    ElemeOrderElemeData.order_id.in_(order_ids)
                ).all()
                
                if existing_orders:
                    existing_order_ids = [o[0] for o in existing_orders]
                    # 订单数据允许部分重复，自动跳过已存在的订单
                    print(f"检测到 {len(existing_order_ids)} 个重复订单（饿了么），将自动跳过")
                    # 不返回错误，继续处理，在插入时会自动跳过重复订单
        
        # 批量插入数据（根据数据类型）
        success_count = 0
        failed_count = 0
        skipped_count = 0  # 跳过的重复数据
        data_date = None
        
        for row_data in data:
            try:
                # 验证数据（传入数据类型）
                is_valid, error_msg = ExcelParser.validate_data(row_data, data_type)
                if not is_valid:
                    failed_count += 1
                    continue
                
                # 添加批次ID
                row_data['import_batch_id'] = batch_id
                
                # 根据数据类型创建不同的数据对象
                if data_type == 'store':
                    # 门店数据
                    if row_data.get('data_date'):
                        data_date = row_data['data_date']
                    data_obj = ElemeStoreDailyData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                    
                elif data_type == 'order_shiheng':
                    # 订单数据（食亨）：需要检查订单号是否已存在
                    order_id = row_data.get('order_id')
                    if order_id:
                        # 检查订单是否已存在
                        existing = ElemeOrderData.query.filter_by(order_id=order_id).first()
                        if existing:
                            skipped_count += 1
                            continue  # 跳过重复订单
                    
                    # 记录第一个订单的下单时间作为data_date（用于导入历史显示）
                    if not data_date and row_data.get('order_time'):
                        order_time = row_data['order_time']
                        if isinstance(order_time, datetime):
                            data_date = order_time.date()
                        elif isinstance(order_time, date):
                            data_date = order_time
                        elif isinstance(order_time, str):
                            # 如果是字符串，尝试解析
                            try:
                                parsed_time = datetime.strptime(order_time, '%Y-%m-%d %H:%M:%S')
                                data_date = parsed_time.date()
                            except:
                                try:
                                    parsed_time = datetime.strptime(order_time, '%Y/%m/%d %H:%M')
                                    data_date = parsed_time.date()
                                except:
                                    pass
                    
                    data_obj = ElemeOrderData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                
                elif data_type == 'order_eleme':
                    # 订单数据（饿了么）：需要检查订单号是否已存在
                    order_id = row_data.get('order_id')
                    if order_id:
                        # 检查订单是否已存在
                        existing = ElemeOrderElemeData.query.filter_by(order_id=order_id).first()
                        if existing:
                            skipped_count += 1
                            continue  # 跳过重复订单
                    
                    # 记录第一个订单的日期作为data_date（用于导入历史显示）
                    if not data_date and row_data.get('data_date'):
                        data_date = row_data['data_date']
                    
                    data_obj = ElemeOrderElemeData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                
                elif data_type == 'product':
                    # 商品数据：允许重复数据（同一商品可能有多次上架记录）
                    data_date_val = row_data.get('data_date')
                    
                    # 记录data_date用于导入历史显示
                    if not data_date and data_date_val:
                        data_date = data_date_val
                    
                    data_obj = ElemeProductData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                
                elif data_type == 'review':
                    # 评价数据：允许重复数据（同一评价可能多次导出）
                    data_date_val = row_data.get('data_date')
                    
                    # 记录data_date用于导入历史显示
                    if not data_date and data_date_val:
                        data_date = data_date_val
                    
                    data_obj = ElemeReviewData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                
                elif data_type == 'growth':
                    # 商家成长数据：允许重复数据（同一门店同一日期可能有多次数据更新）
                    data_date_val = row_data.get('data_date')
                    
                    # 记录data_date用于导入历史显示
                    if not data_date and data_date_val:
                        data_date = data_date_val
                    
                    data_obj = ElemeGrowthData(**row_data)
                    db.session.add(data_obj)
                    success_count += 1
                
                elif data_type == 'fans':
                    # 粉丝群数据：允许重复数据（同一门店同一日期可能有多次数据更新）
                    data_date_val = row_data.get('data_date')
                    
                    # 记录data_date用于导入历史显示
                    if not data_date and data_date_val:
                        data_date = data_date_val
                    
                    data_obj = ElemeFansData(**row_data)
                    db.session.add(data_obj)
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
            
            # 构建返回消息
            message = f'数据导入成功，成功 {success_count} 条，失败 {failed_count} 条'
            if skipped_count > 0:
                message += f'，跳过重复 {skipped_count} 条'
            
            return success_response(
                message=message,
                data={
                    'batch_id': batch_id,
                    'total_rows': len(data),
                    'success_rows': success_count,
                    'failed_rows': failed_count,
                    'skipped_rows': skipped_count,
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
    获取导入日志列表（不包含已删除的记录）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 只查询未删除的记录
        query = ElemeImportLog.query.filter_by(is_deleted=False).order_by(ElemeImportLog.created_at.desc())
        
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


@bp.route('/order-data', methods=['GET'])
@token_required
def get_order_data(current_user):
    """
    获取订单数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - order_status: 订单状态
    - order_id: 订单号
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeOrderData.query
        
        # 日期筛选（根据下单时间）
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(ElemeOrderData.order_time >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                # 包含结束日期的整天
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
                query = query.filter(ElemeOrderData.order_time <= end_dt)
            except ValueError:
                pass
        
        # 门店ID筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeOrderData.store_id == store_id)
        
        # 门店名称筛选（模糊搜索）
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeOrderData.store_name.like(f'%{store_name}%'))
        
        # 订单状态筛选
        order_status = request.args.get('order_status')
        if order_status:
            query = query.filter(ElemeOrderData.order_status == order_status)
        
        # 订单号筛选
        order_id = request.args.get('order_id')
        if order_id:
            query = query.filter(ElemeOrderData.order_id.like(f'%{order_id}%'))
        
        # 排序（最新订单在前）
        query = query.order_by(ElemeOrderData.order_time.desc())
        
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
        return error_response(f'获取订单数据失败: {str(e)}', 500)


@bp.route('/order-eleme-data', methods=['GET'])
@token_required
def get_order_eleme_data(current_user):
    """
    获取饿了么订单数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - order_id: 订单号
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeOrderElemeData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeOrderElemeData.data_date >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeOrderElemeData.data_date <= end_dt)
            except ValueError:
                pass
        
        # 订单号筛选
        order_id = request.args.get('order_id')
        if order_id:
            query = query.filter(ElemeOrderElemeData.order_id.like(f'%{order_id}%'))
        
        # 排序（最新订单在前）
        query = query.order_by(ElemeOrderElemeData.data_date.desc())
        
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
        return error_response(f'获取饿了么订单数据失败: {str(e)}', 500)


@bp.route('/product-data', methods=['GET'])
@token_required
def get_product_data(current_user):
    """
    获取商品数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - city: 城市名称
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - product_name: 商品名称（模糊搜索）
    - is_new_product: 是否新品（是/否）
    - is_signature: 是否招牌（是/否）
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeProductData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductData.data_date >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductData.data_date <= end_dt)
            except ValueError:
                pass
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeProductData.city == city)
        
        # 门店ID筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeProductData.store_id == store_id)
        
        # 门店名称筛选（模糊搜索）
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeProductData.store_name.like(f'%{store_name}%'))
        
        # 商品名称筛选（模糊搜索）
        product_name = request.args.get('product_name')
        if product_name:
            query = query.filter(ElemeProductData.product_name.like(f'%{product_name}%'))
        
        # 是否新品筛选
        is_new_product = request.args.get('is_new_product')
        if is_new_product:
            query = query.filter(ElemeProductData.is_new_product == is_new_product)
        
        # 是否招牌筛选
        is_signature = request.args.get('is_signature')
        if is_signature:
            query = query.filter(ElemeProductData.is_signature == is_signature)
        
        # 排序（最新日期在前，销售额降序）
        query = query.order_by(
            ElemeProductData.data_date.desc(),
            ElemeProductData.sales_amount.desc()
        )
        
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
        return error_response(f'获取商品数据失败: {str(e)}', 500)


@bp.route('/review-data', methods=['GET'])
@token_required
def get_review_data(current_user):
    """
    获取评价数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - city: 城市名称
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - order_id: 订单ID
    - min_score: 最低评分（1-5）
    - max_score: 最高评分（1-5）
    - is_counted_in_score: 是否计入总分（是/否）
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeReviewData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeReviewData.data_date >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeReviewData.data_date <= end_dt)
            except ValueError:
                pass
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeReviewData.city == city)
        
        # 门店ID筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeReviewData.store_id == store_id)
        
        # 门店名称筛选（模糊搜索）
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeReviewData.store_name.like(f'%{store_name}%'))
        
        # 订单ID筛选
        order_id = request.args.get('order_id')
        if order_id:
            query = query.filter(ElemeReviewData.order_id == order_id)
        
        # 评分筛选
        min_score = request.args.get('min_score', type=float)
        if min_score is not None:
            query = query.filter(ElemeReviewData.overall_score >= min_score)
        
        max_score = request.args.get('max_score', type=float)
        if max_score is not None:
            query = query.filter(ElemeReviewData.overall_score <= max_score)
        
        # 是否计入总分筛选
        is_counted_in_score = request.args.get('is_counted_in_score')
        if is_counted_in_score:
            query = query.filter(ElemeReviewData.is_counted_in_score == is_counted_in_score)
        
        # 排序（最新评价在前，评分降序）
        query = query.order_by(
            ElemeReviewData.review_time.desc(),
            ElemeReviewData.overall_score.desc()
        )
        
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
        return error_response(f'获取评价数据失败: {str(e)}', 500)


@bp.route('/growth-data', methods=['GET'])
@token_required
def get_growth_data(current_user):
    """
    获取商家成长数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - city: 城市名称
    - province: 省份
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - min_score: 最低店铺分
    - max_score: 最高店铺分
    - l_level: L等级分布
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeGrowthData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeGrowthData.data_date >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeGrowthData.data_date <= end_dt)
            except ValueError:
                pass
        
        # 省份筛选
        province = request.args.get('province')
        if province:
            query = query.filter(ElemeGrowthData.province == province)
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeGrowthData.city == city)
        
        # 门店ID筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeGrowthData.store_id == store_id)
        
        # 门店名称筛选（模糊搜索）
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeGrowthData.store_name.like(f'%{store_name}%'))
        
        # L等级筛选
        l_level = request.args.get('l_level')
        if l_level:
            query = query.filter(ElemeGrowthData.l_level == l_level)
        
        # 店铺分筛选
        min_score = request.args.get('min_score', type=float)
        if min_score is not None:
            query = query.filter(ElemeGrowthData.store_score >= min_score)
        
        max_score = request.args.get('max_score', type=float)
        if max_score is not None:
            query = query.filter(ElemeGrowthData.store_score <= max_score)
        
        # 排序（最新日期在前，店铺分降序）
        query = query.order_by(
            ElemeGrowthData.data_date.desc(),
            ElemeGrowthData.store_score.desc()
        )
        
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
        return error_response(f'获取商家成长数据失败: {str(e)}', 500)


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
    
    智能删除逻辑：
    - 如果有数据：删除数据 + 标记日志为已删除
    - 如果无数据：只标记日志为已删除 + 提示无数据
    
    支持不同数据类型（门店/订单）
    
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
        
        # 根据数据类型查询相应表的数据
        data_type = import_log.data_type
        if data_type == 'order_shiheng':
            count = ElemeOrderData.query.filter_by(import_batch_id=batch_id).count()
        elif data_type == 'order_eleme':
            count = ElemeOrderElemeData.query.filter_by(import_batch_id=batch_id).count()
        elif data_type == 'product':
            count = ElemeProductData.query.filter_by(import_batch_id=batch_id).count()
        elif data_type == 'review':
            count = ElemeReviewData.query.filter_by(import_batch_id=batch_id).count()
        elif data_type == 'growth':
            count = ElemeGrowthData.query.filter_by(import_batch_id=batch_id).count()
        elif data_type == 'fans':
            count = ElemeFansData.query.filter_by(import_batch_id=batch_id).count()
        else:  # 'store' 或其他，默认门店数据
            count = ElemeStoreDailyData.query.filter_by(import_batch_id=batch_id).count()
        
        # 智能删除逻辑
        if count == 0:
            # 无数据：只删除记录，并提示用户
            import_log.is_deleted = True
            import_log.deleted_at = datetime.now()
            db.session.commit()
            
            return success_response(
                message=f'该批次无数据，已删除导入记录',
                data={
                    'deleted_count': 0, 
                    'batch_id': batch_id,
                    'has_data': False  # 标记：无数据
                }
            )
        else:
            # 有数据：根据数据类型删除相应表的数据
            if data_type == 'order_shiheng':
                ElemeOrderData.query.filter_by(import_batch_id=batch_id).delete()
            elif data_type == 'order_eleme':
                ElemeOrderElemeData.query.filter_by(import_batch_id=batch_id).delete()
            elif data_type == 'product':
                ElemeProductData.query.filter_by(import_batch_id=batch_id).delete()
            elif data_type == 'review':
                ElemeReviewData.query.filter_by(import_batch_id=batch_id).delete()
            elif data_type == 'growth':
                ElemeGrowthData.query.filter_by(import_batch_id=batch_id).delete()
            elif data_type == 'fans':
                ElemeFansData.query.filter_by(import_batch_id=batch_id).delete()
            else:  # 'store' 或其他
                ElemeStoreDailyData.query.filter_by(import_batch_id=batch_id).delete()
            
            import_log.is_deleted = True
            import_log.deleted_at = datetime.now()
            db.session.commit()
            
            return success_response(
                message=f'成功删除批次 {batch_id} 的 {count} 条数据',
                data={
                    'deleted_count': count, 
                    'batch_id': batch_id,
                    'has_data': True  # 标记：有数据
                }
            )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除数据失败: {str(e)}', 500)


@bp.route('/fans-data', methods=['GET'])
@token_required
def get_fans_data(current_user):
    """
    获取粉丝群数据（支持筛选）
    
    Query参数:
    - start_date: 开始日期
    - end_date: 结束日期
    - city: 城市名称
    - store_id: 门店ID
    - store_name: 门店名称（模糊搜索）
    - page: 页码
    - per_page: 每页数量
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # 构建查询
        query = ElemeFansData.query
        
        # 日期筛选
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeFansData.data_date >= start_dt)
            except ValueError:
                pass
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeFansData.data_date <= end_dt)
            except ValueError:
                pass
        
        # 城市筛选
        city = request.args.get('city')
        if city:
            query = query.filter(ElemeFansData.city == city)
        
        # 门店ID筛选
        store_id = request.args.get('store_id')
        if store_id:
            query = query.filter(ElemeFansData.store_id == store_id)
        
        # 门店名称筛选（模糊搜索）
        store_name = request.args.get('store_name')
        if store_name:
            query = query.filter(ElemeFansData.store_name.like(f'%{store_name}%'))
        
        # 排序（最新日期在前）
        query = query.order_by(ElemeFansData.data_date.desc())
        
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
        return error_response(f'获取粉丝群数据失败: {str(e)}', 500)


@bp.route('/active-stores', methods=['GET'])
@token_required
def get_active_stores(current_user):
    """
    获取在营门店列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认50）
    - is_active: 是否在营（true/false）
    - search: 门店名称搜索
    """
    try:
        from app.models import ElemeActiveStore
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        is_active = request.args.get('is_active', None, type=str)
        search = request.args.get('search', '', type=str)
        
        # 构建查询
        query = ElemeActiveStore.query
        
        # 过滤条件
        if is_active is not None:
            query = query.filter(ElemeActiveStore.is_active == (is_active.lower() == 'true'))
        
        if search:
            query = query.filter(ElemeActiveStore.store_name.like(f'%{search}%'))
        
        # 排序
        query = query.order_by(ElemeActiveStore.is_active.desc(), ElemeActiveStore.store_name.asc())
        
        # 分页
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return success_response({
            'stores': [store.to_dict() for store in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取在营门店列表失败: {str(e)}', 500)


@bp.route('/active-stores', methods=['POST'])
@token_required
def create_active_store(current_user):
    """
    创建新的在营门店
    
    Body参数:
    - store_name: 门店名称（饿了么）（必填）
    - store_name_shiheng: 门店名称（食亨）（可选）
    - is_active: 是否在营（可选，默认true）
    """
    try:
        from app.models import ElemeActiveStore
        
        data = request.get_json()
        store_name = data.get('store_name', '').strip()
        store_name_shiheng = data.get('store_name_shiheng', '').strip() or None
        is_active = data.get('is_active', True)
        
        if not store_name:
            return error_response('门店名称不能为空', 400)
        
        # 检查是否已存在
        existing = ElemeActiveStore.query.filter_by(store_name=store_name).first()
        if existing:
            return error_response('该门店已存在', 400)
        
        # 创建新门店
        new_store = ElemeActiveStore(
            store_name=store_name,
            store_name_shiheng=store_name_shiheng,
            is_active=is_active
        )
        
        db.session.add(new_store)
        db.session.commit()
        
        return success_response({
            'store': new_store.to_dict(),
            'message': '门店创建成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建门店失败: {str(e)}', 500)


@bp.route('/active-stores/<int:store_id>', methods=['PUT'])
@token_required
def update_active_store(current_user, store_id):
    """
    更新在营门店信息
    
    Path参数:
    - store_id: 门店ID
    
    Body参数:
    - store_name: 门店名称（饿了么）（可选）
    - store_name_shiheng: 门店名称（食亨）（可选）
    - is_active: 是否在营（可选）
    """
    try:
        from app.models import ElemeActiveStore
        
        store = ElemeActiveStore.query.get(store_id)
        if not store:
            return error_response('门店不存在', 404)
        
        data = request.get_json()
        
        # 更新门店名称（饿了么）
        if 'store_name' in data:
            new_name = data['store_name'].strip()
            if not new_name:
                return error_response('门店名称不能为空', 400)
            
            # 检查新名称是否已被其他门店使用
            existing = ElemeActiveStore.query.filter(
                ElemeActiveStore.store_name == new_name,
                ElemeActiveStore.id != store_id
            ).first()
            if existing:
                return error_response('该门店名称已被使用', 400)
            
            store.store_name = new_name
        
        # 更新门店名称（食亨）
        if 'store_name_shiheng' in data:
            shiheng_name = data['store_name_shiheng']
            if shiheng_name:
                store.store_name_shiheng = shiheng_name.strip()
            else:
                store.store_name_shiheng = None
        
        # 更新在营状态
        if 'is_active' in data:
            store.is_active = data['is_active']
        
        db.session.commit()
        
        return success_response({
            'store': store.to_dict(),
            'message': '门店更新成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新门店失败: {str(e)}', 500)


@bp.route('/active-stores/<int:store_id>', methods=['DELETE'])
@token_required
def delete_active_store(current_user, store_id):
    """
    删除在营门店
    
    Path参数:
    - store_id: 门店ID
    """
    try:
        from app.models import ElemeActiveStore
        
        store = ElemeActiveStore.query.get(store_id)
        if not store:
            return error_response('门店不存在', 404)
        
        store_name = store.store_name
        db.session.delete(store)
        db.session.commit()
        
        return success_response({
            'message': f'门店 "{store_name}" 删除成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除门店失败: {str(e)}', 500)


@bp.route('/active-stores/batch', methods=['POST'])
@token_required
def batch_create_active_stores(current_user):
    """
    批量创建在营门店
    
    Body参数:
    - stores: 门店名称列表（数组）
    """
    try:
        from app.models import ElemeActiveStore
        
        data = request.get_json()
        store_names = data.get('stores', [])
        
        if not store_names or not isinstance(store_names, list):
            return error_response('请提供门店名称列表', 400)
        
        created_count = 0
        skipped_count = 0
        errors = []
        
        for store_name in store_names:
            store_name = store_name.strip()
            if not store_name:
                continue
            
            # 检查是否已存在
            existing = ElemeActiveStore.query.filter_by(store_name=store_name).first()
            if existing:
                skipped_count += 1
                continue
            
            try:
                new_store = ElemeActiveStore(
                    store_name=store_name,
                    is_active=True
                )
                db.session.add(new_store)
                created_count += 1
            except Exception as e:
                errors.append(f'{store_name}: {str(e)}')
        
        db.session.commit()
        
        return success_response({
            'created_count': created_count,
            'skipped_count': skipped_count,
            'errors': errors,
            'message': f'批量创建完成：成功 {created_count} 个，跳过 {skipped_count} 个'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量创建失败: {str(e)}', 500)


@bp.route('/data-upload-status', methods=['GET'])
@token_required
def get_data_upload_status(current_user):
    """
    检查数据上传状态
    返回7种数据类型的上传状态
    参数：
        date (str, optional): 查询日期 YYYY-MM-DD，默认为昨天
    """
    try:
        from datetime import datetime, timedelta
        
        # 获取日期参数，如果没有则使用昨天
        date_str = request.args.get('date')
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            target_date = (datetime.now() - timedelta(days=1)).date()
        
        # 定义7种数据类型
        data_types = [
            'store',
            'order_shiheng',
            'order_eleme',
            'product',
            'review',
            'growth',
            'fans'
        ]
        
        # 检查每种数据类型的上传状态
        upload_status = {}
        for data_type in data_types:
            # 查询是否有指定日期的数据被成功导入（不管什么时候导入的，但要排除已删除的）
            log = ElemeImportLog.query.filter(
                ElemeImportLog.data_type == data_type,
                ElemeImportLog.data_date == target_date,  # 检查数据日期
                ElemeImportLog.status == 'completed',
                ElemeImportLog.success_rows > 0,
                ElemeImportLog.is_deleted == False  # 排除已删除的记录
            ).order_by(ElemeImportLog.created_at.desc()).first()  # 取最新的一条
            
            upload_status[data_type] = {
                'uploaded': log is not None,
                'import_time': log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log else None
            }
        
        # 判断是否全部上传完成
        all_uploaded = all(status['uploaded'] for status in upload_status.values())
        
        return success_response({
            'date': target_date.strftime('%Y-%m-%d'),
            'all_uploaded': all_uploaded,
            'upload_status': upload_status
        })
        
    except Exception as e:
        current_app.logger.error(f'检查数据上传状态失败: {str(e)}')
        return error_response(f'检查数据上传状态失败: {str(e)}', 500)


@bp.route('/anomaly-monitor', methods=['GET'])
@token_required
def get_anomaly_monitor(current_user):
    """
    获取门店异常监控数据
    返回12种异常类型及其对应的异常数量
    参数：
        date (str, optional): 查询日期 YYYY-MM-DD，默认为昨天
    
    注意：所有异常统计都会自动过滤，只包含"在营门店列表"中is_active=True的门店
    """
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # 获取日期参数，如果没有则使用昨天
        date_str = request.args.get('date')
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            previous_date = (datetime.strptime(date_str, '%Y-%m-%d') - timedelta(days=1)).date()
        else:
            target_date = (datetime.now() - timedelta(days=1)).date()
            previous_date = (datetime.now() - timedelta(days=2)).date()
        
        # 获取在营门店列表（只包含is_active=True的门店）
        active_stores = ElemeActiveStore.query.filter_by(is_active=True).all()
        
        # 分别创建饿了么和食亨的门店名称列表
        active_store_names_eleme = [store.store_name for store in active_stores]
        active_store_names_shiheng = [store.store_name_shiheng for store in active_stores 
                                      if store.store_name_shiheng]  # 只包含设置了食亨名称的门店
        
        # 如果没有在营门店，返回空数据
        if not active_store_names_eleme:
            return success_response({
                'date': target_date.strftime('%Y-%m-%d'),
                'anomalies': [],
                'filtered_by_active_stores': True,
                'active_store_count': 0
            })
        
        result = []
        
        # ========== 前8个异常：来自门店数据表 ==========
        # 定义异常检测规则
        store_anomaly_checks = {
            'store_closed': {
                'name': '闭店异常',
                'field': 'abnormal_close_hours',
                'condition': lambda x: x != '0' and x is not None and x != '',
                'color': '#ff4d4f',
                'isUrgent': False
            },
            'out_of_stock': {
                'name': '库存不足',
                'field': 'out_of_stock_products',
                'condition': lambda x: x is not None and x > 0,
                'color': '#faad14',
                'isUrgent': True
            },
            'overtime_orders': {
                'name': '出餐超时',
                'field': 'overtime_orders',
                'condition': lambda x: x is not None and x > 0,
                'color': '#ff7a45',
                'isUrgent': True
            },
            'reject_orders': {
                'name': '门店拒单',
                'field': 'reject_orders',
                'condition': lambda x: x is not None and x > 0,
                'color': '#f5222d',
                'isUrgent': False
            },
            'merchant_cancel': {
                'name': '商责取消',
                'field': 'merchant_cancel_orders',
                'condition': lambda x: x is not None and x > 0,
                'color': '#fa541c',
                'isUrgent': False
            },
            'merchant_refund': {
                'name': '商责退单',
                'field': 'merchant_refund_orders',
                'condition': lambda x: x is not None and x > 0,
                'color': '#fa8c16',
                'isUrgent': False
            },
            'low_score': {
                'name': '评分过低',
                'field': 'store_score',
                'condition': lambda x: x is not None and float(x) < 4.9,
                'color': '#722ed1',
                'isUrgent': True
            },
            'bad_reply': {
                'name': '差评未回',
                'field': 'bad_reply_rate_60d',
                'condition': lambda x: x is not None and float(x) != 1.0,
                'color': '#eb2f96',
                'isUrgent': False
            }
        }
        
        for key, config in store_anomaly_checks.items():
            # 获取目标日期的异常门店数量（只统计在营门店）
            target_data = ElemeStoreDailyData.query.filter(
                ElemeStoreDailyData.data_date == target_date,
                ElemeStoreDailyData.store_name.in_(active_store_names_eleme)
            ).all()
            
            target_count = 0
            for record in target_data:
                field_value = getattr(record, config['field'], None)
                if config['condition'](field_value):
                    target_count += 1
            
            # 获取前一天的异常门店数量（只统计在营门店）
            previous_data = ElemeStoreDailyData.query.filter(
                ElemeStoreDailyData.data_date == previous_date,
                ElemeStoreDailyData.store_name.in_(active_store_names_eleme)
            ).all()
            
            previous_count = 0
            for record in previous_data:
                field_value = getattr(record, config['field'], None)
                if config['condition'](field_value):
                    previous_count += 1
            
            # 计算变化
            change = target_count - previous_count
            
            result.append({
                'key': key,
                'type': config['name'],
                'count': target_count,
                'change': change,
                'color': config['color'],
                'isUrgent': target_count > 0 and config['isUrgent'],
                'unit': '家'
            })
        
        # ========== 第9个异常：申请退款（来自订单数据食亨，只统计在营门店） ==========
        # 统计目标日期的退款订单数（使用食亨门店名称）
        target_refund_count = 0
        if active_store_names_shiheng:  # 只有在有食亨门店名称时才查询
            target_refund_count = ElemeOrderData.query.filter(
                func.date(ElemeOrderData.order_time) == target_date,
                ElemeOrderData.store_name.in_(active_store_names_shiheng),
                ElemeOrderData.refund_reason.isnot(None),
                ElemeOrderData.refund_reason != ''
            ).count()
        
        # 统计前一天的退款订单数（使用食亨门店名称）
        previous_refund_count = 0
        if active_store_names_shiheng:  # 只有在有食亨门店名称时才查询
            previous_refund_count = ElemeOrderData.query.filter(
                func.date(ElemeOrderData.order_time) == previous_date,
                ElemeOrderData.store_name.in_(active_store_names_shiheng),
                ElemeOrderData.refund_reason.isnot(None),
                ElemeOrderData.refund_reason != ''
            ).count()
        
        result.append({
            'key': 'refund_orders',
            'type': '申请退款',
            'count': target_refund_count,
            'change': target_refund_count - previous_refund_count,
            'color': '#ff4d4f',
            'isUrgent': target_refund_count > 5,
            'unit': '单'
        })
        
        # ========== 第10个异常：顾客差评（来自评价数据，只统计在营门店） ==========
        # 统计目标日期的差评数（使用饿了么门店名称）
        target_bad_review_count = ElemeReviewData.query.filter(
            ElemeReviewData.data_date == target_date,
            ElemeReviewData.store_name.in_(active_store_names_eleme),
            ElemeReviewData.overall_score.isnot(None),
            ElemeReviewData.overall_score < 5.0
        ).count()
        
        # 统计前一天的差评数（使用饿了么门店名称）
        previous_bad_review_count = ElemeReviewData.query.filter(
            ElemeReviewData.data_date == previous_date,
            ElemeReviewData.store_name.in_(active_store_names_eleme),
            ElemeReviewData.overall_score.isnot(None),
            ElemeReviewData.overall_score < 5.0
        ).count()
        
        result.append({
            'key': 'bad_reviews',
            'type': '顾客差评',
            'count': target_bad_review_count,
            'change': target_bad_review_count - previous_bad_review_count,
            'color': '#f5222d',
            'isUrgent': target_bad_review_count > 3,
            'unit': '条'
        })
        
        # ========== 第11个异常：低店铺分（来自商家成长数据，只统计在营门店） ==========
        # 统计目标日期的低店铺分门店数（使用饿了么门店名称）
        target_low_growth_count = ElemeGrowthData.query.filter(
            ElemeGrowthData.data_date == target_date,
            ElemeGrowthData.store_name.in_(active_store_names_eleme),
            ElemeGrowthData.store_score.isnot(None),
            ElemeGrowthData.store_score < 100
        ).count()
        
        # 统计前一天的低店铺分门店数（使用饿了么门店名称）
        previous_low_growth_count = ElemeGrowthData.query.filter(
            ElemeGrowthData.data_date == previous_date,
            ElemeGrowthData.store_name.in_(active_store_names_eleme),
            ElemeGrowthData.store_score.isnot(None),
            ElemeGrowthData.store_score < 100
        ).count()
        
        result.append({
            'key': 'low_growth_score',
            'type': '低店铺分',
            'count': target_low_growth_count,
            'change': target_low_growth_count - previous_low_growth_count,
            'color': '#722ed1',
            'isUrgent': target_low_growth_count > 5,
            'unit': '家'
        })
        
        # ========== 第12个异常：粉丝群未创建（来自粉丝群数据，只统计在营门店） ==========
        # 统计目标日期的粉丝群未创建门店数（使用饿了么门店名称）
        target_fans_not_created_count = ElemeFansData.query.filter(
            ElemeFansData.data_date == target_date,
            ElemeFansData.store_name.in_(active_store_names_eleme),
            ElemeFansData.group_type == '未创建'
        ).count()
        
        # 统计前一天的粉丝群未创建门店数（使用饿了么门店名称）
        previous_fans_not_created_count = ElemeFansData.query.filter(
            ElemeFansData.data_date == previous_date,
            ElemeFansData.store_name.in_(active_store_names_eleme),
            ElemeFansData.group_type == '未创建'
        ).count()
        
        result.append({
            'key': 'fans_not_created',
            'type': '粉丝群未创建',
            'count': target_fans_not_created_count,
            'change': target_fans_not_created_count - previous_fans_not_created_count,
            'color': '#13c2c2',
            'isUrgent': target_fans_not_created_count > 3,
            'unit': '家'
        })
        
        return success_response({
            'date': target_date.strftime('%Y-%m-%d'),
            'anomalies': result,
            'filtered_by_active_stores': True,
            'active_store_count': len(active_store_names_eleme)
        })
        
    except Exception as e:
        current_app.logger.error(f'获取异常监控数据失败: {str(e)}')
        return error_response(f'获取异常监控数据失败: {str(e)}', 500)


@bp.route('/anomaly-details', methods=['GET'])
@token_required
def get_anomaly_details(current_user):
    """
    获取异常详细列表
    参数：
        anomaly_type (str): 异常类型
        date (str, optional): 查询日期 YYYY-MM-DD，默认为昨天
    
    注意：所有异常详情都会自动过滤，只包含"在营门店列表"中is_active=True的门店
    """
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # 获取参数
        anomaly_type = request.args.get('anomaly_type')
        if not anomaly_type:
            return error_response('缺少异常类型参数', 400)
        
        # 获取日期参数
        date_str = request.args.get('date')
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            target_date = (datetime.now() - timedelta(days=1)).date()
        
        # 获取在营门店列表（只包含is_active=True的门店）
        active_stores = ElemeActiveStore.query.filter_by(is_active=True).all()
        
        # 分别创建饿了么和食亨的门店名称列表
        active_store_names_eleme = [store.store_name for store in active_stores]
        active_store_names_shiheng = [store.store_name_shiheng for store in active_stores 
                                      if store.store_name_shiheng]  # 只包含设置了食亨名称的门店
        
        # 如果没有在营门店，返回空数据
        if not active_store_names_eleme:
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': '',
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': 0,
                'data': []
            })
        
        # ========== 处理前8个异常类型（来自门店数据） ==========
        store_anomaly_types = ['store_closed', 'out_of_stock', 'overtime_orders', 'reject_orders', 
                                'merchant_cancel', 'merchant_refund', 'low_score', 'bad_reply']
        
        if anomaly_type in store_anomaly_types:
            # 定义配置
            anomaly_configs = {
                'store_closed': {
                    'name': '闭店异常',
                    'field': 'abnormal_close_hours',
                    'condition': lambda x: x != '0' and x is not None and x != '',
                    'display_field': 'abnormal_close_hours',
                    'display_name': '异常关店时长'
                },
                'out_of_stock': {
                    'name': '库存不足',
                    'field': 'out_of_stock_products',
                    'condition': lambda x: x is not None and x > 0,
                    'display_field': 'out_of_stock_products',
                    'display_name': '库存不足商品数'
                },
                'overtime_orders': {
                    'name': '出餐超时',
                    'field': 'overtime_orders',
                    'condition': lambda x: x is not None and x > 0,
                    'display_field': 'overtime_orders',
                    'display_name': '出餐超时订单数'
                },
                'reject_orders': {
                    'name': '门店拒单',
                    'field': 'reject_orders',
                    'condition': lambda x: x is not None and x > 0,
                    'display_field': 'reject_orders',
                    'display_name': '拒单数'
                },
                'merchant_cancel': {
                    'name': '商责取消',
                    'field': 'merchant_cancel_orders',
                    'condition': lambda x: x is not None and x > 0,
                    'display_field': 'merchant_cancel_orders',
                    'display_name': '商责取消数'
                },
                'merchant_refund': {
                    'name': '商责退单',
                    'field': 'merchant_refund_orders',
                    'condition': lambda x: x is not None and x > 0,
                    'display_field': 'merchant_refund_orders',
                    'display_name': '商责退单数'
                },
                'low_score': {
                    'name': '评分过低',
                    'field': 'store_score',
                    'condition': lambda x: x is not None and float(x) < 4.9,
                    'display_field': 'store_score',
                    'display_name': '店铺评分'
                },
                'bad_reply': {
                    'name': '差评未回',
                    'field': 'bad_reply_rate_60d',
                    'condition': lambda x: x is not None and float(x) != 1.0,
                    'display_field': 'bad_reply_rate_60d',
                    'display_name': '近60日差评人工回复率(%)'
                }
            }
            
            config = anomaly_configs[anomaly_type]
            
            # 查询该日期的所有门店数据（只查询在营门店）
            stores = ElemeStoreDailyData.query.filter(
                ElemeStoreDailyData.data_date == target_date,
                ElemeStoreDailyData.store_name.in_(active_store_names_eleme)
            ).all()
            
            # 筛选出异常的门店
            anomaly_stores = []
            for store in stores:
                field_value = getattr(store, config['field'], None)
                if config['condition'](field_value):
                    anomaly_stores.append({
                        'id': store.id,
                        'data_date': store.data_date.strftime('%Y-%m-%d'),
                        'store_name': store.store_name,
                        'value': getattr(store, config['display_field'], None)
                    })
            
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': config['name'],
                'field_name': config['display_name'],
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': len(anomaly_stores),
                'data': anomaly_stores
            })
        
        # ========== 处理申请退款异常（来自订单数据） ==========
        elif anomaly_type == 'refund_orders':
            # 查询该日期的所有退款订单（只查询在营门店，使用食亨门店名称）
            orders = []
            if active_store_names_shiheng:  # 只有在有食亨门店名称时才查询
                orders = ElemeOrderData.query.filter(
                    func.date(ElemeOrderData.order_time) == target_date,
                    ElemeOrderData.store_name.in_(active_store_names_shiheng),
                    ElemeOrderData.refund_reason.isnot(None),
                    ElemeOrderData.refund_reason != ''
                ).all()
            
            anomaly_orders = []
            for order in orders:
                anomaly_orders.append({
                    'id': order.id,
                    'order_id': order.order_id,
                    'store_name': order.store_name,
                    'order_time': order.order_time,
                    'order_status': order.order_status,
                    'product_info': order.product_info,
                    'order_note': order.order_note,
                    'refund_reason': order.refund_reason,
                    'estimated_income': float(order.estimated_income) if order.estimated_income else 0
                })
            
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': '申请退款',
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': len(anomaly_orders),
                'data': anomaly_orders
            })
        
        # ========== 处理顾客差评异常（来自评价数据，只查询在营门店） ==========
        elif anomaly_type == 'bad_reviews':
            # 查询该日期的所有差评
            reviews = ElemeReviewData.query.filter(
                ElemeReviewData.data_date == target_date,
                ElemeReviewData.store_name.in_(active_store_names_eleme),
                ElemeReviewData.overall_score.isnot(None),
                ElemeReviewData.overall_score < 5.0
            ).all()
            
            anomaly_reviews = []
            for review in reviews:
                anomaly_reviews.append({
                    'id': review.id,
                    'data_date': review.data_date.strftime('%Y-%m-%d'),
                    'store_name': review.store_name,
                    'order_id': review.order_id,
                    'review_time': review.review_time.strftime('%Y-%m-%d %H:%M:%S') if review.review_time else '',
                    'overall_score': float(review.overall_score) if review.overall_score else 0,
                    'review_content': review.review_content,
                    'is_appeal_success': review.is_appeal_success
                })
            
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': '顾客差评',
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': len(anomaly_reviews),
                'data': anomaly_reviews
            })
        
        # ========== 处理粉丝群未创建异常（来自粉丝群数据，只查询在营门店） ==========
        elif anomaly_type == 'fans_not_created':
            # 查询该日期的所有粉丝群未创建门店
            fans_data = ElemeFansData.query.filter(
                ElemeFansData.data_date == target_date,
                ElemeFansData.store_name.in_(active_store_names_eleme),
                ElemeFansData.group_type == '未创建'
            ).all()
            
            anomaly_fans = []
            for data in fans_data:
                anomaly_fans.append({
                    'id': data.id,
                    'data_date': data.data_date.strftime('%Y-%m-%d'),
                    'store_name': data.store_name,
                    'reach_threshold': data.reach_threshold,
                    'group_type': data.group_type
                })
            
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': '粉丝群未创建',
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': len(anomaly_fans),
                'data': anomaly_fans
            })
        
        # ========== 处理低店铺分异常（来自商家成长数据，只查询在营门店） ==========
        elif anomaly_type == 'low_growth_score':
            # 查询该日期的所有低店铺分门店
            growth_data = ElemeGrowthData.query.filter(
                ElemeGrowthData.data_date == target_date,
                ElemeGrowthData.store_name.in_(active_store_names_eleme),
                ElemeGrowthData.store_score.isnot(None),
                ElemeGrowthData.store_score < 100
            ).all()
            
            anomaly_growth = []
            for data in growth_data:
                item = {
                    'id': data.id,
                    'data_date': data.data_date.strftime('%Y-%m-%d'),
                    'store_name': data.store_name,
                    'store_score': float(data.store_score) if data.store_score else 0,
                }
                
                # 条件显示各个得分项（只显示不等于100的）
                score_fields = [
                    ('peak_hours_7d_score', '高峰时长得分'),
                    ('business_hours_7d_score', '营业时长得分'),
                    ('store_decoration_score', '店装丰富度得分'),
                    ('min_delivery_price_score', '最低起送价得分'),
                    ('service_features_score', '服务功能得分'),
                    ('promotion_richness_score', '活动丰富度得分'),
                    ('negative_reply_rate_7d_score', '差评回复率得分'),
                    ('merchant_rating_score', '商家评分得分'),
                    ('online_reply_rate_7d_score', '在线回复率得分'),
                    ('quality_product_rate_score', '优质商品率得分'),
                    ('menu_richness_score', '菜单丰富度得分'),
                    ('merchant_cancel_rate_score', '商责取消率得分'),
                    ('meal_report_rate_7d_score', '出餐上报率得分')
                ]
                
                for field_name, display_name in score_fields:
                    field_value = getattr(data, field_name, None)
                    if field_value is not None:
                        score = float(field_value)
                        if score != 100:
                            item[field_name] = score
                            item[f'{field_name}_name'] = display_name
                
                anomaly_growth.append(item)
            
            return success_response({
                'anomaly_type': anomaly_type,
                'anomaly_name': '低店铺分',
                'date': target_date.strftime('%Y-%m-%d'),
                'total_count': len(anomaly_growth),
                'data': anomaly_growth
            })
        
        else:
            return error_response(f'无效的异常类型: {anomaly_type}', 400)
        
    except Exception as e:
        current_app.logger.error(f'获取异常详情失败: {str(e)}')
        import traceback
        current_app.logger.error(traceback.format_exc())
        return error_response(f'获取异常详情失败: {str(e)}', 500)

