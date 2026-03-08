"""
AI Chat API
全部采用流式输出（SSE），支持数据分析（Excel 上传 + Python 代码执行）
"""
from flask import Blueprint, request, Response, current_app
from app import db
from app.models import ChatConversation, ChatMessage, AgentDefinition
from app.utils.response import success_response, error_response
from app.utils.auth import token_required, admin_required
from datetime import datetime, timedelta
import requests as http_requests
import json
import traceback
import uuid
import os
import io
import re as re_module
import threading
import builtins
import pickle

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

LLM_API_KEY = 'sk-mdlutewvbzbpzsivumgmsiujwbntwxzyrxtmjxozckefoyvv'
LLM_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
LLM_MODEL = 'Pro/moonshotai/Kimi-K2.5'

UPLOAD_DIR = '/tmp/sunpizza_uploads'
SANDBOX_STATE_DIR = '/tmp/sunpizza_sandbox_state'
MAX_TOOL_ROUNDS = 25

SANDBOX_SYSTEM_KEYS = {
    '__builtins__', 'pd', 'np', 'math', 're', 'json',
    'datetime', 'timedelta', 'Counter', 'defaultdict',
    'df', 'dfs',
}


def _save_sandbox_state(conv_id, shared_globals):
    """Save user-defined variables from sandbox to disk for cross-message persistence."""
    if not shared_globals:
        return
    os.makedirs(SANDBOX_STATE_DIR, exist_ok=True)
    user_vars = {}
    skip_prefixes = ('df',)
    for key, val in shared_globals.items():
        if key in SANDBOX_SYSTEM_KEYS:
            continue
        if key.startswith('df') and key[2:].isdigit():
            continue
        if key.startswith('_'):
            continue
        try:
            pickle.dumps(val)
            user_vars[key] = val
        except Exception:
            continue
    if not user_vars:
        return
    try:
        path = os.path.join(SANDBOX_STATE_DIR, f'conv_{conv_id}.pkl')
        with open(path, 'wb') as f:
            pickle.dump(user_vars, f)
    except Exception:
        traceback.print_exc()


def _load_sandbox_state(conv_id, shared_globals):
    """Load previously saved user-defined variables into the sandbox."""
    path = os.path.join(SANDBOX_STATE_DIR, f'conv_{conv_id}.pkl')
    if not os.path.exists(path):
        return
    try:
        with open(path, 'rb') as f:
            user_vars = pickle.load(f)
        for key, val in user_vars.items():
            if key not in shared_globals:
                shared_globals[key] = val
    except Exception:
        traceback.print_exc()

SYSTEM_PROMPT = """你是圣比萨数字化平台的AI助手。你负责帮助管理员处理与公司运营相关的问题。

## 通用规则
- 回复使用 Markdown 格式
- 回答要专业、准确、有深度
- 如果你不确定某个信息，请如实告知
- 回答时请使用中文

## 数据分析规则
当用户上传了数据文件时，你拥有 `python_execute` 工具来执行 Python 代码分析数据。

**最高优先级（严格遵守）：**
- 所有数据结论必须且只能来自代码执行结果，严禁编造或猜测任何数据
- 在没有执行代码并看到输出之前，不得提及任何具体的门店名称、数字或统计值
- 如果代码执行出错，修正代码重新执行，不要猜测结果

**分析方法论（必须遵守）：**
1. **观察**：先用代码查看数据基本信息（df.shape, df.columns, df.head()），基于代码输出描述数据概况
2. **假设**：基于观察提出你要分析的方向和假设
3. **验证**：编写 Python 代码进行计算和验证，所有计算必须用代码完成，不要心算
4. **解读**：详细解读代码执行结果，只引用代码实际输出的数值和名称
5. **建议**：给出有深度的业务洞察和可行建议

**代码执行规范：**
- 可用库：pandas(pd), numpy(np), math, re, json, datetime, timedelta, Counter, defaultdict
- **变量持久化：所有变量在同一对话中永久保留（包括跨消息）。** 前一次代码中定义的变量在后续任何消息中都可以直接使用，无需重新计算。**当你需要使用之前定义过的变量时，必须先执行 `print([v for v in dir() if not v.startswith('_')])` 查看当前所有可用变量名，然后使用准确的变量名，严禁凭记忆猜测变量名。**
- 每次代码聚焦一个分析角度，不要一次性写超长代码
- 用 print() 输出结果，输出要清晰有结构
- 出错时检查列名和数据类型，修正后重试
- **每次代码执行后，必须先对执行结果进行完整的文字分析和解读，明确说明发现了什么、意味着什么，然后再决定是否需要执行下一段代码。严禁连续调用多次 python_execute 而不在中间给出分析。**

**文件变量规则：**
- 单文件时：数据加载为 `df`，可直接使用
- 多文件时：所有文件加载到 `dfs` 字典中，键为文件名，如 `dfs['销售数据.xlsx']`；同时按编号提供 `df1`, `df2`, `df3` ...（单文件时不设置 `df`，避免歧义）
- 多文件协同分析时，可使用 `pd.merge()`, `pd.concat()`, `pd.DataFrame.join()` 等进行关联
- 先用 `print(list(dfs.keys()))` 确认已加载的文件，再用 `df1.head()` 等了解各文件结构
- 所有自定义变量在同一对话中跨消息自动保留。**遇到 NameError 时，先执行 `print([v for v in dir() if not v.startswith('_')])` 确认可用变量，很可能是你记错了变量名。严禁不检查就说"变量丢失"或"需要重新加载数据"。**"""

TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'python_execute',
            'description': '执行 Python 代码分析数据。单文件时数据为 df；多文件时用 dfs 字典（键为文件名）或 df1/df2/df3。'
                           '可用库：pandas(pd), numpy(np), math, re, json, datetime。用 print() 输出结果。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'code': {
                        'type': 'string',
                        'description': '要执行的 Python 代码',
                    }
                },
                'required': ['code'],
            },
        },
    }
]

TRAINER_TOOLS = [
    {
        'type': 'function',
        'function': {
            'name': 'list_agents',
            'description': '列出系统中所有 Agent 的基本信息，包括 id、名称、层级、状态和 system_prompt 前100字预览。',
            'parameters': {'type': 'object', 'properties': {}, 'required': []},
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_agent_detail',
            'description': '获取指定 Agent 的完整配置信息，包括 system_prompt 全文。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'agent_id': {'type': 'string', 'description': 'Agent 的 id，如 strategy_ai'},
                },
                'required': ['agent_id'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'update_agent',
            'description': '更新指定 Agent 的配置字段。可更新的字段：name, description, system_prompt, status, icon, level, parent_id。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'agent_id': {'type': 'string', 'description': '要更新的 Agent id'},
                    'name': {'type': 'string', 'description': '新的显示名称'},
                    'description': {'type': 'string', 'description': '新的职责描述'},
                    'system_prompt': {'type': 'string', 'description': '新的 system_prompt 全文'},
                    'status': {'type': 'string', 'description': 'active / placeholder / disabled'},
                    'icon': {'type': 'string', 'description': '前端图标标识，如 RocketOutlined'},
                    'level': {'type': 'integer', 'description': '层级：1 或 2'},
                    'parent_id': {'type': 'string', 'description': '上级 Agent id，L1 填 null'},
                },
                'required': ['agent_id'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'create_agent',
            'description': '创建一个新的 Agent。id 必须唯一，level 只能是 1 或 2。',
            'parameters': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string', 'description': '唯一标识，如 supply_brain'},
                    'name': {'type': 'string', 'description': '显示名称，如 SupplyBrain - 供应链大脑'},
                    'level': {'type': 'integer', 'description': '层级：1 或 2'},
                    'parent_id': {'type': 'string', 'description': '上级 Agent id，L1 填 null'},
                    'description': {'type': 'string', 'description': '职责描述'},
                    'system_prompt': {'type': 'string', 'description': 'Agent 的 system_prompt'},
                    'icon': {'type': 'string', 'description': '图标标识'},
                    'status': {'type': 'string', 'description': 'active / placeholder / disabled，默认 active'},
                },
                'required': ['id', 'name', 'level'],
            },
        },
    },
]


def _handle_list_agents():
    agents = AgentDefinition.query.order_by(AgentDefinition.level, AgentDefinition.id).all()
    result = []
    for a in agents:
        prompt_preview = (a.system_prompt or '')[:100]
        if len(a.system_prompt or '') > 100:
            prompt_preview += '...'
        result.append({
            'id': a.id, 'name': a.name, 'level': a.level,
            'status': a.status, 'parent_id': a.parent_id,
            'description': a.description or '',
            'prompt_preview': prompt_preview,
        })
    return json.dumps(result, ensure_ascii=False)


def _handle_get_agent_detail(agent_id):
    agent = AgentDefinition.query.get(agent_id)
    if not agent:
        return json.dumps({'error': f'Agent "{agent_id}" 不存在'}, ensure_ascii=False)
    return json.dumps({
        'id': agent.id, 'name': agent.name, 'level': agent.level,
        'parent_id': agent.parent_id, 'status': agent.status,
        'icon': agent.icon, 'description': agent.description or '',
        'system_prompt': agent.system_prompt or '',
    }, ensure_ascii=False)


def _handle_update_agent(agent_id, **fields):
    agent = AgentDefinition.query.get(agent_id)
    if not agent:
        return json.dumps({'error': f'Agent "{agent_id}" 不存在'}, ensure_ascii=False)
    allowed = {'name', 'description', 'system_prompt', 'status', 'icon', 'level', 'parent_id'}
    updated = []
    for key, val in fields.items():
        if key in allowed and val is not None:
            setattr(agent, key, val)
            updated.append(key)
    if updated:
        db.session.commit()
    return json.dumps({
        'success': True, 'agent_id': agent_id,
        'updated_fields': updated,
        'message': f'已更新 {len(updated)} 个字段: {", ".join(updated)}' if updated else '无字段需要更新',
    }, ensure_ascii=False)


def _handle_create_agent(**kwargs):
    agent_id = kwargs.get('id')
    if not agent_id:
        return json.dumps({'error': '缺少 id 字段'}, ensure_ascii=False)
    existing = AgentDefinition.query.get(agent_id)
    if existing:
        return json.dumps({'error': f'Agent "{agent_id}" 已存在'}, ensure_ascii=False)
    level = kwargs.get('level', 2)
    if level not in (1, 2):
        return json.dumps({'error': 'level 只能是 1 或 2'}, ensure_ascii=False)
    agent = AgentDefinition(
        id=agent_id,
        name=kwargs.get('name', agent_id),
        level=level,
        parent_id=kwargs.get('parent_id'),
        description=kwargs.get('description', ''),
        system_prompt=kwargs.get('system_prompt', ''),
        icon=kwargs.get('icon', 'AppstoreOutlined'),
        status=kwargs.get('status', 'active'),
    )
    db.session.add(agent)
    db.session.commit()
    return json.dumps({
        'success': True, 'agent_id': agent_id,
        'message': f'Agent "{kwargs.get("name", agent_id)}" 创建成功 (L{level}, {agent.status})',
    }, ensure_ascii=False)


TOOL_HANDLERS = {
    'python_execute': None,
    'list_agents': lambda args: _handle_list_agents(),
    'get_agent_detail': lambda args: _handle_get_agent_detail(args['agent_id']),
    'update_agent': lambda args: _handle_update_agent(**args),
    'create_agent': lambda args: _handle_create_agent(**args),
}

HISTORY_TOKEN_BUDGET = 60000


def estimate_tokens(text):
    if not text:
        return 0
    cn_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    en_chars = len(text) - cn_chars
    return int(cn_chars * 1.5 + en_chars * 0.25)


def truncate_to_budget(entries, budget):
    result = []
    used = 0
    for entry in reversed(entries):
        content = entry.get('content') or ''
        tokens = estimate_tokens(content)
        if used + tokens > budget:
            break
        result.insert(0, entry)
        used += tokens
    return result


# ==================== 文件上传 ====================

def _get_file_meta(file_token):
    meta_path = os.path.join(UPLOAD_DIR, f"{file_token}.json")
    if not os.path.exists(meta_path):
        return None
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


@bp.route('/upload', methods=['POST'])
@admin_required
def upload_file(current_user):
    import pandas as pd

    if 'file' not in request.files:
        return error_response('没有选择文件')
    file = request.files['file']
    if not file.filename:
        return error_response('文件名为空')

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ('xlsx', 'xls', 'csv'):
        return error_response('仅支持 .xlsx, .xls, .csv 格式')

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_token = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_token}.{ext}")
    file.save(file_path)

    try:
        df = pd.read_csv(file_path) if ext == 'csv' else pd.read_excel(file_path)

        parts = [
            f"文件名: {file.filename}",
            f"数据维度: {df.shape[0]} 行 × {df.shape[1]} 列",
            f"列名: {', '.join(df.columns.tolist())}",
        ]
        dtypes_str = '\n'.join(f"  {col}: {dtype}" for col, dtype in df.dtypes.items())
        parts.append(f"数据类型:\n{dtypes_str}")

        null_counts = df.isnull().sum()
        if null_counts.any():
            null_str = ', '.join(f"{col}({cnt})" for col, cnt in null_counts.items() if cnt > 0)
            parts.append(f"空值统计: {null_str}")

        parts.append(f"前5行预览:\n{df.head(5).to_string()}")

        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            parts.append(f"数值列统计:\n{df[numeric_cols].describe().to_string()}")

        summary = '\n\n'.join(parts)

        meta = {
            'file_token': file_token,
            'filename': file.filename,
            'file_path': file_path,
            'created_at': datetime.utcnow().isoformat(),
            'summary': summary,
        }
        with open(os.path.join(UPLOAD_DIR, f"{file_token}.json"), 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False)

        return success_response({
            'file_token': file_token,
            'filename': file.filename,
            'summary': summary,
            'shape': list(df.shape),
            'columns': df.columns.tolist(),
        })
    except Exception as e:
        traceback.print_exc()
        return error_response(f'文件解析失败: {str(e)}')


# ==================== Python 沙箱 ====================

DANGEROUS_PATTERNS = [
    r'\bopen\s*\(',
]

ALLOWED_MODULES = frozenset({
    'pandas', 'numpy', 'math', 're', 'json', 'datetime', 'collections',
    'statistics', 'itertools', 'functools', 'operator', 'string',
    'decimal', 'fractions', 'random', 'copy', 'textwrap', 'csv',
})

_real_import = builtins.__import__


def _safe_import(name, *args, **kwargs):
    top_level = name.split('.')[0]
    if top_level not in ALLOWED_MODULES:
        raise ImportError(f"模块 '{name}' 不在允许列表中")
    return _real_import(name, *args, **kwargs)


def _load_dataframe(file_path):
    """根据文件扩展名加载 DataFrame。"""
    import pandas as pd
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)


def _create_sandbox_globals(file_paths=None):
    """创建可跨多次执行复用的沙箱全局环境。file_paths 为 {filename: path} 字典。"""
    import pandas as pd
    import numpy as np
    import math
    from collections import Counter, defaultdict

    safe_globals = {
        '__builtins__': {
            '__import__': _safe_import,
            'print': print,
            'len': len, 'range': range, 'int': int, 'float': float, 'str': str,
            'list': list, 'dict': dict, 'tuple': tuple, 'set': set, 'bool': bool,
            'abs': abs, 'round': round, 'min': min, 'max': max, 'sum': sum,
            'sorted': sorted, 'enumerate': enumerate, 'zip': zip,
            'map': map, 'filter': filter, 'reversed': reversed, 'any': any, 'all': all,
            'isinstance': isinstance, 'issubclass': issubclass, 'type': type,
            'hasattr': hasattr, 'getattr': getattr, 'setattr': setattr,
            'repr': repr, 'format': format, 'chr': chr, 'ord': ord,
            'hex': hex, 'oct': oct, 'bin': bin,
            'id': id, 'hash': hash, 'callable': callable, 'dir': dir,
            'iter': iter, 'next': next, 'slice': slice,
            'super': super, 'object': object,
            'True': True, 'False': False, 'None': None,
            'Exception': Exception, 'ValueError': ValueError,
            'TypeError': TypeError, 'KeyError': KeyError,
            'IndexError': IndexError, 'AttributeError': AttributeError,
            'StopIteration': StopIteration, 'RuntimeError': RuntimeError,
            'ZeroDivisionError': ZeroDivisionError, 'ImportError': ImportError,
            'frozenset': frozenset, 'bytes': bytes, 'bytearray': bytearray,
            'complex': complex, 'divmod': divmod, 'pow': pow,
        },
        'pd': pd,
        'np': np,
        'math': math,
        're': re_module,
        'json': json,
        'datetime': datetime,
        'timedelta': timedelta,
        'Counter': Counter,
        'defaultdict': defaultdict,
    }

    if file_paths:
        dfs = {}
        for i, (filename, fpath) in enumerate(file_paths.items(), 1):
            frame = _load_dataframe(fpath)
            dfs[filename] = frame
            safe_globals[f'df{i}'] = frame
        safe_globals['dfs'] = dfs
        if len(file_paths) == 1:
            safe_globals['df'] = list(dfs.values())[0]

    return safe_globals


def execute_python_sandbox(code, file_paths=None, timeout=30, shared_globals=None):
    """执行 Python 代码。file_paths 为 {filename: path} 字典。传入 shared_globals 可跨调用保留变量状态。"""
    for pattern in DANGEROUS_PATTERNS:
        if re_module.search(pattern, code):
            return {'output': '', 'error': '安全限制：检测到被禁止的操作', 'success': False}

    result = {'output': '', 'error': None, 'success': True}
    captured = io.StringIO()

    def _safe_print(*args, **kwargs):
        kwargs.pop('file', None)
        print(*args, file=captured, **kwargs)

    if shared_globals is not None:
        safe_globals = shared_globals
        safe_globals['__builtins__']['print'] = _safe_print
    else:
        try:
            safe_globals = _create_sandbox_globals(file_paths)
            safe_globals['__builtins__']['print'] = _safe_print
        except Exception as e:
            return {'output': '', 'error': f'读取文件失败: {str(e)}', 'success': False}

    def _run():
        try:
            exec(code, safe_globals)
        except Exception as e:
            result['error'] = f'{type(e).__name__}: {str(e)}'
            result['success'] = False

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        result['error'] = f'代码执行超时（{timeout}秒限制）'
        result['success'] = False

    result['output'] = captured.getvalue()
    if not result['output'] and not result['error']:
        result['output'] = '(代码执行完毕，无输出)'
    if len(result['output']) > 5000:
        result['output'] = result['output'][:5000] + '\n...(输出已截断)'

    return result


# ==================== LLM API (SiliconFlow / Kimi K2.5) ====================

def _get_agent_prompt(conversation_id):
    """从 conversation -> agent_definition 动态获取 system_prompt，回退到默认"""
    if conversation_id:
        conv = ChatConversation.query.get(conversation_id)
        if conv and conv.agent_id:
            agent = AgentDefinition.query.get(conv.agent_id)
            if agent and agent.system_prompt:
                return agent.system_prompt
    return SYSTEM_PROMPT


def assemble_context(user_id, conversation_id, user_message, excel_context=None):
    prompt = _get_agent_prompt(conversation_id)
    messages = [{'role': 'system', 'content': prompt}]

    if conversation_id:
        history = ChatMessage.query.filter_by(conversation_id=conversation_id).order_by(ChatMessage.created_at).all()
        history_dicts = [{'role': m.role, 'content': m.content}
                         for m in history if (m.msg_type or 'text') == 'text']
        history_dicts = truncate_to_budget(history_dicts, HISTORY_TOKEN_BUDGET)
        messages.extend(history_dicts)

    final_message = user_message
    if excel_context:
        final_message = f"{user_message}\n\n--- 已上传数据文件（可能包含多个文件）---\n{excel_context}"
    messages.append({'role': 'user', 'content': final_message})
    return messages


def call_llm_stream(messages, tools=None, thinking=True):
    payload = {
        'model': LLM_MODEL,
        'messages': messages,
        'stream': True,
        'temperature': 0.7,
        'max_tokens': 16384,
    }
    if not thinking:
        payload['thinking'] = {'type': 'disabled'}
    if tools:
        payload['tools'] = tools
        payload['tool_choice'] = 'auto'

    resp = http_requests.post(
        LLM_API_URL,
        headers={
            'Authorization': f'Bearer {LLM_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=600,
        stream=True,
    )
    if resp.status_code != 200:
        error_body = resp.text[:2000] if hasattr(resp, 'text') else 'N/A'
        print(f"[LLM API Error] status={resp.status_code} body={error_body}")
        print(f"[LLM API Error] messages count={len(messages)}")
        for i, m in enumerate(messages):
            role = m.get('role', '?')
            content_preview = str(m.get('content', ''))[:100]
            has_tc = 'tool_calls' in m
            print(f"  msg[{i}] role={role} has_tool_calls={has_tc} content={content_preview}")
    resp.raise_for_status()
    return resp


def call_llm_non_stream(messages):
    payload = {
        'model': LLM_MODEL,
        'messages': messages,
        'stream': False,
        'temperature': 0.7,
        'max_tokens': 8192,
    }
    resp = http_requests.post(
        LLM_API_URL,
        headers={
            'Authorization': f'Bearer {LLM_API_KEY}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=300,
    )
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']


def _make_sse_response(generator_func):
    return Response(generator_func(), mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no',
                        'Access-Control-Allow-Origin': '*',
                    })


def _parse_stream_with_tools(resp):
    """Parse LLM streaming response (OpenAI-compatible), yielding content chunks and tool call deltas."""
    full_content = ''
    full_reasoning = ''
    tool_calls = {}

    for line in resp.iter_lines():
        if not line:
            continue
        line_str = line.decode('utf-8')
        if not line_str.startswith('data: '):
            continue
        json_str = line_str[6:]
        if json_str.strip() == '[DONE]':
            break
        try:
            chunk = json.loads(json_str)
            delta = chunk['choices'][0].get('delta', {})

            reasoning = delta.get('reasoning_content', '')
            if reasoning:
                full_reasoning += reasoning
                yield ('reasoning', reasoning)

            content = delta.get('content', '')
            if content:
                full_content += content
                yield ('content', content)

            if 'tool_calls' in delta:
                for tc in delta['tool_calls']:
                    idx = tc.get('index', 0)
                    if idx not in tool_calls:
                        tool_calls[idx] = {'id': '', 'name': '', 'arguments': ''}
                    if tc.get('id'):
                        tool_calls[idx]['id'] = tc['id']
                    fn = tc.get('function', {})
                    if fn.get('name'):
                        tool_calls[idx]['name'] = fn['name']
                        yield ('tool_call_name', {'index': idx, 'name': fn['name']})
                    if fn.get('arguments') is not None:
                        tool_calls[idx]['arguments'] += fn['arguments']
                        yield ('tool_call_arg_delta', {'index': idx, 'delta': fn['arguments']})
        except (json.JSONDecodeError, KeyError, IndexError):
            continue

    if tool_calls:
        yield ('tool_calls_done', tool_calls)
    yield ('_done', {'content': full_content, 'reasoning': full_reasoning})


# ==================== 会话 API ====================

@bp.route('/conversations', methods=['GET'])
@admin_required
def list_conversations(current_user):
    convs = ChatConversation.query.filter_by(
        user_id=current_user['user_id']
    ).order_by(ChatConversation.updated_at.desc()).all()
    return success_response([c.to_dict() for c in convs])


@bp.route('/conversations', methods=['POST'])
@admin_required
def create_conversation(current_user):
    try:
        data = request.get_json() or {}
        title = data.get('title', '新对话')
        agent_id = data.get('agent_id', 'strategy_ai')
        agent = AgentDefinition.query.get(agent_id)
        if not agent or agent.status == 'disabled':
            return error_response(f'Agent "{agent_id}" 不存在或已禁用')
        conv = ChatConversation(user_id=current_user['user_id'], title=title, agent_id=agent_id)
        db.session.add(conv)
        db.session.commit()
        return success_response(conv.to_dict(), message='创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
@admin_required
def delete_conversation(current_user, conv_id):
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')
        db.session.delete(conv)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>', methods=['PATCH'])
@admin_required
def rename_conversation(current_user, conv_id):
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')
        data = request.get_json(silent=True) or {}
        title = data.get('title', '').strip()
        if title:
            conv.title = title
            db.session.commit()
        return success_response(data=conv.to_dict())
    except Exception as e:
        db.session.rollback()
        return error_response(f'重命名失败: {str(e)}')


@bp.route('/conversations/<int:conv_id>/messages', methods=['GET'])
@admin_required
def get_messages(current_user, conv_id):
    conv = ChatConversation.query.get(conv_id)
    if not conv or conv.user_id != current_user['user_id']:
        return error_response('会话不存在')
    msgs = ChatMessage.query.filter_by(conversation_id=conv_id).order_by(ChatMessage.created_at).all()
    return success_response([m.to_dict() for m in msgs])


@bp.route('/conversations/<int:conv_id>/messages', methods=['POST'])
@admin_required
def send_message(current_user, conv_id):
    """发送消息，支持文件分析，流式 SSE 返回，所有步骤透明可见。"""
    try:
        conv = ChatConversation.query.get(conv_id)
        if not conv or conv.user_id != current_user['user_id']:
            return error_response('会话不存在')

        data = request.get_json() or {}
        user_message = (data.get('content') or '').strip()
        if not user_message:
            return error_response('消息不能为空')

        file_tokens = data.get('file_tokens') or []
        if not file_tokens:
            single_token = data.get('file_token')
            if single_token:
                file_tokens = [single_token]

        file_paths = {}
        excel_contexts = []
        for ft in file_tokens:
            meta = _get_file_meta(ft)
            if not meta:
                return error_response('文件已过期，请重新上传')
            fp = meta.get('file_path')
            fn = meta.get('filename', os.path.basename(fp))
            if fp:
                file_paths[fn] = fp
            summary = meta.get('summary')
            if summary:
                excel_contexts.append(summary)

        file_meta = None
        if file_paths:
            file_meta = {'files': [{'filename': fn, 'file_path': fp} for fn, fp in file_paths.items()]}
        user_msg = ChatMessage(
            conversation_id=conv_id, role='user', content=user_message,
            meta_data=json.dumps(file_meta, ensure_ascii=False) if file_meta else None,
        )
        db.session.add(user_msg)
        db.session.commit()

        if not file_paths:
            hist_msgs = ChatMessage.query.filter_by(
                conversation_id=conv_id, role='user'
            ).order_by(ChatMessage.created_at.desc()).all()
            for hm in hist_msgs:
                if not hm.meta_data:
                    continue
                try:
                    hm_meta = json.loads(hm.meta_data)
                    files_list = hm_meta.get('files')
                    if files_list:
                        for f_info in files_list:
                            fp = f_info.get('file_path')
                            fn = f_info.get('filename', os.path.basename(fp))
                            if fp and os.path.exists(fp) and fn not in file_paths:
                                file_paths[fn] = fp
                    else:
                        fp = hm_meta.get('file_path')
                        if fp and os.path.exists(fp):
                            fn = hm_meta.get('filename', os.path.basename(fp))
                            if fn not in file_paths:
                                file_paths[fn] = fp
                except (json.JSONDecodeError, TypeError):
                    continue

        thinking = data.get('thinking', True)

        excel_context = '\n\n---\n\n'.join(excel_contexts) if excel_contexts else None
        assembled = assemble_context(current_user['user_id'], conv_id, user_message, excel_context=excel_context)
        app = current_app._get_current_object()
        is_trainer = conv.agent_id == 'trainer'
        use_tools = len(file_paths) > 0 or is_trainer

        def _save_msg(role, content, msg_type='text', metadata_dict=None):
            """实时保存一条消息到数据库。"""
            try:
                msg = ChatMessage(
                    conversation_id=conv_id, role=role, content=content or '',
                    msg_type=msg_type,
                    meta_data=json.dumps(metadata_dict, ensure_ascii=False) if metadata_dict else None,
                )
                db.session.add(msg)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                traceback.print_exc()

        def generate():
            with app.app_context():
                context = list(assembled)

                shared_globals = None
                if use_tools and file_paths:
                    try:
                        shared_globals = _create_sandbox_globals(file_paths)
                        _load_sandbox_state(conv_id, shared_globals)
                    except Exception as e:
                        yield f"data: {json.dumps({'error': f'初始化沙箱失败: {str(e)}'})}\n\n"
                        yield "data: [DONE]\n\n"
                        return

                for round_num in range(MAX_TOOL_ROUNDS):
                    try:
                        if is_trainer:
                            tools_for_round = TRAINER_TOOLS
                        elif file_paths:
                            tools_for_round = TOOLS
                        else:
                            tools_for_round = None
                        resp = call_llm_stream(context, tools=tools_for_round, thinking=thinking)
                        round_content = ''
                        round_reasoning = ''
                        round_tool_calls = None

                        tc_accumulated_args = {}
                        tc_code_sent = {}
                        tc_started = {}
                        first_streamed_tc_idx = None

                        for ev_type, ev_data in _parse_stream_with_tools(resp):
                            if ev_type == 'reasoning':
                                yield f"data: {json.dumps({'type': 'reasoning', 'content': ev_data})}\n\n"
                            elif ev_type == 'content':
                                round_content += ev_data
                                yield f"data: {json.dumps({'content': ev_data})}\n\n"
                            elif ev_type == 'tool_call_name':
                                idx = ev_data['index']
                                tc_accumulated_args[idx] = ''
                                tc_code_sent[idx] = 0
                                tc_started[idx] = False
                                if first_streamed_tc_idx is None:
                                    first_streamed_tc_idx = idx
                                    yield f"data: {json.dumps({'type': 'tool_call_start', 'name': ev_data['name']})}\n\n"
                                    tc_started[idx] = True
                            elif ev_type == 'tool_call_arg_delta':
                                idx = ev_data['index']
                                tc_accumulated_args.setdefault(idx, '')
                                tc_accumulated_args[idx] += ev_data['delta']
                                if first_streamed_tc_idx is None:
                                    first_streamed_tc_idx = idx
                                if idx == first_streamed_tc_idx:
                                    if not tc_started.get(idx):
                                        yield f"data: {json.dumps({'type': 'tool_call_start', 'name': 'python_execute'})}\n\n"
                                        tc_started[idx] = True
                                    code = None
                                    args_so_far = tc_accumulated_args[idx]
                                    for suffix in ['', '"}', '"']:
                                        try:
                                            parsed = json.loads(args_so_far + suffix)
                                            code = parsed.get('code', '')
                                            break
                                        except (json.JSONDecodeError, ValueError):
                                            continue
                                    if code is not None and len(code) > tc_code_sent.get(idx, 0):
                                        new_code = code[tc_code_sent[idx]:]
                                        tc_code_sent[idx] = len(code)
                                        yield f"data: {json.dumps({'type': 'tool_call_delta', 'code_delta': new_code})}\n\n"
                            elif ev_type == 'tool_calls_done':
                                round_tool_calls = ev_data
                                if first_streamed_tc_idx is not None and first_streamed_tc_idx in round_tool_calls:
                                    tc = round_tool_calls[first_streamed_tc_idx]
                                    if tc['name'] == 'python_execute':
                                        try:
                                            full_args = json.loads(tc['arguments'])
                                            full_code = full_args.get('code', '')
                                        except (json.JSONDecodeError, AttributeError):
                                            full_code = tc['arguments']
                                        remaining = full_code[tc_code_sent.get(first_streamed_tc_idx, 0):]
                                        if remaining:
                                            yield f"data: {json.dumps({'type': 'tool_call_delta', 'code_delta': remaining})}\n\n"
                                        yield f"data: {json.dumps({'type': 'tool_call_end', 'code': full_code})}\n\n"
                                    else:
                                        yield f"data: {json.dumps({'type': 'tool_call_end', 'code': ''})}\n\n"
                            elif ev_type == '_done':
                                round_reasoning = ev_data.get('reasoning', '')
                    except Exception as e:
                        traceback.print_exc()
                        yield f"data: {json.dumps({'error': str(e)})}\n\n"
                        break

                    if round_tool_calls and use_tools:
                        if round_content:
                            _save_msg('assistant', round_content)

                        assistant_tc_list = []
                        for idx in sorted(round_tool_calls.keys()):
                            tc = round_tool_calls[idx]
                            assistant_tc_list.append({
                                'id': tc['id'],
                                'type': 'function',
                                'function': {'name': tc['name'], 'arguments': tc['arguments']},
                            })
                        assistant_msg = {
                            'role': 'assistant',
                            'content': round_content or '',
                            'tool_calls': assistant_tc_list,
                        }
                        if round_reasoning:
                            assistant_msg['reasoning_content'] = round_reasoning
                        context.append(assistant_msg)

                        for idx in sorted(round_tool_calls.keys()):
                            tc = round_tool_calls[idx]
                            tool_name = tc['name']

                            try:
                                tc_args = json.loads(tc['arguments']) if tc['arguments'] else {}
                            except (json.JSONDecodeError, AttributeError):
                                tc_args = {}

                            if tool_name == 'python_execute':
                                code = tc_args.get('code', '') if isinstance(tc_args, dict) else tc['arguments']

                                if idx != first_streamed_tc_idx:
                                    yield f"data: {json.dumps({'type': 'tool_call_start', 'name': tool_name})}\n\n"
                                    yield f"data: {json.dumps({'type': 'tool_call_end', 'code': code})}\n\n"

                                _save_msg('assistant', code, msg_type='tool_call',
                                          metadata_dict={'tool_name': 'python_execute'})

                                exec_result = execute_python_sandbox(code, file_paths, shared_globals=shared_globals)
                                output = exec_result['output']
                                if exec_result['error']:
                                    output = f"{output}\n[错误] {exec_result['error']}" if output else f"[错误] {exec_result['error']}"

                                yield f"data: {json.dumps({'type': 'tool_result', 'output': output, 'success': exec_result['success']})}\n\n"
                                _save_msg('assistant', output, msg_type='tool_result',
                                          metadata_dict={'success': exec_result['success']})
                                context.append({
                                    'role': 'tool',
                                    'tool_call_id': tc['id'],
                                    'content': output[:3000],
                                })

                            elif tool_name in TOOL_HANDLERS and TOOL_HANDLERS[tool_name] is not None:
                                handler = TOOL_HANDLERS[tool_name]
                                if idx != first_streamed_tc_idx:
                                    yield f"data: {json.dumps({'type': 'tool_call_start', 'name': tool_name})}\n\n"
                                    yield f"data: {json.dumps({'type': 'tool_call_end', 'code': ''})}\n\n"

                                try:
                                    output = handler(tc_args)
                                except Exception as e:
                                    output = json.dumps({'error': str(e)}, ensure_ascii=False)

                                yield f"data: {json.dumps({'type': 'tool_result', 'output': output, 'success': True})}\n\n"
                                _save_msg('assistant', output, msg_type='tool_result',
                                          metadata_dict={'tool_name': tool_name})
                                context.append({
                                    'role': 'tool',
                                    'tool_call_id': tc['id'],
                                    'content': output[:3000],
                                })
                            else:
                                context.append({
                                    'role': 'tool',
                                    'tool_call_id': tc['id'],
                                    'content': f'未知工具: {tool_name}',
                                })

                        yield f"data: {json.dumps({'type': 'status', 'message': '正在分析执行结果...'})}\n\n"
                        continue
                    else:
                        if round_content:
                            _save_msg('assistant', round_content)
                        break

                if shared_globals:
                    _save_sandbox_state(conv_id, shared_globals)

                try:
                    c = db.session.get(ChatConversation, conv_id)
                    if c:
                        c.updated_at = datetime.utcnow()
                        msg_count = ChatMessage.query.filter_by(conversation_id=conv_id).count()
                        if msg_count <= 2:
                            c.title = user_message[:50]
                    db.session.commit()
                except Exception as e:
                    traceback.print_exc()

                yield "data: [DONE]\n\n"

        return _make_sse_response(generate)

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return error_response(f'发送消息失败: {str(e)}')
