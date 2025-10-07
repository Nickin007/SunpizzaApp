from flask import jsonify

def success_response(data=None, message='操作成功', code=200):
    """成功响应"""
    response = {
        'success': True,
        'code': code,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response), code

def error_response(message='操作失败', code=400, errors=None):
    """错误响应"""
    response = {
        'success': False,
        'code': code,
        'message': message
    }
    if errors:
        response['errors'] = errors
    return jsonify(response), code

def paginated_response(items, page, per_page, total, message='获取成功'):
    """分页响应"""
    return success_response(
        data={
            'items': items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        },
        message=message
    )

