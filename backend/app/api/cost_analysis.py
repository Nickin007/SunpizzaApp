"""
饿了么成本分析相关API
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import (ElemeActiveStore, SourceCostLibrary, ProductMapping,
                        ElemeIntegratedOrder, ElemeUnmatchedOrder,
                        ElemeOrderElemeData, ElemeOrderData,
                        ElemeProductMapping, ElemeProductMappingUnmatched,
                        ElemeCostMapping, ElemeCostMappingUnmatched)
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response
from app.utils.order_parser import parse_order_items
from datetime import datetime
import re

bp = Blueprint('cost_analysis', __name__, url_prefix='/api/cost-analysis')


def process_single_order_product_mapping(order):
    """
    处理单个订单的单品映射
    
    Args:
        order: ElemeIntegratedOrder 对象
        
    Returns:
        (success: bool, message: str)
    """
    try:
        product_info = order.product_info or ''
        
        # 使用算法解析商品信息
        parsed_items = parse_order_items(product_info)
        
        # 将解析结果转换为字符串
        parsed_products_str = ', '.join(parsed_items) if parsed_items else ''
        
        # 检查是否已存在映射记录
        existing_mapping = ElemeProductMapping.query.filter_by(
            order_date=order.order_date,
            order_id=order.order_id,
            is_deleted=False
        ).first()
        
        # 检查是否已存在未匹配记录
        existing_unmatched = ElemeProductMappingUnmatched.query.filter_by(
            order_date=order.order_date,
            order_id=order.order_id,
            is_deleted=False
        ).first()
        
        if parsed_items:
            # 解析成功 - 创建或更新映射记录
            if existing_mapping:
                # 更新现有记录
                existing_mapping.store_name = order.store_name
                existing_mapping.order_time = order.order_time
                existing_mapping.expected_income = order.expected_income
                existing_mapping.product_info = product_info
                existing_mapping.parsed_products = parsed_products_str
            else:
                # 创建新记录
                mapping = ElemeProductMapping(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=product_info,
                    parsed_products=parsed_products_str
                )
                db.session.add(mapping)
            
            # 如果存在未匹配记录，删除它
            if existing_unmatched:
                existing_unmatched.is_deleted = True
                
            return True, '单品映射成功'
        else:
            # 解析失败 - 创建或更新未匹配记录
            if existing_unmatched:
                # 更新现有记录
                existing_unmatched.store_name = order.store_name
                existing_unmatched.order_time = order.order_time
                existing_unmatched.expected_income = order.expected_income
                existing_unmatched.product_info = product_info
                existing_unmatched.parsed_products = parsed_products_str
            else:
                # 创建新记录
                unmatched = ElemeProductMappingUnmatched(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=product_info,
                    parsed_products=parsed_products_str
                )
                db.session.add(unmatched)
            
            # 如果存在映射记录，删除它
            if existing_mapping:
                existing_mapping.is_deleted = True
                
            return False, '单品解析失败'
            
    except Exception as e:
        return False, f'单品映射处理失败: {str(e)}'


def process_single_order_cost_mapping(product_mapping):
    """
    处理单个订单的成本映射
    
    Args:
        product_mapping: ElemeProductMapping 对象
        
    Returns:
        (success: bool, message: str, order_cost: float or None)
    """
    try:
        parsed_products_str = product_mapping.parsed_products or ''
        
        if not parsed_products_str:
            return False, '没有解析单品', None
        
        # 解析单品列表
        parsed_items = [item.strip() for item in parsed_products_str.split(',') if item.strip()]
        
        total_cost = 0.0
        unmatched_items = []
        
        for item in parsed_items:
            # 解析格式：单品名_数量
            match = re.match(r'^(.+?)_(\d+)$', item)
            if not match:
                unmatched_items.append(item)
                continue
            
            product_name = match.group(1)
            quantity = int(match.group(2))
            
            # 在映射数据库中查找源商品名
            mapping = ProductMapping.query.filter_by(
                parsed_product_name=product_name,
                is_deleted=False
            ).first()
            
            if not mapping:
                unmatched_items.append(f'{product_name} (无映射)')
                continue
            
            source_product_name = mapping.source_product_name
            
            # 在成本库中查找成本
            cost_item = SourceCostLibrary.query.filter_by(
                source_product_name=source_product_name,
                is_deleted=False
            ).first()
            
            if not cost_item:
                unmatched_items.append(f'{product_name} -> {source_product_name} (无成本)')
                continue
            
            # 计算该单品的总成本
            item_total_cost = cost_item.cost * quantity
            total_cost += item_total_cost
        
        # 检查是否已存在成本映射记录
        existing_cost_mapping = ElemeCostMapping.query.filter_by(
            order_date=product_mapping.order_date,
            order_id=product_mapping.order_id,
            is_deleted=False
        ).first()
        
        # 检查是否已存在未匹配记录
        existing_unmatched = ElemeCostMappingUnmatched.query.filter_by(
            order_date=product_mapping.order_date,
            order_id=product_mapping.order_id,
            is_deleted=False
        ).first()
        
        if not unmatched_items:
            # 所有单品都成功匹配成本
            if existing_cost_mapping:
                # 更新现有记录
                existing_cost_mapping.store_name = product_mapping.store_name
                existing_cost_mapping.order_time = product_mapping.order_time
                existing_cost_mapping.expected_income = product_mapping.expected_income
                existing_cost_mapping.product_info = product_mapping.product_info
                existing_cost_mapping.parsed_products = product_mapping.parsed_products
                existing_cost_mapping.order_cost = total_cost
            else:
                # 创建新记录
                cost_mapping = ElemeCostMapping(
                    order_date=product_mapping.order_date,
                    order_id=product_mapping.order_id,
                    store_name=product_mapping.store_name,
                    order_time=product_mapping.order_time,
                    expected_income=product_mapping.expected_income,
                    order_cost=total_cost,
                    product_info=product_mapping.product_info,
                    parsed_products=product_mapping.parsed_products
                )
                db.session.add(cost_mapping)
            
            # 如果存在未匹配记录，删除它
            if existing_unmatched:
                existing_unmatched.is_deleted = True
                
            return True, '成本映射成功', total_cost
        else:
            # 有未匹配的单品
            if existing_unmatched:
                # 更新现有记录
                existing_unmatched.store_name = product_mapping.store_name
                existing_unmatched.order_time = product_mapping.order_time
                existing_unmatched.expected_income = product_mapping.expected_income
                existing_unmatched.product_info = product_mapping.product_info
                existing_unmatched.parsed_products = product_mapping.parsed_products
            else:
                # 创建新记录
                unmatched = ElemeCostMappingUnmatched(
                    order_date=product_mapping.order_date,
                    order_id=product_mapping.order_id,
                    store_name=product_mapping.store_name,
                    order_time=product_mapping.order_time,
                    expected_income=product_mapping.expected_income,
                    product_info=product_mapping.product_info,
                    parsed_products=product_mapping.parsed_products
                )
                db.session.add(unmatched)
            
            # 如果存在成本映射记录，删除它
            if existing_cost_mapping:
                existing_cost_mapping.is_deleted = True
                
            return False, f'部分单品无法匹配成本: {", ".join(unmatched_items)}', None
            
    except Exception as e:
        return False, f'成本映射处理失败: {str(e)}', None


@bp.route('/applied-stores', methods=['GET'])
@token_required
def get_applied_stores(current_user):
    """
    获取应用成本分析的门店列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认10）
    - search: 搜索关键词（门店名称）
    - enabled_only: 是否只显示已启用的门店（默认false）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        enabled_only = request.args.get('enabled_only', 'false').lower() == 'true'
        
        # 构建查询
        query = ElemeActiveStore.query
        
        # 只显示在营门店
        query = query.filter_by(is_active=True)
        
        # 如果只显示已启用成本分析的门店
        if enabled_only:
            query = query.filter_by(cost_analysis_enabled=True)
        
        # 搜索过滤
        if search:
            query = query.filter(
                db.or_(
                    ElemeActiveStore.store_name.like(f'%{search}%'),
                    ElemeActiveStore.store_name_shiheng.like(f'%{search}%')
                )
            )
        
        # 排序：优先显示已启用的，然后按更新时间倒序
        query = query.order_by(
            ElemeActiveStore.cost_analysis_enabled.desc(),
            ElemeActiveStore.updated_at.desc()
        )
        
        # 分页
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response({
            'stores': [store.to_dict() for store in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取应用门店列表失败: {str(e)}', 500)


@bp.route('/applied-stores', methods=['POST'])
@token_required
def create_applied_store(current_user):
    """
    创建新的应用门店
    
    Body参数:
    - store_name: 门店名称（饿了么）（必填）
    - store_name_shiheng: 门店名称（食亨）（可选）
    - cost_analysis_enabled: 是否启用成本分析（可选，默认true）
    """
    try:
        data = request.get_json()
        store_name = data.get('store_name', '').strip()
        store_name_shiheng = data.get('store_name_shiheng', '').strip() or None
        cost_analysis_enabled = data.get('cost_analysis_enabled', True)
        
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
            is_active=True,
            cost_analysis_enabled=cost_analysis_enabled
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


@bp.route('/applied-stores/<int:store_id>', methods=['PUT'])
@token_required
def update_applied_store(current_user, store_id):
    """
    更新应用门店信息
    
    Body参数:
    - store_name: 门店名称（饿了么）（可选）
    - store_name_shiheng: 门店名称（食亨）（可选）
    - cost_analysis_enabled: 是否启用成本分析（可选）
    """
    try:
        store = ElemeActiveStore.query.get(store_id)
        if not store:
            return error_response('门店不存在', 404)
        
        data = request.get_json()
        
        # 更新门店名称
        if 'store_name' in data:
            new_name = data['store_name'].strip()
            if not new_name:
                return error_response('门店名称不能为空', 400)
            
            # 检查是否与其他门店重名
            if new_name != store.store_name:
                existing = ElemeActiveStore.query.filter_by(store_name=new_name).first()
                if existing:
                    return error_response('门店名称已存在', 400)
                store.store_name = new_name
        
        # 更新食亨门店名称
        if 'store_name_shiheng' in data:
            store.store_name_shiheng = data['store_name_shiheng'].strip() or None
        
        # 更新成本分析启用状态
        if 'cost_analysis_enabled' in data:
            store.cost_analysis_enabled = data['cost_analysis_enabled']
        
        store.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'store': store.to_dict(),
            'message': '门店更新成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新门店失败: {str(e)}', 500)


@bp.route('/applied-stores/<int:store_id>/toggle', methods=['PUT'])
@token_required
def toggle_cost_analysis(current_user, store_id):
    """
    切换门店的成本分析启用状态
    """
    try:
        store = ElemeActiveStore.query.get(store_id)
        if not store:
            return error_response('门店不存在', 404)
        
        # 切换状态
        store.cost_analysis_enabled = not store.cost_analysis_enabled
        store.updated_at = datetime.utcnow()
        db.session.commit()
        
        status = '启用' if store.cost_analysis_enabled else '停用'
        return success_response({
            'store': store.to_dict(),
            'message': f'成本分析已{status}'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'切换状态失败: {str(e)}', 500)


@bp.route('/applied-stores/<int:store_id>', methods=['DELETE'])
@token_required
def delete_applied_store(current_user, store_id):
    """
    删除应用门店
    """
    try:
        store = ElemeActiveStore.query.get(store_id)
        if not store:
            return error_response('门店不存在', 404)
        
        store_name = store.store_name
        db.session.delete(store)
        db.session.commit()
        
        return success_response({
            'message': f'门店"{store_name}"已删除'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除门店失败: {str(e)}', 500)


@bp.route('/applied-stores/summary', methods=['GET'])
@token_required
def get_summary(current_user):
    """
    获取应用门店统计信息
    """
    try:
        total = ElemeActiveStore.query.filter_by(is_active=True).count()
        enabled = ElemeActiveStore.query.filter_by(
            is_active=True,
            cost_analysis_enabled=True
        ).count()
        
        return success_response({
            'total_stores': total,
            'enabled_stores': enabled,
            'disabled_stores': total - enabled
        })
        
    except Exception as e:
        return error_response(f'获取统计信息失败: {str(e)}', 500)


# ==================== 源商品成本库 API ====================

@bp.route('/source-cost-library', methods=['GET'])
@token_required
def get_source_cost_library(current_user):
    """
    获取源商品成本库列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认10）
    - search: 搜索关键词（源商品名称）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        
        # 构建查询
        query = SourceCostLibrary.query.filter_by(is_deleted=False)
        
        # 搜索过滤
        if search:
            query = query.filter(
                SourceCostLibrary.source_product_name.like(f'%{search}%')
            )
        
        # 排序：按更新时间倒序
        query = query.order_by(SourceCostLibrary.updated_at.desc())
        
        # 分页
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response({
            'items': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取源商品成本库失败: {str(e)}', 500)


@bp.route('/source-cost-library', methods=['POST'])
@token_required
def create_source_cost(current_user):
    """
    创建源商品成本
    
    Body参数:
    - source_product_name: 源商品名称（必填）
    - cost: 成本（必填）
    """
    try:
        data = request.get_json()
        source_product_name = data.get('source_product_name', '').strip()
        cost = data.get('cost')
        
        if not source_product_name:
            return error_response('源商品名称不能为空', 400)
        if cost is None or cost < 0:
            return error_response('成本必须大于等于0', 400)
        
        # 检查源商品名称是否已存在
        existing = SourceCostLibrary.query.filter_by(
            source_product_name=source_product_name,
            is_deleted=False
        ).first()
        if existing:
            return error_response('该源商品名称已存在', 400)
        
        # 创建新记录
        new_item = SourceCostLibrary(
            source_product_name=source_product_name,
            cost=cost
        )
        
        db.session.add(new_item)
        db.session.commit()
        
        return success_response({
            'item': new_item.to_dict(),
            'message': '源商品成本创建成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建源商品成本失败: {str(e)}', 500)


@bp.route('/source-cost-library/<int:item_id>', methods=['PUT'])
@token_required
def update_source_cost(current_user, item_id):
    """
    更新源商品成本
    
    Body参数:
    - source_product_name: 源商品名称（可选）
    - cost: 成本（可选）
    """
    try:
        item = SourceCostLibrary.query.filter_by(id=item_id, is_deleted=False).first()
        if not item:
            return error_response('记录不存在', 404)
        
        data = request.get_json()
        
        # 更新源商品名称
        if 'source_product_name' in data:
            new_name = data['source_product_name'].strip()
            if not new_name:
                return error_response('源商品名称不能为空', 400)
            
            # 检查名称是否与其他记录重复
            if new_name != item.source_product_name:
                existing = SourceCostLibrary.query.filter_by(
                    source_product_name=new_name,
                    is_deleted=False
                ).first()
                if existing:
                    return error_response('该源商品名称已存在', 400)
                item.source_product_name = new_name
        
        # 更新成本
        if 'cost' in data:
            cost = data['cost']
            if cost is None or cost < 0:
                return error_response('成本必须大于等于0', 400)
            item.cost = cost
        
        item.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'item': item.to_dict(),
            'message': '源商品成本更新成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新源商品成本失败: {str(e)}', 500)


@bp.route('/source-cost-library/<int:item_id>', methods=['DELETE'])
@token_required
def delete_source_cost(current_user, item_id):
    """
    删除源商品成本（软删除）
    """
    try:
        item = SourceCostLibrary.query.filter_by(id=item_id, is_deleted=False).first()
        if not item:
            return error_response('记录不存在', 404)
        
        # 软删除
        item.is_deleted = True
        item.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'message': f'源商品"{item.source_product_name}"已删除'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除源商品成本失败: {str(e)}', 500)




# ==================== 映射商品库 API ====================

@bp.route('/product-mapping', methods=['GET'])
@token_required
def get_product_mapping(current_user):
    """
    获取映射商品库列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认10）
    - search: 搜索关键词（拆解单品名称或源商品名称）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        
        # 构建查询
        query = ProductMapping.query.filter_by(is_deleted=False)
        
        # 搜索过滤
        if search:
            query = query.filter(
                db.or_(
                    ProductMapping.parsed_product_name.like(f'%{search}%'),
                    ProductMapping.source_product_name.like(f'%{search}%')
                )
            )
        
        # 排序：按更新时间倒序
        query = query.order_by(ProductMapping.updated_at.desc())
        
        # 分页
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response({
            'items': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取映射商品库失败: {str(e)}', 500)


@bp.route('/product-mapping', methods=['POST'])
@token_required
def create_product_mapping(current_user):
    """
    创建商品映射
    
    Body参数:
    - parsed_product_name: 拆解单品名称（必填）
    - source_product_name: 映射源商品名称（必填）
    """
    try:
        data = request.get_json()
        parsed_product_name = data.get('parsed_product_name', '').strip()
        source_product_name = data.get('source_product_name', '').strip()
        
        if not parsed_product_name:
            return error_response('拆解单品名称不能为空', 400)
        if not source_product_name:
            return error_response('映射源商品名称不能为空', 400)
        
        # 检查拆解单品名称是否已存在
        existing = ProductMapping.query.filter_by(
            parsed_product_name=parsed_product_name,
            is_deleted=False
        ).first()
        if existing:
            return error_response('该拆解单品已存在映射', 400)
        
        # 检查源商品名称是否存在于源商品成本库
        source_product = SourceCostLibrary.query.filter_by(
            source_product_name=source_product_name,
            is_deleted=False
        ).first()
        if not source_product:
            return error_response('源商品名称不存在，请先在源商品成本库中添加', 400)
        
        # 创建新映射
        new_mapping = ProductMapping(
            parsed_product_name=parsed_product_name,
            source_product_name=source_product_name
        )
        
        db.session.add(new_mapping)
        db.session.commit()
        
        return success_response({
            'item': new_mapping.to_dict(),
            'message': '商品映射创建成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建商品映射失败: {str(e)}', 500)


@bp.route('/product-mapping/<int:item_id>', methods=['PUT'])
@token_required
def update_product_mapping(current_user, item_id):
    """
    更新商品映射
    
    Body参数:
    - parsed_product_name: 拆解单品名称（可选）
    - source_product_name: 映射源商品名称（可选）
    """
    try:
        mapping = ProductMapping.query.filter_by(id=item_id, is_deleted=False).first()
        if not mapping:
            return error_response('映射记录不存在', 404)
        
        data = request.get_json()
        
        # 更新拆解单品名称
        if 'parsed_product_name' in data:
            new_name = data['parsed_product_name'].strip()
            if not new_name:
                return error_response('拆解单品名称不能为空', 400)
            
            # 检查是否与其他映射重复
            if new_name != mapping.parsed_product_name:
                existing = ProductMapping.query.filter_by(
                    parsed_product_name=new_name,
                    is_deleted=False
                ).first()
                if existing:
                    return error_response('该拆解单品已存在映射', 400)
                mapping.parsed_product_name = new_name
        
        # 更新映射源商品名称
        if 'source_product_name' in data:
            new_source_name = data['source_product_name'].strip()
            if not new_source_name:
                return error_response('映射源商品名称不能为空', 400)
            
            # 检查源商品名称是否存在于源商品成本库
            source_product = SourceCostLibrary.query.filter_by(
                source_product_name=new_source_name,
                is_deleted=False
            ).first()
            if not source_product:
                return error_response('源商品名称不存在，请先在源商品成本库中添加', 400)
            
            mapping.source_product_name = new_source_name
        
        mapping.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'item': mapping.to_dict(),
            'message': '商品映射更新成功'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新商品映射失败: {str(e)}', 500)


@bp.route('/product-mapping/<int:item_id>', methods=['DELETE'])
@token_required
def delete_product_mapping(current_user, item_id):
    """
    删除商品映射（软删除）
    """
    try:
        mapping = ProductMapping.query.filter_by(id=item_id, is_deleted=False).first()
        if not mapping:
            return error_response('映射记录不存在', 404)
        
        # 软删除
        mapping.is_deleted = True
        mapping.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'message': f'映射"{mapping.parsed_product_name}"已删除'
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除商品映射失败: {str(e)}', 500)


# ==================== 订单整合相关API ====================

@bp.route('/integrate-orders', methods=['POST'])
@token_required
def integrate_orders(current_user):
    """
    执行订单整合（匹配食亨和饿了么的订单）
    
    Request Body:
    {
        "date": "2025-01-01"  # 指定日期（整合该日期的订单数据）
    }
    """
    try:
        data = request.get_json() or {}
        target_date = data.get('date')
        
        if not target_date:
            return error_response('请提供要整合的日期', 400)
        
        # 获取启用了成本分析的门店列表
        enabled_stores = ElemeActiveStore.query.filter_by(
            cost_analysis_enabled=True,
            is_active=True
        ).all()
        
        if not enabled_stores:
            return error_response('没有启用成本分析的门店，无法进行订单整合', 400)
        
        # 获取门店名称列表（饿了么和食亨）
        eleme_store_names = [store.store_name for store in enabled_stores]
        shiheng_store_names = [
            store.store_name_shiheng if store.store_name_shiheng else store.store_name 
            for store in enabled_stores
        ]
        
        # 清空该日期的旧整合数据
        ElemeIntegratedOrder.query.filter(
            ElemeIntegratedOrder.order_date == target_date
        ).delete()
        ElemeUnmatchedOrder.query.filter(
            db.or_(
                ElemeUnmatchedOrder.order_date == target_date,
                db.and_(
                    ElemeUnmatchedOrder.order_date == None,
                    db.func.date(ElemeUnmatchedOrder.order_time) == target_date
                )
            )
        ).delete()
        
        # 查询食亨订单数据（该日期的订单，且门店已启用成本分析）
        shiheng_orders = ElemeOrderData.query.filter(
            db.func.date(ElemeOrderData.order_time) == target_date,
            ElemeOrderData.store_name.in_(shiheng_store_names)
        ).all()
        
        # 查询饿了么订单数据（该日期的订单，且门店已启用成本分析）
        eleme_orders = ElemeOrderElemeData.query.filter(
            ElemeOrderElemeData.data_date == target_date,
            ElemeOrderElemeData.store_name.in_(eleme_store_names)
        ).all()
        
        # 建立饿了么订单号的字典，方便查找
        eleme_dict = {}
        for eleme_order in eleme_orders:
            if eleme_order.order_id:
                eleme_dict[eleme_order.order_id] = eleme_order
        
        # 遍历食亨订单，匹配饿了么订单
        matched_orders = []
        unmatched_shiheng = []
        matched_order_ids = set()
        
        for shiheng_order in shiheng_orders:
            if shiheng_order.order_id in eleme_dict:
                # 匹配成功
                eleme_order = eleme_dict[shiheng_order.order_id]
                matched_order_ids.add(shiheng_order.order_id)
                
                integrated_order = ElemeIntegratedOrder(
                    order_date=eleme_order.data_date,
                    order_id=shiheng_order.order_id,
                    store_name=shiheng_order.store_name,
                    order_time=shiheng_order.order_time,
                    expected_income=shiheng_order.estimated_income,
                    product_info=eleme_order.product_info
                )
                matched_orders.append(integrated_order)
            else:
                # 食亨订单未匹配
                unmatched_order = ElemeUnmatchedOrder(
                    source='shiheng',
                    order_id=shiheng_order.order_id,
                    store_name=shiheng_order.store_name,
                    order_time=shiheng_order.order_time,
                    expected_income=shiheng_order.estimated_income
                )
                unmatched_shiheng.append(unmatched_order)
        
        # 找出饿了么未匹配的订单
        unmatched_eleme = []
        for order_id, eleme_order in eleme_dict.items():
            if order_id not in matched_order_ids:
                unmatched_order = ElemeUnmatchedOrder(
                    source='eleme',
                    order_id=eleme_order.order_id,
                    store_name=eleme_order.store_name or '未知',
                    order_date=eleme_order.data_date,
                    product_info=eleme_order.product_info
                )
                unmatched_eleme.append(unmatched_order)
        
        # 批量插入数据
        if matched_orders:
            db.session.bulk_save_objects(matched_orders)
        if unmatched_shiheng:
            db.session.bulk_save_objects(unmatched_shiheng)
        if unmatched_eleme:
            db.session.bulk_save_objects(unmatched_eleme)
        
        db.session.commit()
        
        return success_response({
            'matched_count': len(matched_orders),
            'unmatched_eleme_count': len(unmatched_eleme),
            'unmatched_shiheng_count': len(unmatched_shiheng),
            'total_shiheng': len(shiheng_orders),
            'total_eleme': len(eleme_orders)
        }, '订单整合完成')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'订单整合失败: {str(e)}', 500)


@bp.route('/integrated-orders', methods=['GET'])
@token_required
def get_integrated_orders(current_user):
    """
    获取已整合订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - search: 搜索关键词（订单号、门店名称）
    - start_date: 开始日期
    - end_date: 结束日期
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = ElemeIntegratedOrder.query.filter_by(is_deleted=False)
        
        # 搜索
        if search:
            query = query.filter(
                db.or_(
                    ElemeIntegratedOrder.order_id.like(f'%{search}%'),
                    ElemeIntegratedOrder.store_name.like(f'%{search}%')
                )
            )
        
        # 日期筛选
        if start_date:
            query = query.filter(ElemeIntegratedOrder.order_date >= start_date)
        if end_date:
            query = query.filter(ElemeIntegratedOrder.order_date <= end_date)
        
        # 排序和分页
        query = query.order_by(ElemeIntegratedOrder.order_date.desc(), ElemeIntegratedOrder.order_time.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response({
            'items': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取已整合订单失败: {str(e)}', 500)


@bp.route('/unmatched-orders', methods=['GET'])
@token_required
def get_unmatched_orders(current_user):
    """
    获取未匹配订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - source: 来源筛选（eleme或shiheng）
    - search: 搜索关键词（订单号、门店名称）
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        source = request.args.get('source', '').strip()
        search = request.args.get('search', '').strip()
        
        query = ElemeUnmatchedOrder.query.filter_by(is_deleted=False)
        
        # 来源筛选
        if source:
            query = query.filter_by(source=source)
        
        # 搜索
        if search:
            query = query.filter(
                db.or_(
                    ElemeUnmatchedOrder.order_id.like(f'%{search}%'),
                    ElemeUnmatchedOrder.store_name.like(f'%{search}%')
                )
            )
        
        # 统计各来源数量
        eleme_count = ElemeUnmatchedOrder.query.filter_by(is_deleted=False, source='eleme').count()
        shiheng_count = ElemeUnmatchedOrder.query.filter_by(is_deleted=False, source='shiheng').count()
        
        # 排序和分页
        query = query.order_by(ElemeUnmatchedOrder.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return success_response({
            'items': [item.to_dict() for item in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'eleme_count': eleme_count,
            'shiheng_count': shiheng_count
        })
        
    except Exception as e:
        return error_response(f'获取未匹配订单失败: {str(e)}', 500)


@bp.route('/manual-match-order', methods=['POST'])
@token_required
def manual_match_order(current_user):
    """
    手动匹配未匹配订单
    
    请求体:
    {
        "unmatched_order_id": 123,  # 未匹配订单ID
        "expected_income": 50.5,    # 预计收入（饿了么订单需要）
        "order_time": "2025-10-28 12:00:00",  # 下单时间（饿了么订单需要）
        "product_info": "商品信息"   # 商品信息（食亨订单需要）
    }
    """
    try:
        data = request.get_json()
        unmatched_order_id = data.get('unmatched_order_id')
        
        if not unmatched_order_id:
            return error_response('未匹配订单ID不能为空', 400)
        
        # 查询未匹配订单
        unmatched_order = ElemeUnmatchedOrder.query.filter_by(
            id=unmatched_order_id,
            is_deleted=False
        ).first()
        
        if not unmatched_order:
            return error_response('未匹配订单不存在', 404)
        
        # 根据来源补充数据
        if unmatched_order.source == 'eleme':
            # 饿了么订单：需要补充食亨的预计收入和下单时间
            expected_income = data.get('expected_income')
            order_time_str = data.get('order_time')
            
            if expected_income is None:
                return error_response('请提供预计收入', 400)
            if not order_time_str:
                return error_response('请提供下单时间', 400)
            
            try:
                order_time = datetime.strptime(order_time_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('下单时间格式不正确，应为 YYYY-MM-DD HH:MM:SS', 400)
            
            # 创建整合订单记录
            integrated_order = ElemeIntegratedOrder(
                order_date=unmatched_order.order_date,
                order_id=unmatched_order.order_id,
                store_name=unmatched_order.store_name,
                order_time=order_time,
                expected_income=expected_income,
                product_info=unmatched_order.product_info
            )
            
        else:  # source == 'shiheng'
            # 食亨订单：需要补充饿了么的商品信息
            product_info = data.get('product_info', '').strip()
            
            if not product_info:
                return error_response('请提供商品信息', 400)
            
            # 创建整合订单记录
            integrated_order = ElemeIntegratedOrder(
                order_date=unmatched_order.order_date or datetime.strptime(str(unmatched_order.order_time).split()[0], '%Y-%m-%d').date(),
                order_id=unmatched_order.order_id,
                store_name=unmatched_order.store_name,
                order_time=unmatched_order.order_time,
                expected_income=unmatched_order.expected_income,
                product_info=product_info
            )
        
        # 保存整合订单
        db.session.add(integrated_order)
        
        # 删除未匹配订单（软删除）
        unmatched_order.is_deleted = True
        
        db.session.commit()
        
        return success_response({
            'message': '手动匹配成功',
            'integrated_order': integrated_order.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'手动匹配失败: {str(e)}', 500)


@bp.route('/integration-status', methods=['GET'])
@token_required
def get_integration_status(current_user):
    """
    获取订单整合状态（用于日历面板显示）
    
    返回所有已整合订单的日期列表
    """
    try:
        # 获取所有不重复的订单日期
        dates = db.session.query(
            db.func.distinct(ElemeIntegratedOrder.order_date)
        ).filter(
            ElemeIntegratedOrder.is_deleted == False
        ).all()
        
        # 转换为日期字符串列表
        date_list = [date[0].strftime('%Y-%m-%d') for date in dates if date[0]]
        
        return success_response({
            'dates': date_list,
            'count': len(date_list)
        })
        
    except Exception as e:
        return error_response(f'获取整合状态失败: {str(e)}', 500)


# ==================== 单品映射相关API ====================

@bp.route('/map-products', methods=['POST'])
@token_required
def map_products(current_user):
    """
    执行单品映射
    将订单整合数据库中的商品信息拆分成单个单品
    
    请求体:
    {
        "date": "2025-10-28"  # 要映射的日期
    }
    """
    try:
        data = request.get_json()
        target_date = data.get('date')
        
        if not target_date:
            return error_response('请提供要映射的日期', 400)
        
        # 验证日期格式
        try:
            date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return error_response('日期格式不正确，应为YYYY-MM-DD', 400)
        
        # 清除该日期已有的映射数据
        ElemeProductMapping.query.filter_by(order_date=date_obj).delete()
        ElemeProductMappingUnmatched.query.filter_by(order_date=date_obj).delete()
        db.session.commit()
        
        # 从订单整合数据库获取该日期的订单
        integrated_orders = ElemeIntegratedOrder.query.filter_by(
            order_date=date_obj,
            is_deleted=False
        ).all()
        
        if not integrated_orders:
            return error_response(f'{target_date} 没有订单整合数据，请先进行订单整合', 400)
        
        mapped_count = 0
        unmatched_count = 0
        
        for order in integrated_orders:
            product_info = order.product_info or ''
            
            # 使用算法解析商品信息
            parsed_items = parse_order_items(product_info)
            
            # 将解析结果转换为字符串（逗号分隔）
            parsed_products_str = ', '.join(parsed_items) if parsed_items else ''
            
            # 判断是否匹配成功（这里简单判断：如果成功解析出单品就算匹配）
            if parsed_items:
                # 创建映射记录
                mapping = ElemeProductMapping(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=product_info,
                    parsed_products=parsed_products_str
                )
                db.session.add(mapping)
                mapped_count += 1
            else:
                # 创建未匹配记录
                unmatched = ElemeProductMappingUnmatched(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=product_info,
                    parsed_products=parsed_products_str
                )
                db.session.add(unmatched)
                unmatched_count += 1
        
        db.session.commit()
        
        return success_response({
            'message': '单品映射完成',
            'date': target_date,
            'mapped_count': mapped_count,
            'unmatched_count': unmatched_count
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'单品映射失败: {str(e)}', 500)


@bp.route('/mapping-status', methods=['GET'])
@token_required
def get_mapping_status(current_user):
    """
    获取单品映射状态（用于日历面板显示）
    
    返回所有已映射单品的日期列表
    """
    try:
        # 获取所有不重复的订单日期
        dates = db.session.query(
            db.func.distinct(ElemeProductMapping.order_date)
        ).filter(
            ElemeProductMapping.is_deleted == False
        ).all()
        
        # 转换为日期字符串列表
        date_list = [date[0].strftime('%Y-%m-%d') for date in dates if date[0]]
        
        return success_response({
            'dates': date_list,
            'count': len(date_list)
        })
        
    except Exception as e:
        return error_response(f'获取映射状态失败: {str(e)}', 500)


@bp.route('/mapped-products', methods=['GET'])
@token_required
def get_mapped_products(current_user):
    """
    获取已映射的单品订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - search: 搜索关键词（订单号、门店名称）
    - start_date: 开始日期（可选）
    - end_date: 结束日期（可选）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        
        # 构建查询
        query = ElemeProductMapping.query.filter_by(is_deleted=False)
        
        # 搜索过滤
        if search:
            query = query.filter(
                db.or_(
                    ElemeProductMapping.order_id.like(f'%{search}%'),
                    ElemeProductMapping.store_name.like(f'%{search}%')
                )
            )
        
        # 日期过滤
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductMapping.order_date >= start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductMapping.order_date <= end_date_obj)
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(ElemeProductMapping.order_date.desc(), ElemeProductMapping.id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = [item.to_dict() for item in pagination.items]
        
        return success_response({
            'items': items,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取已映射订单失败: {str(e)}', 500)


@bp.route('/unmatched-mapping-orders', methods=['GET'])
@token_required
def get_unmatched_mapping_orders(current_user):
    """
    获取单品映射未匹配的订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - start_date: 开始日期（可选）
    - end_date: 结束日期（可选）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        
        # 构建查询
        query = ElemeProductMappingUnmatched.query.filter_by(is_deleted=False)
        
        # 日期过滤
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductMappingUnmatched.order_date >= start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeProductMappingUnmatched.order_date <= end_date_obj)
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(ElemeProductMappingUnmatched.order_date.desc(), ElemeProductMappingUnmatched.id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = [item.to_dict() for item in pagination.items]
        
        # 获取总数
        total_count = pagination.total
        
        return success_response({
            'items': items,
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取未匹配订单失败: {str(e)}', 500)


# ==================== 成本映射相关API ====================

@bp.route('/cost-mapping-status', methods=['GET'])
@token_required
def get_cost_mapping_status(current_user):
    """
    获取成本映射状态（用于日历面板显示）
    
    返回所有已映射成本的日期列表
    """
    try:
        # 获取所有不重复的订单日期
        dates = db.session.query(
            db.func.distinct(ElemeCostMapping.order_date)
        ).filter(
            ElemeCostMapping.is_deleted == False
        ).all()
        
        # 转换为日期字符串列表
        date_list = [date[0].strftime('%Y-%m-%d') for date in dates if date[0]]
        
        return success_response({
            'dates': date_list,
            'count': len(date_list)
        })
        
    except Exception as e:
        return error_response(f'获取成本映射状态失败: {str(e)}', 500)


@bp.route('/map-costs', methods=['POST'])
@token_required
def map_costs(current_user):
    """
    执行成本映射
    将单品映射数据库中的订单映射成本
    
    请求体:
    {
        "date": "2025-10-28"  # 要映射的日期
    }
    """
    try:
        data = request.get_json()
        target_date = data.get('date')
        
        if not target_date:
            return error_response('请提供要映射的日期', 400)
        
        # 验证日期格式
        try:
            date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return error_response('日期格式不正确，应为YYYY-MM-DD', 400)
        
        # 清除该日期已有的成本映射数据
        ElemeCostMapping.query.filter_by(order_date=date_obj).delete()
        ElemeCostMappingUnmatched.query.filter_by(order_date=date_obj).delete()
        db.session.commit()
        
        # 从单品映射数据库获取该日期的订单
        mapped_products = ElemeProductMapping.query.filter_by(
            order_date=date_obj,
            is_deleted=False
        ).all()
        
        if not mapped_products:
            return error_response(f'{target_date} 没有单品映射数据，请先进行单品映射', 400)
        
        mapped_count = 0
        unmatched_count = 0
        
        # 获取所有映射数据和成本数据（用于快速查询）
        product_mappings = {pm.parsed_product_name: pm.source_product_name 
                          for pm in ProductMapping.query.filter_by(is_deleted=False).all()}
        source_costs = {sc.source_product_name: float(sc.cost) 
                       for sc in SourceCostLibrary.query.filter_by(is_deleted=False).all()}
        
        for order in mapped_products:
            parsed_products = order.parsed_products or ''
            
            if not parsed_products:
                # 没有解析单品，放入未匹配
                unmatched_order = ElemeCostMappingUnmatched(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=order.product_info,
                    parsed_products=parsed_products
                )
                db.session.add(unmatched_order)
                unmatched_count += 1
                continue
            
            # 计算订单总成本
            total_cost = 0.0
            all_matched = True
            
            # 解析单品列表 (格式: 单品名_数量，例如 "经典薯条_1")
            items = [item.strip() for item in parsed_products.split(',') if item.strip()]
            
            for item in items:
                # 使用正则表达式提取单品名和数量
                # 格式: 单品名_数量 (例如: "经典薯条_1", "小份薯条_2")
                match = re.match(r'^(.+)_(\d+)$', item)
                
                if not match:
                    # 格式不匹配，无法解析
                    all_matched = False
                    break
                
                product_name = match.group(1)  # 单品名（下划线前的部分）
                quantity = int(match.group(2))  # 数量（下划线后的数字）
                
                # 在映射数据库中查找这个单品对应的源商品
                source_product = product_mappings.get(product_name)
                if not source_product:
                    # 无法找到映射
                    all_matched = False
                    break
                
                # 在源商品成本库中查找成本
                unit_cost = source_costs.get(source_product)
                if unit_cost is None:
                    # 无法找到成本
                    all_matched = False
                    break
                
                # 计算该单品的总成本：单价 × 数量
                item_total_cost = unit_cost * quantity
                total_cost += item_total_cost
            
            if all_matched:
                # 所有单品都找到了成本，创建成本映射记录
                cost_mapping = ElemeCostMapping(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    order_cost=total_cost,
                    product_info=order.product_info,
                    parsed_products=parsed_products
                )
                db.session.add(cost_mapping)
                mapped_count += 1
            else:
                # 有单品无法找到成本，放入未匹配
                unmatched_order = ElemeCostMappingUnmatched(
                    order_date=order.order_date,
                    order_id=order.order_id,
                    store_name=order.store_name,
                    order_time=order.order_time,
                    expected_income=order.expected_income,
                    product_info=order.product_info,
                    parsed_products=parsed_products
                )
                db.session.add(unmatched_order)
                unmatched_count += 1
        
        db.session.commit()
        
        return success_response({
            'message': '成本映射完成',
            'date': target_date,
            'mapped_count': mapped_count,
            'unmatched_count': unmatched_count
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'成本映射失败: {str(e)}', 500)


@bp.route('/cost-mapped-orders', methods=['GET'])
@token_required
def get_cost_mapped_orders(current_user):
    """
    获取已映射成本的订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - search: 搜索关键词（订单号、门店名称）
    - start_date: 开始日期（可选）
    - end_date: 结束日期（可选）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        
        # 构建查询
        query = ElemeCostMapping.query.filter_by(is_deleted=False)
        
        # 搜索过滤
        if search:
            query = query.filter(
                db.or_(
                    ElemeCostMapping.order_id.like(f'%{search}%'),
                    ElemeCostMapping.store_name.like(f'%{search}%')
                )
            )
        
        # 日期过滤
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeCostMapping.order_date >= start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeCostMapping.order_date <= end_date_obj)
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(ElemeCostMapping.order_date.desc(), ElemeCostMapping.id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = [item.to_dict() for item in pagination.items]
        
        # 获取总数
        total_count = pagination.total
        
        return success_response({
            'items': items,
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取成本映射订单失败: {str(e)}', 500)


@bp.route('/unmatched-cost-mapping-orders', methods=['GET'])
@token_required
def get_unmatched_cost_mapping_orders(current_user):
    """
    获取成本映射未匹配的订单列表
    
    Query参数:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20）
    - start_date: 开始日期（可选）
    - end_date: 结束日期（可选）
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        start_date = request.args.get('start_date', '').strip()
        end_date = request.args.get('end_date', '').strip()
        
        # 构建查询
        query = ElemeCostMappingUnmatched.query.filter_by(is_deleted=False)
        
        # 日期过滤
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(ElemeCostMappingUnmatched.order_date >= start_date_obj)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(ElemeCostMappingUnmatched.order_date <= end_date_obj)
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(ElemeCostMappingUnmatched.order_date.desc(), ElemeCostMappingUnmatched.id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = [item.to_dict() for item in pagination.items]
        
        # 获取总数
        total_count = pagination.total
        
        return success_response({
            'items': items,
            'total': total_count,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
        
    except Exception as e:
        return error_response(f'获取未匹配订单失败: {str(e)}', 500)


@bp.route('/manual-match-cost-mapping', methods=['POST'])
@token_required
def manual_match_cost_mapping(current_user):
    """
    手动匹配成本映射未匹配订单
    
    请求体:
    {
        "unmatched_order_id": 123,  # 未匹配订单ID
        "order_cost": 50.5          # 订单成本
    }
    """
    try:
        data = request.get_json()
        unmatched_order_id = data.get('unmatched_order_id')
        order_cost = data.get('order_cost')
        
        if not unmatched_order_id:
            return error_response('未匹配订单ID不能为空', 400)
        if order_cost is None or order_cost < 0:
            return error_response('订单成本必须大于等于0', 400)
        
        # 查询未匹配订单
        unmatched_order = ElemeCostMappingUnmatched.query.filter_by(
            id=unmatched_order_id,
            is_deleted=False
        ).first()
        
        if not unmatched_order:
            return error_response('未匹配订单不存在', 404)
        
        # 创建成本映射记录
        cost_mapping = ElemeCostMapping(
            order_date=unmatched_order.order_date,
            order_id=unmatched_order.order_id,
            store_name=unmatched_order.store_name,
            order_time=unmatched_order.order_time,
            expected_income=unmatched_order.expected_income,
            order_cost=order_cost,
            product_info=unmatched_order.product_info,
            parsed_products=unmatched_order.parsed_products
        )
        
        # 保存成本映射记录
        db.session.add(cost_mapping)
        
        # 删除未匹配订单（软删除）
        unmatched_order.is_deleted = True
        
        db.session.commit()
        
        return success_response({
            'message': '手动匹配成功',
            'cost_mapping': cost_mapping.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'手动匹配失败: {str(e)}', 500)


@bp.route('/manual-match-product-mapping', methods=['POST'])
@token_required
def manual_match_product_mapping(current_user):
    """
    手动匹配单品映射未匹配订单
    
    请求体:
    {
        "unmatched_order_id": 123,      # 未匹配订单ID
        "parsed_products": "商品1*2..."  # 解析单品
    }
    """
    try:
        data = request.get_json()
        unmatched_order_id = data.get('unmatched_order_id')
        parsed_products = data.get('parsed_products')
        
        if not unmatched_order_id:
            return error_response('未匹配订单ID不能为空', 400)
        if not parsed_products:
            return error_response('解析单品不能为空', 400)
        
        # 查询未匹配订单
        unmatched_order = ElemeProductMappingUnmatched.query.filter_by(
            id=unmatched_order_id,
            is_deleted=False
        ).first()
        
        if not unmatched_order:
            return error_response('未匹配订单不存在', 404)
        
        # 创建单品映射记录
        product_mapping = ElemeProductMapping(
            order_date=unmatched_order.order_date,
            order_id=unmatched_order.order_id,
            store_name=unmatched_order.store_name,
            order_time=unmatched_order.order_time,
            expected_income=unmatched_order.expected_income,
            product_info=unmatched_order.product_info,
            parsed_products=parsed_products
        )
        
        # 保存单品映射记录
        db.session.add(product_mapping)
        
        # 删除未匹配订单（软删除）
        unmatched_order.is_deleted = True
        
        db.session.commit()
        
        return success_response({
            'message': '手动匹配成功',
            'product_mapping': product_mapping.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'手动匹配失败: {str(e)}', 500)


# ==================== 成本看板相关API ====================

@bp.route('/dashboard/store-stats', methods=['GET'])
@token_required
def get_store_stats(current_user):
    """
    获取门店成本统计数据
    
    Query参数:
    - date: 日期（默认今天，格式：YYYY-MM-DD）
    """
    try:
        # 获取日期参数
        date_str = request.args.get('date', '').strip()
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式不正确，应为YYYY-MM-DD', 400)
        else:
            target_date = datetime.utcnow().date()
        
        # 查询该日期所有门店的成本映射数据
        cost_records = ElemeCostMapping.query.filter_by(
            order_date=target_date,
            is_deleted=False
        ).all()
        
        # 按门店分组统计
        store_stats = {}
        for record in cost_records:
            store_name = record.store_name
            if store_name not in store_stats:
                store_stats[store_name] = {
                    'store_name': store_name,
                    'total_revenue': 0.0,
                    'total_cost': 0.0,
                    'order_count': 0
                }
            
            store_stats[store_name]['total_revenue'] += float(record.expected_income or 0)
            store_stats[store_name]['total_cost'] += float(record.order_cost or 0)
            store_stats[store_name]['order_count'] += 1
        
        # 计算毛利率
        result_list = []
        for store_name, stats in store_stats.items():
            revenue = stats['total_revenue']
            cost = stats['total_cost']
            
            # 毛利率 = (总收入 - 总成本) / 总收入
            if revenue > 0:
                profit_margin = ((revenue - cost) / revenue) * 100
            else:
                profit_margin = 0.0
            
            result_list.append({
                'store_name': store_name,
                'total_revenue': round(revenue, 2),
                'total_cost': round(cost, 2),
                'profit_margin': round(profit_margin, 2),
                'order_count': stats['order_count']
            })
        
        # 按门店名排序
        result_list.sort(key=lambda x: x['store_name'])
        
        # 计算汇总数据
        total_revenue = sum(item['total_revenue'] for item in result_list)
        total_cost = sum(item['total_cost'] for item in result_list)
        total_orders = sum(item['order_count'] for item in result_list)
        
        if total_revenue > 0:
            avg_profit_margin = ((total_revenue - total_cost) / total_revenue) * 100
        else:
            avg_profit_margin = 0.0
        
        return success_response({
            'date': target_date.isoformat(),
            'stores': result_list,
            'summary': {
                'total_revenue': round(total_revenue, 2),
                'total_cost': round(total_cost, 2),
                'avg_profit_margin': round(avg_profit_margin, 2),
                'total_orders': total_orders,
                'store_count': len(result_list)
            }
        })
        
    except Exception as e:
        return error_response(f'获取门店统计数据失败: {str(e)}', 500)


@bp.route('/dashboard/store-trend', methods=['GET'])
@token_required
def get_store_trend(current_user):
    """
    获取单店毛利率趋势（近7天）
    
    Query参数:
    - store_name: 门店名称（必填）
    - days: 天数（默认7天）
    """
    try:
        store_name = request.args.get('store_name', '').strip()
        if not store_name:
            return error_response('请提供门店名称', 400)
        
        days = request.args.get('days', 7, type=int)
        if days < 1 or days > 30:
            days = 7
        
        # 计算日期范围
        end_date = datetime.utcnow().date()
        from datetime import timedelta
        start_date = end_date - timedelta(days=days - 1)
        
        # 查询该门店在日期范围内的所有订单
        cost_records = ElemeCostMapping.query.filter(
            ElemeCostMapping.store_name == store_name,
            ElemeCostMapping.order_date >= start_date,
            ElemeCostMapping.order_date <= end_date,
            ElemeCostMapping.is_deleted == False
        ).all()
        
        # 按日期分组统计
        date_stats = {}
        for record in cost_records:
            date_key = record.order_date.isoformat()
            if date_key not in date_stats:
                date_stats[date_key] = {
                    'date': date_key,
                    'total_revenue': 0.0,
                    'total_cost': 0.0,
                    'order_count': 0
                }
            
            date_stats[date_key]['total_revenue'] += float(record.expected_income or 0)
            date_stats[date_key]['total_cost'] += float(record.order_cost or 0)
            date_stats[date_key]['order_count'] += 1
        
        # 生成完整的日期序列（包括没有数据的日期）
        result_list = []
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.isoformat()
            
            if date_key in date_stats:
                stats = date_stats[date_key]
                revenue = stats['total_revenue']
                cost = stats['total_cost']
                
                if revenue > 0:
                    profit_margin = ((revenue - cost) / revenue) * 100
                else:
                    profit_margin = 0.0
                
                result_list.append({
                    'date': date_key,
                    'total_revenue': round(revenue, 2),
                    'total_cost': round(cost, 2),
                    'profit_margin': round(profit_margin, 2),
                    'order_count': stats['order_count']
                })
            else:
                # 没有数据的日期
                result_list.append({
                    'date': date_key,
                    'total_revenue': 0,
                    'total_cost': 0,
                    'profit_margin': 0,
                    'order_count': 0
                })
            
            current_date += timedelta(days=1)
        
        return success_response({
            'store_name': store_name,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'trend': result_list
        })
        
    except Exception as e:
        return error_response(f'获取门店趋势数据失败: {str(e)}', 500)


# ==================== 批量删除相关API ====================

@bp.route('/delete-integrated-orders', methods=['POST'])
@token_required
def delete_integrated_orders(current_user):
    """
    批量删除订单整合数据库中指定日期的所有订单
    
    Body参数:
    - date: 日期（格式：YYYY-MM-DD）
    """
    try:
        data = request.get_json()
        date_str = data.get('date')
        
        if not date_str:
            return error_response('请提供日期参数', 400)
        
        # 解析日期
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return error_response('日期格式错误，请使用 YYYY-MM-DD 格式', 400)
        
        # 查找该日期的所有订单
        orders = ElemeIntegratedOrder.query.filter_by(
            order_date=target_date,
            is_deleted=False
        ).all()
        
        if not orders:
            return success_response(
                data={'deleted_count': 0},
                message=f'未找到 {date_str} 的订单数据'
            )
        
        # 硬删除所有订单
        deleted_count = len(orders)
        for order in orders:
            db.session.delete(order)
        
        db.session.commit()
        
        return success_response(
            data={'deleted_count': deleted_count},
            message=f'成功删除 {deleted_count} 条订单整合数据'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除订单整合数据失败: {str(e)}', 500)


@bp.route('/delete-product-mappings', methods=['POST'])
@token_required
def delete_product_mappings(current_user):
    """
    批量删除单品映射数据库中指定日期的所有订单
    
    Body参数:
    - date: 日期（格式：YYYY-MM-DD）
    """
    try:
        data = request.get_json()
        date_str = data.get('date')
        
        if not date_str:
            return error_response('请提供日期参数', 400)
        
        # 解析日期
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return error_response('日期格式错误，请使用 YYYY-MM-DD 格式', 400)
        
        # 查找该日期的所有单品映射订单
        mappings = ElemeProductMapping.query.filter_by(
            order_date=target_date,
            is_deleted=False
        ).all()
        
        deleted_count = len(mappings)
        
        # 硬删除所有订单
        for mapping in mappings:
            db.session.delete(mapping)
        
        db.session.commit()
        
        return success_response(
            data={'deleted_count': deleted_count},
            message=f'成功删除 {deleted_count} 条单品映射数据'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除单品映射数据失败: {str(e)}', 500)


@bp.route('/delete-cost-mappings', methods=['POST'])
@token_required
def delete_cost_mappings(current_user):
    """
    批量删除成本映射数据库中指定日期的所有订单
    
    Body参数:
    - date: 日期（格式：YYYY-MM-DD）
    """
    try:
        data = request.get_json()
        date_str = data.get('date')
        
        if not date_str:
            return error_response('请提供日期参数', 400)
        
        # 解析日期
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return error_response('日期格式错误，请使用 YYYY-MM-DD 格式', 400)
        
        # 查找该日期的所有成本映射订单
        cost_mappings = ElemeCostMapping.query.filter_by(
            order_date=target_date,
            is_deleted=False
        ).all()
        
        deleted_count = len(cost_mappings)
        
        # 硬删除所有订单
        for cost_mapping in cost_mappings:
            db.session.delete(cost_mapping)
        
        db.session.commit()
        
        return success_response(
            data={'deleted_count': deleted_count},
            message=f'成功删除 {deleted_count} 条成本映射数据'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除成本映射数据失败: {str(e)}', 500)


# ==================== 编辑相关API ====================

@bp.route('/integrated-orders/<int:order_id>', methods=['PUT'])
@token_required
def update_integrated_order_record(current_user, order_id):
    """
    编辑订单整合数据
    
    Body参数:
    - order_date: 日期
    - order_id: 订单号
    - store_name: 门店名称
    - order_time: 下单时间
    - expected_income: 预计收入
    - product_info: 商品信息
    """
    try:
        data = request.get_json()
        
        # 查找订单
        order = ElemeIntegratedOrder.query.filter_by(id=order_id, is_deleted=False).first()
        if not order:
            return error_response('订单不存在', 404)
        
        # 更新字段
        if 'order_date' in data:
            try:
                order.order_date = datetime.strptime(data['order_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式错误', 400)
        
        if 'order_id' in data:
            order.order_id = data['order_id']
        
        if 'store_name' in data:
            order.store_name = data['store_name']
        
        if 'order_time' in data:
            try:
                order.order_time = datetime.strptime(data['order_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('时间格式错误', 400)
        
        if 'expected_income' in data:
            order.expected_income = float(data['expected_income'])
        
        if 'product_info' in data:
            order.product_info = data['product_info']
        
        order.updated_at = datetime.now()
        
        db.session.commit()
        
        return success_response(
            data={'order': order.to_dict()},
            message='订单更新成功'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新订单失败: {str(e)}', 500)


@bp.route('/product-mappings/<int:mapping_id>', methods=['PUT'])
@token_required
def update_product_mapping_record(current_user, mapping_id):
    """
    编辑单品映射数据
    
    Body参数:
    - order_date: 日期
    - order_id: 订单号
    - store_name: 门店名称
    - order_time: 下单时间
    - expected_income: 预计收入
    - product_info: 商品信息
    - parsed_products: 解析单品
    """
    try:
        data = request.get_json()
        
        # 查找映射记录
        mapping = ElemeProductMapping.query.filter_by(id=mapping_id, is_deleted=False).first()
        if not mapping:
            return error_response('映射记录不存在', 404)
        
        # 更新字段
        if 'order_date' in data:
            try:
                mapping.order_date = datetime.strptime(data['order_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式错误', 400)
        
        if 'order_id' in data:
            mapping.order_id = data['order_id']
        
        if 'store_name' in data:
            mapping.store_name = data['store_name']
        
        if 'order_time' in data:
            try:
                mapping.order_time = datetime.strptime(data['order_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('时间格式错误', 400)
        
        if 'expected_income' in data:
            mapping.expected_income = float(data['expected_income'])
        
        if 'product_info' in data:
            mapping.product_info = data['product_info']
        
        if 'parsed_products' in data:
            mapping.parsed_products = data['parsed_products']
        
        mapping.updated_at = datetime.now()
        
        db.session.commit()
        
        return success_response(
            data={'mapping': mapping.to_dict()},
            message='映射记录更新成功'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新映射记录失败: {str(e)}', 500)


@bp.route('/cost-mappings/<int:mapping_id>', methods=['PUT'])
@token_required
def update_cost_mapping_record(current_user, mapping_id):
    """
    编辑成本映射数据
    
    Body参数:
    - order_date: 日期
    - order_id: 订单号
    - store_name: 门店名称
    - order_time: 下单时间
    - expected_income: 预计收入
    - order_cost: 订单成本
    - product_info: 商品信息
    - parsed_products: 解析单品
    """
    try:
        data = request.get_json()
        
        # 查找成本映射记录
        cost_mapping = ElemeCostMapping.query.filter_by(id=mapping_id, is_deleted=False).first()
        if not cost_mapping:
            return error_response('成本映射记录不存在', 404)
        
        # 更新字段
        if 'order_date' in data:
            try:
                cost_mapping.order_date = datetime.strptime(data['order_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式错误', 400)
        
        if 'order_id' in data:
            cost_mapping.order_id = data['order_id']
        
        if 'store_name' in data:
            cost_mapping.store_name = data['store_name']
        
        if 'order_time' in data:
            try:
                cost_mapping.order_time = datetime.strptime(data['order_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('时间格式错误', 400)
        
        if 'expected_income' in data:
            cost_mapping.expected_income = float(data['expected_income'])
        
        if 'order_cost' in data:
            cost_mapping.order_cost = float(data['order_cost'])
        
        if 'product_info' in data:
            cost_mapping.product_info = data['product_info']
        
        if 'parsed_products' in data:
            cost_mapping.parsed_products = data['parsed_products']
        
        cost_mapping.updated_at = datetime.now()
        
        db.session.commit()
        
        return success_response(
            data={'cost_mapping': cost_mapping.to_dict()},
            message='成本映射记录更新成功'
        )
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新成本映射记录失败: {str(e)}', 500)

