"""Agent 定义 API — 提供 Agent 树形列表查询"""
from flask import Blueprint, request
from app import db
from app.api.users import admin_required, success_response, error_response
from app.models import AgentDefinition

bp = Blueprint('agents', __name__, url_prefix='/api/agents')


@bp.route('', methods=['GET'])
@admin_required
def list_agents(current_user):
    """返回所有 Agent（按 level 排序），前端自行构建树结构"""
    agents = AgentDefinition.query.order_by(AgentDefinition.level, AgentDefinition.id).all()
    return success_response([a.to_dict() for a in agents])


@bp.route('/tree', methods=['GET'])
@admin_required
def agent_tree(current_user):
    """返回 Agent 树形结构（L1 -> L2 -> L3）"""
    agents = AgentDefinition.query.order_by(AgentDefinition.level, AgentDefinition.id).all()
    agent_map = {a.id: {**a.to_dict(), 'children': []} for a in agents}

    roots = []
    for a in agents:
        node = agent_map[a.id]
        if a.parent_id and a.parent_id in agent_map:
            agent_map[a.parent_id]['children'].append(node)
        else:
            roots.append(node)
    return success_response(roots)
