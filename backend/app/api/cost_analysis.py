"""
饿了么成本分析相关API
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models import ElemeActiveStore, SourceCostLibrary, ProductMapping
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response
from datetime import datetime

bp = Blueprint('cost_analysis', __name__, url_prefix='/api/cost-analysis')


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
    - search: 搜索关键词（源商品名称或SKU）
    - category: 类别筛选
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        category = request.args.get('category', '').strip()
        
        # 构建查询
        query = SourceCostLibrary.query.filter_by(is_deleted=False)
        
        # 搜索过滤
        if search:
            query = query.filter(
                db.or_(
                    SourceCostLibrary.source_product_name.like(f'%{search}%'),
                    SourceCostLibrary.source_product_sku.like(f'%{search}%')
                )
            )
        
        # 类别过滤
        if category:
            query = query.filter_by(category=category)
        
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
    - source_product_sku: 源商品SKU（必填）
    - category: 类别（可选）
    - cost: 成本（必填）
    """
    try:
        data = request.get_json()
        source_product_name = data.get('source_product_name', '').strip()
        source_product_sku = data.get('source_product_sku', '').strip()
        category = data.get('category', '').strip() or None
        cost = data.get('cost')
        
        if not source_product_name:
            return error_response('源商品名称不能为空', 400)
        if not source_product_sku:
            return error_response('源商品SKU不能为空', 400)
        if cost is None or cost < 0:
            return error_response('成本必须大于等于0', 400)
        
        # 检查SKU是否已存在
        existing = SourceCostLibrary.query.filter_by(
            source_product_sku=source_product_sku,
            is_deleted=False
        ).first()
        if existing:
            return error_response('该SKU已存在', 400)
        
        # 创建新记录
        new_item = SourceCostLibrary(
            source_product_name=source_product_name,
            source_product_sku=source_product_sku,
            category=category,
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
    - source_product_sku: 源商品SKU（可选）
    - category: 类别（可选）
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
            item.source_product_name = new_name
        
        # 更新SKU
        if 'source_product_sku' in data:
            new_sku = data['source_product_sku'].strip()
            if not new_sku:
                return error_response('源商品SKU不能为空', 400)
            
            # 检查SKU是否与其他记录重复
            if new_sku != item.source_product_sku:
                existing = SourceCostLibrary.query.filter_by(
                    source_product_sku=new_sku,
                    is_deleted=False
                ).first()
                if existing:
                    return error_response('该SKU已存在', 400)
                item.source_product_sku = new_sku
        
        # 更新类别
        if 'category' in data:
            item.category = data['category'].strip() or None
        
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


@bp.route('/source-cost-library/categories', methods=['GET'])
@token_required
def get_source_cost_categories(current_user):
    """
    获取所有类别列表
    """
    try:
        categories = db.session.query(SourceCostLibrary.category).filter(
            SourceCostLibrary.is_deleted == False,
            SourceCostLibrary.category.isnot(None)
        ).distinct().all()
        
        return success_response({
            'categories': [cat[0] for cat in categories if cat[0]]
        })
        
    except Exception as e:
        return error_response(f'获取类别列表失败: {str(e)}', 500)


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
                    ProductMapping.source_product_name.like(f'%{search}%'),
                    ProductMapping.source_product_sku.like(f'%{search}%')
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
    - source_product_sku: 映射源商品SKU（必填）
    """
    try:
        data = request.get_json()
        parsed_product_name = data.get('parsed_product_name', '').strip()
        source_product_name = data.get('source_product_name', '').strip()
        source_product_sku = data.get('source_product_sku', '').strip()
        
        if not parsed_product_name:
            return error_response('拆解单品名称不能为空', 400)
        if not source_product_name:
            return error_response('映射源商品名称不能为空', 400)
        if not source_product_sku:
            return error_response('映射源商品SKU不能为空', 400)
        
        # 检查拆解单品名称是否已存在
        existing = ProductMapping.query.filter_by(
            parsed_product_name=parsed_product_name,
            is_deleted=False
        ).first()
        if existing:
            return error_response('该拆解单品已存在映射', 400)
        
        # 检查源商品SKU是否存在于源商品成本库
        source_product = SourceCostLibrary.query.filter_by(
            source_product_sku=source_product_sku,
            is_deleted=False
        ).first()
        if not source_product:
            return error_response('源商品SKU不存在，请先在源商品成本库中添加', 400)
        
        # 创建新映射
        new_mapping = ProductMapping(
            parsed_product_name=parsed_product_name,
            source_product_name=source_product_name,
            source_product_sku=source_product_sku
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
    - source_product_sku: 映射源商品SKU（可选）
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
            mapping.source_product_name = new_source_name
        
        # 更新映射源商品SKU
        if 'source_product_sku' in data:
            new_sku = data['source_product_sku'].strip()
            if not new_sku:
                return error_response('映射源商品SKU不能为空', 400)
            
            # 检查源商品SKU是否存在于源商品成本库
            source_product = SourceCostLibrary.query.filter_by(
                source_product_sku=new_sku,
                is_deleted=False
            ).first()
            if not source_product:
                return error_response('源商品SKU不存在，请先在源商品成本库中添加', 400)
            
            mapping.source_product_sku = new_sku
        
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

