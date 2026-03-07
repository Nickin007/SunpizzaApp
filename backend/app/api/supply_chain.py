from flask import Blueprint, request
from datetime import datetime
from decimal import Decimal
from sqlalchemy import func, or_
from app import db
from app.models import (
    ProductCategory, Product, ProductSpec, Warehouse, SCStore,
    Inventory, InventoryLog, SCOrder, SCOrderItem, User
)
from app.utils.auth import token_required, has_any_role
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('supply_chain', __name__, url_prefix='/api/sc')

SC_ADMIN_ROLES = ('admin', 'SupplyChain_operation')

def _require_roles(current_user, *roles):
    if not has_any_role(current_user, *roles):
        return error_response('权限不足', 403)
    return None


# ═══════════════ 分类 CRUD ═══════════════

@bp.route('/categories', methods=['GET'])
@token_required
def list_categories(current_user):
    tree = request.args.get('tree', '1') == '1'
    if tree:
        roots = ProductCategory.query.filter_by(parent_id=None, is_active=True) \
            .order_by(ProductCategory.sort_order).all()
        return success_response([r.to_tree() for r in roots])
    cats = ProductCategory.query.filter_by(is_active=True).order_by(ProductCategory.sort_order).all()
    return success_response([c.to_dict() for c in cats])


@bp.route('/categories', methods=['POST'])
@token_required
def create_category(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    data = request.get_json()
    cat = ProductCategory(
        name=data['name'],
        parent_id=data.get('parent_id'),
        sort_order=data.get('sort_order', 0),
    )
    db.session.add(cat)
    db.session.commit()
    return success_response(cat.to_dict(), '创建成功', 201)


@bp.route('/categories/<int:cid>', methods=['PUT'])
@token_required
def update_category(current_user, cid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    cat = ProductCategory.query.get(cid)
    if not cat:
        return error_response('分类不存在', 404)
    data = request.get_json()
    if 'name' in data: cat.name = data['name']
    if 'parent_id' in data: cat.parent_id = data['parent_id']
    if 'sort_order' in data: cat.sort_order = data['sort_order']
    if 'is_active' in data: cat.is_active = data['is_active']
    db.session.commit()
    return success_response(cat.to_dict())


@bp.route('/categories/<int:cid>', methods=['DELETE'])
@token_required
def delete_category(current_user, cid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    cat = ProductCategory.query.get(cid)
    if not cat:
        return error_response('分类不存在', 404)
    cat.is_active = False
    db.session.commit()
    return success_response(message='已删除')


# ═══════════════ 货品 CRUD ═══════════════

@bp.route('/products', methods=['GET'])
@token_required
def list_products(current_user):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category_id = request.args.get('category_id', type=int)
    keyword = request.args.get('keyword', '')
    is_active = request.args.get('is_active', type=str)

    q = Product.query
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if keyword:
        q = q.filter(Product.name.like(f'%{keyword}%'))
    if is_active is not None and is_active != '':
        q = q.filter(Product.is_active == (is_active == 'true'))

    q = q.order_by(Product.sort_order, Product.id.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [p.to_dict(include_specs=True) for p in pag.items]
    return paginated_response(items, page, per_page, pag.total)


@bp.route('/products/<int:pid>', methods=['GET'])
@token_required
def get_product(current_user, pid):
    p = Product.query.get(pid)
    if not p:
        return error_response('货品不存在', 404)
    return success_response(p.to_dict(include_specs=True))


@bp.route('/products', methods=['POST'])
@token_required
def create_product(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    data = request.get_json()
    p = Product(
        category_id=data.get('category_id'),
        name=data['name'],
        unit=data.get('unit', '个'),
        default_price=Decimal(str(data.get('default_price', 0))),
        image_url=data.get('image_url'),
        description=data.get('description'),
        is_active=data.get('is_active', True),
        sort_order=data.get('sort_order', 0),
    )
    db.session.add(p)
    db.session.flush()
    for s in data.get('specs', []):
        spec = ProductSpec(
            product_id=p.id,
            spec_name=s['spec_name'],
            spec_value=s['spec_value'],
            price_override=Decimal(str(s['price_override'])) if s.get('price_override') else None,
        )
        db.session.add(spec)
    db.session.commit()
    return success_response(p.to_dict(include_specs=True), '创建成功', 201)


@bp.route('/products/<int:pid>', methods=['PUT'])
@token_required
def update_product(current_user, pid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    p = Product.query.get(pid)
    if not p:
        return error_response('货品不存在', 404)
    data = request.get_json()
    for field in ('name', 'unit', 'image_url', 'description', 'is_active', 'sort_order', 'category_id'):
        if field in data:
            setattr(p, field, data[field])
    if 'default_price' in data:
        p.default_price = Decimal(str(data['default_price']))
    if 'specs' in data:
        ProductSpec.query.filter_by(product_id=pid).delete()
        for s in data['specs']:
            spec = ProductSpec(
                product_id=pid,
                spec_name=s['spec_name'],
                spec_value=s['spec_value'],
                price_override=Decimal(str(s['price_override'])) if s.get('price_override') else None,
            )
            db.session.add(spec)
    db.session.commit()
    return success_response(p.to_dict(include_specs=True))


@bp.route('/products/<int:pid>', methods=['DELETE'])
@token_required
def delete_product(current_user, pid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    p = Product.query.get(pid)
    if not p:
        return error_response('货品不存在', 404)
    p.is_active = False
    db.session.commit()
    return success_response(message='已下架')


# ═══════════════ 仓库 CRUD ═══════════════

@bp.route('/warehouses', methods=['GET'])
@token_required
def list_warehouses(current_user):
    q = Warehouse.query.filter_by(is_active=True).order_by(Warehouse.id)
    return success_response([w.to_dict() for w in q])


@bp.route('/warehouses', methods=['POST'])
@token_required
def create_warehouse(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    data = request.get_json()
    w = Warehouse(
        name=data['name'], address=data.get('address'),
        contact_name=data.get('contact_name'), contact_phone=data.get('contact_phone'),
        admin_user_id=data.get('admin_user_id'),
    )
    db.session.add(w)
    db.session.commit()
    return success_response(w.to_dict(), '创建成功', 201)


@bp.route('/warehouses/<int:wid>', methods=['PUT'])
@token_required
def update_warehouse(current_user, wid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    w = Warehouse.query.get(wid)
    if not w:
        return error_response('仓库不存在', 404)
    data = request.get_json()
    for f in ('name', 'address', 'contact_name', 'contact_phone', 'admin_user_id', 'is_active'):
        if f in data: setattr(w, f, data[f])
    db.session.commit()
    return success_response(w.to_dict())


@bp.route('/warehouses/<int:wid>', methods=['DELETE'])
@token_required
def delete_warehouse(current_user, wid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    w = Warehouse.query.get(wid)
    if not w:
        return error_response('仓库不存在', 404)
    w.is_active = False
    db.session.commit()
    return success_response(message='已删除')


# ═══════════════ 门店 CRUD ═══════════════

@bp.route('/stores', methods=['GET'])
@token_required
def list_stores(current_user):
    q = SCStore.query.filter_by(is_active=True).order_by(SCStore.id)
    return success_response([s.to_dict() for s in q])


@bp.route('/stores', methods=['POST'])
@token_required
def create_store(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    data = request.get_json()
    s = SCStore(
        name=data['name'], address=data.get('address'),
        contact_name=data.get('contact_name'), contact_phone=data.get('contact_phone'),
        warehouse_id=data.get('warehouse_id'),
        manager_user_id=data.get('manager_user_id'),
    )
    db.session.add(s)
    db.session.commit()
    return success_response(s.to_dict(), '创建成功', 201)


@bp.route('/stores/<int:sid>', methods=['PUT'])
@token_required
def update_store(current_user, sid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    s = SCStore.query.get(sid)
    if not s:
        return error_response('门店不存在', 404)
    data = request.get_json()
    for f in ('name', 'address', 'contact_name', 'contact_phone', 'warehouse_id', 'manager_user_id', 'is_active'):
        if f in data: setattr(s, f, data[f])
    db.session.commit()
    return success_response(s.to_dict())


@bp.route('/stores/<int:sid>', methods=['DELETE'])
@token_required
def delete_store(current_user, sid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    s = SCStore.query.get(sid)
    if not s:
        return error_response('门店不存在', 404)
    s.is_active = False
    db.session.commit()
    return success_response(message='已删除')


# ═══════════════ 门店订货 (店长端) ═══════════════

@bp.route('/shop/products', methods=['GET'])
@token_required
def shop_list_products(current_user):
    """门店浏览可订购货品"""
    category_id = request.args.get('category_id', type=int)
    keyword = request.args.get('keyword', '')

    q = Product.query.filter_by(is_active=True)
    if category_id:
        q = q.filter(Product.category_id == category_id)
    if keyword:
        q = q.filter(Product.name.like(f'%{keyword}%'))
    q = q.order_by(Product.sort_order, Product.id)
    products = q.all()
    return success_response([p.to_dict(include_specs=True) for p in products])


@bp.route('/shop/orders', methods=['POST'])
@token_required
def shop_create_order(current_user):
    """门店提交订单"""
    if not has_any_role(current_user, 'admin', 'SupplyChain_operation', 'store_manager'):
        return error_response('权限不足', 403)

    data = request.get_json()
    items_data = data.get('items', [])
    if not items_data:
        return error_response('订单不能为空')

    store = SCStore.query.filter_by(manager_user_id=current_user['user_id'], is_active=True).first()
    if not store and has_any_role(current_user, *SC_ADMIN_ROLES):
        store_id = data.get('store_id')
        if store_id:
            store = SCStore.query.get(store_id)
    if not store:
        return error_response('未绑定门店')
    if not store.warehouse_id:
        return error_response('门店未绑定仓库')

    order_no = f"SC{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{store.id:04d}"
    order = SCOrder(
        order_no=order_no, store_id=store.id,
        warehouse_id=store.warehouse_id,
        creator_id=current_user['user_id'],
        remark=data.get('remark', ''),
    )
    db.session.add(order)
    db.session.flush()

    total = Decimal('0')
    for it in items_data:
        product = Product.query.get(it['product_id'])
        if not product:
            db.session.rollback()
            return error_response(f"货品ID {it['product_id']} 不存在")
        spec = None
        spec_info = None
        unit_price = product.default_price
        if it.get('product_spec_id'):
            spec = ProductSpec.query.get(it['product_spec_id'])
            if spec:
                spec_info = f"{spec.spec_name}:{spec.spec_value}"
                if spec.price_override is not None:
                    unit_price = spec.price_override
        qty = Decimal(str(it['quantity']))
        subtotal = unit_price * qty
        total += subtotal
        item = SCOrderItem(
            order_id=order.id, product_id=product.id,
            product_spec_id=it.get('product_spec_id'),
            product_name=product.name, spec_info=spec_info,
            unit_price=unit_price, quantity=qty, subtotal=subtotal,
        )
        db.session.add(item)
    order.total_amount = total
    db.session.commit()
    return success_response(order.to_dict(include_items=True), '下单成功', 201)


@bp.route('/shop/orders', methods=['GET'])
@token_required
def shop_list_orders(current_user):
    """门店订单历史"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', '')

    store = SCStore.query.filter_by(manager_user_id=current_user['user_id'], is_active=True).first()
    if not store and has_any_role(current_user, *SC_ADMIN_ROLES):
        store_id = request.args.get('store_id', type=int)
        if store_id:
            store = SCStore.query.get(store_id)

    q = SCOrder.query
    if store:
        q = q.filter(SCOrder.store_id == store.id)
    elif not has_any_role(current_user, *SC_ADMIN_ROLES):
        return success_response({'items': [], 'total': 0, 'page': 1, 'per_page': per_page, 'pages': 0})

    if status:
        q = q.filter(SCOrder.status == status)
    q = q.order_by(SCOrder.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [o.to_dict() for o in pag.items]
    return paginated_response(items, page, per_page, pag.total)


@bp.route('/shop/orders/<int:oid>', methods=['GET'])
@token_required
def shop_order_detail(current_user, oid):
    order = SCOrder.query.get(oid)
    if not order:
        return error_response('订单不存在', 404)
    return success_response(order.to_dict(include_items=True))


# ═══════════════ 管理员订单管理 ═══════════════

@bp.route('/admin/orders', methods=['GET'])
@token_required
def admin_list_orders(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', '')
    store_id = request.args.get('store_id', type=int)

    q = SCOrder.query
    if status:
        q = q.filter(SCOrder.status == status)
    if store_id:
        q = q.filter(SCOrder.store_id == store_id)
    q = q.order_by(SCOrder.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [o.to_dict() for o in pag.items]
    return paginated_response(items, page, per_page, pag.total)


@bp.route('/admin/orders/<int:oid>/approve', methods=['PUT'])
@token_required
def admin_approve_order(current_user, oid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    order = SCOrder.query.get(oid)
    if not order:
        return error_response('订单不存在', 404)
    if order.status != 'pending':
        return error_response('订单状态不允许审核')
    order.status = 'approved'
    order.reviewer_id = current_user['user_id']
    order.reviewed_at = datetime.utcnow()
    db.session.commit()
    return success_response(order.to_dict(), '已通过')


@bp.route('/admin/orders/<int:oid>/reject', methods=['PUT'])
@token_required
def admin_reject_order(current_user, oid):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err
    order = SCOrder.query.get(oid)
    if not order:
        return error_response('订单不存在', 404)
    if order.status != 'pending':
        return error_response('订单状态不允许拒绝')
    data = request.get_json() or {}
    order.status = 'rejected'
    order.reviewer_id = current_user['user_id']
    order.reviewed_at = datetime.utcnow()
    order.reject_reason = data.get('reject_reason', '')
    db.session.commit()
    return success_response(order.to_dict(), '已拒绝')


# ═══════════════ 仓库发货 ═══════════════

@bp.route('/warehouse/orders', methods=['GET'])
@token_required
def warehouse_list_orders(current_user):
    """仓库待发货订单"""
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'approved')

    q = SCOrder.query
    if has_any_role(current_user, 'warehouse_admin'):
        wh = Warehouse.query.filter_by(admin_user_id=current_user['user_id']).first()
        if wh:
            q = q.filter(SCOrder.warehouse_id == wh.id)
        else:
            return success_response({'items': [], 'total': 0, 'page': 1, 'per_page': per_page, 'pages': 0})

    if status:
        q = q.filter(SCOrder.status == status)
    q = q.order_by(SCOrder.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [o.to_dict(include_items=True) for o in pag.items]
    return paginated_response(items, page, per_page, pag.total)


@bp.route('/warehouse/orders/<int:oid>/ship', methods=['PUT'])
@token_required
def warehouse_ship_order(current_user, oid):
    """仓库确认发货"""
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)
    order = SCOrder.query.get(oid)
    if not order:
        return error_response('订单不存在', 404)
    if order.status != 'approved':
        return error_response('订单状态不允许发货')

    data = request.get_json() or {}
    order.status = 'shipped'
    order.shipped_at = datetime.utcnow()
    order.shipper_id = current_user['user_id']
    order.tracking_no = data.get('tracking_no', '')

    for item in order.items:
        inv = Inventory.query.filter_by(
            warehouse_id=order.warehouse_id,
            product_id=item.product_id,
            product_spec_id=item.product_spec_id,
        ).first()
        if inv:
            inv.quantity = inv.quantity - item.quantity
            after_qty = inv.quantity
        else:
            after_qty = Decimal('0')
        log = InventoryLog(
            warehouse_id=order.warehouse_id,
            product_id=item.product_id,
            product_spec_id=item.product_spec_id,
            change_qty=-item.quantity, after_qty=after_qty,
            log_type='order_out', reason=f'订单{order.order_no}发货',
            order_id=order.id, operator_id=current_user['user_id'],
        )
        db.session.add(log)

    db.session.commit()
    return success_response(order.to_dict(), '发货成功')


# ═══════════════ 库存管理 ═══════════════

@bp.route('/inventory', methods=['GET'])
@token_required
def list_inventory(current_user):
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)

    warehouse_id = request.args.get('warehouse_id', type=int)
    product_id = request.args.get('product_id', type=int)
    low_stock = request.args.get('low_stock', '') == 'true'

    q = Inventory.query
    if has_any_role(current_user, 'warehouse_admin'):
        wh = Warehouse.query.filter_by(admin_user_id=current_user['user_id']).first()
        if wh:
            q = q.filter(Inventory.warehouse_id == wh.id)
    elif warehouse_id:
        q = q.filter(Inventory.warehouse_id == warehouse_id)
    if product_id:
        q = q.filter(Inventory.product_id == product_id)

    items = q.all()
    result = [i.to_dict() for i in items]
    if low_stock:
        result = [r for r in result if r['is_low']]
    return success_response(result)


@bp.route('/inventory/adjust', methods=['POST'])
@token_required
def adjust_inventory(current_user):
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)
    data = request.get_json()
    warehouse_id = data['warehouse_id']
    product_id = data['product_id']
    product_spec_id = data.get('product_spec_id')
    change_qty = Decimal(str(data['change_qty']))
    reason = data.get('reason', '手动调整')

    inv = Inventory.query.filter_by(
        warehouse_id=warehouse_id, product_id=product_id, product_spec_id=product_spec_id,
    ).first()
    if not inv:
        inv = Inventory(
            warehouse_id=warehouse_id, product_id=product_id,
            product_spec_id=product_spec_id, quantity=0, safety_stock=0,
        )
        db.session.add(inv)
        db.session.flush()
    inv.quantity = inv.quantity + change_qty

    log = InventoryLog(
        warehouse_id=warehouse_id, product_id=product_id,
        product_spec_id=product_spec_id,
        change_qty=change_qty, after_qty=inv.quantity,
        log_type='adjust', reason=reason,
        operator_id=current_user['user_id'],
    )
    db.session.add(log)
    db.session.commit()
    return success_response(inv.to_dict(), '调整成功')


@bp.route('/inventory/batch-init', methods=['POST'])
@token_required
def batch_init_inventory(current_user):
    """批量初始化库存（当新增货品后为仓库初始化库存记录）"""
    err = _require_roles(current_user, *SC_ADMIN_ROLES, 'warehouse_admin')
    if err: return err
    data = request.get_json()
    warehouse_id = data['warehouse_id']
    items = data.get('items', [])
    for it in items:
        inv = Inventory.query.filter_by(
            warehouse_id=warehouse_id, product_id=it['product_id'],
            product_spec_id=it.get('product_spec_id'),
        ).first()
        if not inv:
            inv = Inventory(
                warehouse_id=warehouse_id, product_id=it['product_id'],
                product_spec_id=it.get('product_spec_id'),
                quantity=Decimal(str(it.get('quantity', 0))),
                safety_stock=Decimal(str(it.get('safety_stock', 0))),
            )
            db.session.add(inv)
        else:
            if 'quantity' in it:
                inv.quantity = Decimal(str(it['quantity']))
            if 'safety_stock' in it:
                inv.safety_stock = Decimal(str(it['safety_stock']))
    db.session.commit()
    return success_response(message='初始化完成')


@bp.route('/inventory/logs', methods=['GET'])
@token_required
def list_inventory_logs(current_user):
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    warehouse_id = request.args.get('warehouse_id', type=int)
    product_id = request.args.get('product_id', type=int)

    q = InventoryLog.query
    if has_any_role(current_user, 'warehouse_admin'):
        wh = Warehouse.query.filter_by(admin_user_id=current_user['user_id']).first()
        if wh:
            q = q.filter(InventoryLog.warehouse_id == wh.id)
    elif warehouse_id:
        q = q.filter(InventoryLog.warehouse_id == warehouse_id)
    if product_id:
        q = q.filter(InventoryLog.product_id == product_id)
    q = q.order_by(InventoryLog.created_at.desc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    items = [l.to_dict() for l in pag.items]
    return paginated_response(items, page, per_page, pag.total)


# ═══════════════ 报表 ═══════════════

@bp.route('/reports/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    if not has_any_role(current_user, *SC_ADMIN_ROLES, 'warehouse_admin'):
        return error_response('权限不足', 403)

    pending_count = SCOrder.query.filter_by(status='pending').count()
    approved_count = SCOrder.query.filter_by(status='approved').count()

    low_stock_count = 0
    inv_all = Inventory.query.all()
    for inv in inv_all:
        if float(inv.quantity) <= float(inv.safety_stock):
            low_stock_count += 1

    today = datetime.utcnow().date()
    today_orders = SCOrder.query.filter(
        func.date(SCOrder.created_at) == today
    ).count()

    recent_orders = SCOrder.query.order_by(SCOrder.created_at.desc()).limit(10).all()

    return success_response({
        'pending_count': pending_count,
        'approved_count': approved_count,
        'low_stock_count': low_stock_count,
        'today_orders': today_orders,
        'recent_orders': [o.to_dict() for o in recent_orders],
    })


@bp.route('/reports/order-summary', methods=['GET'])
@token_required
def order_summary(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err

    start = request.args.get('start_date', '')
    end = request.args.get('end_date', '')

    q = SCOrder.query
    if start:
        q = q.filter(SCOrder.created_at >= start)
    if end:
        q = q.filter(SCOrder.created_at <= end + ' 23:59:59')

    orders = q.all()
    total_amount = sum(float(o.total_amount) for o in orders)
    status_counts = {}
    for o in orders:
        status_counts[o.status] = status_counts.get(o.status, 0) + 1

    store_summary = {}
    for o in orders:
        sn = o.store.name if o.store else '未知'
        if sn not in store_summary:
            store_summary[sn] = {'count': 0, 'amount': 0}
        store_summary[sn]['count'] += 1
        store_summary[sn]['amount'] += float(o.total_amount)

    return success_response({
        'total_orders': len(orders),
        'total_amount': round(total_amount, 2),
        'status_counts': status_counts,
        'store_summary': store_summary,
    })


@bp.route('/reports/export', methods=['GET'])
@token_required
def export_orders(current_user):
    err = _require_roles(current_user, *SC_ADMIN_ROLES)
    if err: return err

    import pandas as pd
    from flask import Response
    import io

    start = request.args.get('start_date', '')
    end = request.args.get('end_date', '')

    q = SCOrder.query
    if start:
        q = q.filter(SCOrder.created_at >= start)
    if end:
        q = q.filter(SCOrder.created_at <= end + ' 23:59:59')
    orders = q.order_by(SCOrder.created_at.desc()).all()

    rows = []
    for o in orders:
        for item in o.items:
            rows.append({
                '订单号': o.order_no,
                '门店': o.store.name if o.store else '',
                '状态': o.status,
                '货品': item.product_name,
                '规格': item.spec_info or '',
                '单价': float(item.unit_price),
                '数量': float(item.quantity),
                '小计': float(item.subtotal),
                '下单时间': o.created_at.strftime('%Y-%m-%d %H:%M') if o.created_at else '',
            })
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    df.to_excel(output, index=False, engine='openpyxl')
    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=orders_export.xlsx'}
    )
