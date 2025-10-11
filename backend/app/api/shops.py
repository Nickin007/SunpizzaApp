from flask import Blueprint, request
from app import db
from app.models import Shop, User
from app.utils.auth import token_required, admin_required
from app.utils.response import success_response, error_response, paginated_response

bp = Blueprint('shops', __name__, url_prefix='/api/shops')

@bp.route('/', methods=['GET'])
@token_required
def get_shops(current_user):
    """获取门店列表"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    regional_manager_id = request.args.get('regional_manager_id', type=int)
    
    query = Shop.query
    
    # 区域经理只能看到自己管辖的门店
    if current_user['role'] == 'regional_manager':
        query = query.filter_by(regional_manager_id=current_user['user_id'])
    elif regional_manager_id:
        query = query.filter_by(regional_manager_id=regional_manager_id)
    
    # 分页
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    shops = [shop.to_dict() for shop in pagination.items]
    
    return paginated_response(
        items=shops,
        page=page,
        per_page=per_page,
        total=pagination.total,
        message='获取门店列表成功'
    )

@bp.route('/<int:shop_id>', methods=['GET'])
@token_required
def get_shop(current_user, shop_id):
    """获取门店详情"""
    shop = Shop.query.get(shop_id)
    if not shop:
        return error_response('门店不存在', 404)
    
    # 权限检查：区域经理只能查看自己管辖的门店
    if current_user['role'] == 'regional_manager' and shop.regional_manager_id != current_user['user_id']:
        return error_response('无权访问该门店', 403)
    
    return success_response(data=shop.to_dict(), message='获取门店信息成功')

@bp.route('/', methods=['POST'])
@admin_required
def create_shop(current_user):
    """创建门店（仅管理员可操作）"""
    data = request.get_json()
    
    if not data.get('name'):
        return error_response('门店名称不能为空', 400)
    
    # 检查门店名称是否已存在
    if Shop.query.filter_by(name=data['name']).first():
        return error_response('门店名称已存在', 400)
    
    shop = Shop(
        name=data['name'],
        address=data.get('address'),
        regional_manager_id=data.get('regional_manager_id'),
        manager_id=data.get('manager_id')
    )
    
    try:
        db.session.add(shop)
        db.session.commit()
        return success_response(data=shop.to_dict(), message='门店创建成功', code=201)
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}', 500)

@bp.route('/<int:shop_id>', methods=['PUT'])
@admin_required
def update_shop(current_user, shop_id):
    """更新门店信息（仅管理员可操作）"""
    shop = Shop.query.get(shop_id)
    if not shop:
        return error_response('门店不存在', 404)
    
    data = request.get_json()
    
    if 'name' in data:
        shop.name = data['name']
    if 'address' in data:
        shop.address = data['address']
    if 'regional_manager_id' in data:
        shop.regional_manager_id = data['regional_manager_id']
    if 'manager_id' in data:
        shop.manager_id = data['manager_id']
    
    try:
        db.session.commit()
        return success_response(data=shop.to_dict(), message='门店更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}', 500)

@bp.route('/<int:shop_id>', methods=['DELETE'])
@admin_required
def delete_shop(current_user, shop_id):
    """删除门店（仅管理员可操作）"""
    shop = Shop.query.get(shop_id)
    if not shop:
        return error_response('门店不存在', 404)
    
    try:
        db.session.delete(shop)
        db.session.commit()
        return success_response(message='门店删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}', 500)

