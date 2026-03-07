import json
from flask import Blueprint, request
from app import db
from app.models import StoreModelTemplate, CompanyModelTemplate
from app.utils.auth import token_required
from app.utils.response import success_response, error_response

bp = Blueprint('model_test', __name__, url_prefix='/api/model-test')

from app.utils.auth import has_any_role

ALLOWED_ROLES = ('admin', 'model_operation')


def _check_role(current_user):
    if not has_any_role(current_user, *ALLOWED_ROLES):
        return error_response('无权限访问', 403)
    return None


@bp.route('/store/templates', methods=['GET'])
@token_required
def list_templates(current_user):
    err = _check_role(current_user)
    if err:
        return err
    templates = StoreModelTemplate.query.filter_by(user_id=current_user['user_id']).order_by(
        StoreModelTemplate.updated_at.desc()
    ).all()
    return success_response([t.to_dict() for t in templates])


@bp.route('/store/templates', methods=['POST'])
@token_required
def create_template(current_user):
    err = _check_role(current_user)
    if err:
        return err
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return error_response('模板名称不能为空')
    config = data.get('config', {})

    t = StoreModelTemplate(
        user_id=current_user['user_id'],
        name=name,
        config=json.dumps(config, ensure_ascii=False),
    )
    db.session.add(t)
    db.session.commit()
    return success_response(t.to_dict(), message='模板创建成功')


@bp.route('/store/templates/<int:tid>', methods=['PUT'])
@token_required
def update_template(current_user, tid):
    err = _check_role(current_user)
    if err:
        return err
    t = StoreModelTemplate.query.get(tid)
    if not t or t.user_id != current_user['user_id']:
        return error_response('模板不存在', 404)

    data = request.get_json()
    if 'name' in data and data['name']:
        t.name = data['name'].strip()
    if 'config' in data:
        t.config = json.dumps(data['config'], ensure_ascii=False)
    db.session.commit()
    return success_response(t.to_dict(), message='模板更新成功')


@bp.route('/store/templates/<int:tid>', methods=['DELETE'])
@token_required
def delete_template(current_user, tid):
    err = _check_role(current_user)
    if err:
        return err
    t = StoreModelTemplate.query.get(tid)
    if not t or t.user_id != current_user['user_id']:
        return error_response('模板不存在', 404)
    db.session.delete(t)
    db.session.commit()
    return success_response(message='模板删除成功')


# ═══ 公司模型模板 ═══

@bp.route('/company/templates', methods=['GET'])
@token_required
def list_company_templates(current_user):
    err = _check_role(current_user)
    if err:
        return err
    templates = CompanyModelTemplate.query.filter_by(user_id=current_user['user_id']).order_by(
        CompanyModelTemplate.updated_at.desc()
    ).all()
    return success_response([t.to_dict() for t in templates])


@bp.route('/company/templates', methods=['POST'])
@token_required
def create_company_template(current_user):
    err = _check_role(current_user)
    if err:
        return err
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return error_response('模板名称不能为空')
    config = data.get('config', {})
    t = CompanyModelTemplate(
        user_id=current_user['user_id'],
        name=name,
        config=json.dumps(config, ensure_ascii=False),
    )
    db.session.add(t)
    db.session.commit()
    return success_response(t.to_dict(), message='模板创建成功')


@bp.route('/company/templates/<int:tid>', methods=['DELETE'])
@token_required
def delete_company_template(current_user, tid):
    err = _check_role(current_user)
    if err:
        return err
    t = CompanyModelTemplate.query.get(tid)
    if not t or t.user_id != current_user['user_id']:
        return error_response('模板不存在', 404)
    db.session.delete(t)
    db.session.commit()
    return success_response(message='模板删除成功')
