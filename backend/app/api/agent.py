"""
Agent 记忆文件系统 API
实现 Cursor 风格的 md 文件记忆体系：
- /api/agent/files/*  文件 CRUD
- /api/agent/vector/* 向量搜索
- 自动记忆提炼（后台静默运行）
"""
from flask import Blueprint, request
from app import db
from app.models import MemoryFile, ChatMessage, CORE_MEMORY_FILES
from app.utils.response import success_response, error_response
from app.utils.auth import admin_required
from datetime import datetime
import requests as http_requests
import json
import math
import traceback

bp = Blueprint('agent', __name__, url_prefix='/api/agent')

# SiliconFlow Embedding API 配置
SILICONFLOW_API_KEY = 'sk-mdlutewvbzbpzsivumgmsiujwbntwxzyrxtmjxozckefoyvv'
SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/embeddings'
EMBEDDING_MODEL = 'BAAI/bge-m3'


# ==================== Embedding 工具函数 ====================

def generate_embedding(text):
    """调用 SiliconFlow API 生成文本向量嵌入"""
    if not text or not text.strip():
        return None
    try:
        resp = http_requests.post(
            SILICONFLOW_API_URL,
            headers={
                'Authorization': f'Bearer {SILICONFLOW_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': EMBEDDING_MODEL,
                'input': text[:2000],  # 截断过长文本
                'encoding_format': 'float',
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['data'][0]['embedding']
    except Exception as e:
        print(f"[Embedding Error] {e}")
        traceback.print_exc()
        return None


def cosine_similarity(vec_a, vec_b):
    """计算两个向量的余弦相似度"""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def search_memory_files(user_id, query_text, top_k=5, exclude_always_load=True):
    """向量搜索记忆文件，返回最相关的 top_k 个文件"""
    query_embedding = generate_embedding(query_text)
    if not query_embedding:
        return []

    query = MemoryFile.query.filter_by(user_id=user_id).filter(
        MemoryFile.embedding.isnot(None),
        MemoryFile.content != '',
    )
    if exclude_always_load:
        query = query.filter_by(always_load=False)

    files = query.all()
    scored = []
    for f in files:
        try:
            file_embedding = json.loads(f.embedding)
            sim = cosine_similarity(query_embedding, file_embedding)
            if sim > 0.3:  # 相似度阈值
                scored.append((f, sim))
        except (json.JSONDecodeError, TypeError):
            continue

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]


def ensure_core_files(user_id):
    """确保核心记忆文件存在，不存在则自动创建"""
    for core in CORE_MEMORY_FILES:
        existing = MemoryFile.query.filter_by(
            user_id=user_id, file_key=core['file_key']
        ).first()
        if not existing:
            mf = MemoryFile(
                user_id=user_id,
                file_key=core['file_key'],
                title=core['title'],
                content=core['content'],
                always_load=core['always_load'],
                is_core=core['is_core'],
            )
            db.session.add(mf)
    db.session.commit()


# ==================== 文件 CRUD API ====================

@bp.route('/files/tree', methods=['GET'])
@admin_required
def get_file_tree(current_user):
    """获取记忆文件目录树（兼容前端 FileNode 结构）"""
    user_id = current_user['user_id']
    ensure_core_files(user_id)

    files = MemoryFile.query.filter_by(user_id=user_id).order_by(MemoryFile.file_key).all()

    # 构建虚拟文件树
    tree = {'name': 'root', 'type': 'directory', 'path': '', 'children': []}
    dir_map = {'': tree}

    for f in files:
        parts = f.file_key.split('/')
        # 确保目录节点存在
        current_path = ''
        for i, part in enumerate(parts[:-1]):
            parent_path = current_path
            current_path = f"{current_path}/{part}" if current_path else part
            if current_path not in dir_map:
                dir_node = {'name': part, 'type': 'directory', 'path': current_path, 'children': []}
                dir_map[current_path] = dir_node
                dir_map[parent_path]['children'].append(dir_node)

        # 添加文件节点
        file_node = {
            'name': parts[-1],
            'type': 'file',
            'path': f.file_key,
            'size': len(f.content.encode('utf-8')) if f.content else 0,
        }
        parent_dir = '/'.join(parts[:-1])
        if parent_dir in dir_map:
            dir_map[parent_dir]['children'].append(file_node)
        else:
            tree['children'].append(file_node)

    return success_response(tree)


@bp.route('/files/list', methods=['GET'])
@admin_required
def list_memory_files(current_user):
    """获取所有非核心记忆文件的扁平列表（长期记忆）"""
    user_id = current_user['user_id']
    files = MemoryFile.query.filter_by(user_id=user_id, is_core=False).order_by(
        MemoryFile.updated_at.desc()
    ).all()

    return success_response([
        {
            'file_key': f.file_key,
            'title': f.title,
            'size': len(f.content.encode('utf-8')) if f.content else 0,
            'has_embedding': f.embedding is not None,
            'source_conversation_id': f.source_conversation_id,
            'created_at': f.created_at.isoformat() if f.created_at else None,
            'updated_at': f.updated_at.isoformat() if f.updated_at else None,
        }
        for f in files
    ])


@bp.route('/files', methods=['GET'])
@admin_required
def read_file(current_user):
    """读取记忆文件内容"""
    user_id = current_user['user_id']
    file_key = request.args.get('path', '')
    if not file_key:
        return error_response('请提供文件路径')

    ensure_core_files(user_id)
    mf = MemoryFile.query.filter_by(user_id=user_id, file_key=file_key).first()
    if not mf:
        return error_response('文件不存在')

    return success_response({'content': mf.content, 'file_key': mf.file_key, 'title': mf.title})


@bp.route('/files', methods=['PUT'])
@admin_required
def update_file(current_user):
    """更新记忆文件内容（自动重新生成 embedding）"""
    user_id = current_user['user_id']
    file_key = request.args.get('path', '')
    if not file_key:
        return error_response('请提供文件路径')

    data = request.get_json()
    content = data.get('content', '')

    mf = MemoryFile.query.filter_by(user_id=user_id, file_key=file_key).first()
    if not mf:
        return error_response('文件不存在')

    try:
        mf.content = content
        # 非核心文件或内容有实质内容时生成 embedding
        if content.strip():
            embedding = generate_embedding(content)
            if embedding:
                mf.embedding = json.dumps(embedding)
        else:
            mf.embedding = None
        db.session.commit()
        return success_response(mf.to_dict(), message='保存成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'保存失败: {str(e)}')


@bp.route('/files', methods=['POST'])
@admin_required
def create_file(current_user):
    """创建新记忆文件（自动生成 embedding）"""
    user_id = current_user['user_id']
    file_key = request.args.get('path', '')
    if not file_key:
        return error_response('请提供文件路径')

    existing = MemoryFile.query.filter_by(user_id=user_id, file_key=file_key).first()
    if existing:
        return error_response('文件已存在')

    data = request.get_json()
    content = data.get('content', '')

    # 从文件名生成标题
    name = file_key.split('/')[-1].replace('.md', '')
    title = name

    try:
        embedding = None
        if content.strip():
            embedding = generate_embedding(content)

        mf = MemoryFile(
            user_id=user_id,
            file_key=file_key,
            title=title,
            content=content,
            always_load=False,
            is_core=False,
            embedding=json.dumps(embedding) if embedding else None,
        )
        db.session.add(mf)
        db.session.commit()
        return success_response(mf.to_dict(), message='创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')


@bp.route('/files', methods=['DELETE'])
@admin_required
def delete_file(current_user):
    """删除记忆文件（核心文件不可删除）"""
    user_id = current_user['user_id']
    file_key = request.args.get('path', '')
    if not file_key:
        return error_response('请提供文件路径')

    mf = MemoryFile.query.filter_by(user_id=user_id, file_key=file_key).first()
    if not mf:
        return error_response('文件不存在')
    if mf.is_core:
        return error_response('核心文件不可删除')

    try:
        db.session.delete(mf)
        db.session.commit()
        return success_response(message='删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')


# ==================== 向量搜索 API ====================

@bp.route('/vector/stats', methods=['GET'])
@admin_required
def vector_stats(current_user):
    """获取向量索引统计信息（仅长期记忆/非核心文件）"""
    user_id = current_user['user_id']
    base_q = MemoryFile.query.filter_by(user_id=user_id, is_core=False)
    total = base_q.count()
    with_vectors = base_q.filter(
        MemoryFile.embedding.isnot(None)
    ).count()
    indexed_files = [f.file_key for f in base_q.filter(
        MemoryFile.embedding.isnot(None)
    ).all()]

    return success_response({
        'total_chunks': total,
        'chunks_with_vectors': with_vectors,
        'indexed_files': indexed_files,
    })


@bp.route('/vector/rebuild', methods=['POST'])
@admin_required
def vector_rebuild(current_user):
    """重建所有记忆文件的向量嵌入"""
    user_id = current_user['user_id']
    files = MemoryFile.query.filter_by(user_id=user_id).filter(
        MemoryFile.content != ''
    ).all()

    updated = 0
    failed = 0
    for f in files:
        if f.content and f.content.strip():
            embedding = generate_embedding(f.content)
            if embedding:
                f.embedding = json.dumps(embedding)
                updated += 1
            else:
                failed += 1

    db.session.commit()
    return success_response(
        {'updated': updated, 'failed': failed, 'total': len(files)},
        message=f'重建完成：{updated} 个文件已更新向量'
    )


@bp.route('/vector/search', methods=['POST'])
@admin_required
def vector_search_endpoint(current_user):
    """向量语义搜索"""
    user_id = current_user['user_id']
    data = request.get_json()
    query = data.get('query', '').strip()
    top_k = data.get('top_k', 5)

    if not query:
        return error_response('请提供搜索内容')

    results = search_memory_files(user_id, query, top_k=top_k, exclude_always_load=False)

    return success_response([
        {
            'file_path': f.file_key,
            'title': f.title,
            'similarity': round(sim, 4),
            'chunk_text': f.content[:300] if f.content else '',
        }
        for f, sim in results
    ])


# ==================== 自动记忆提炼 ====================

DEEPSEEK_API_KEY = 'sk-995f2510dd174dc5abc2d36d4fc30c03'
DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
DEEPSEEK_MODEL = 'deepseek-chat'

# 记录每个会话上次提炼时的消息数，避免重复触发
_last_extract_msg_count = {}
EXTRACT_INTERVAL = 10  # 每 10 条新消息触发一次


def maybe_trigger_extraction(flask_app, user_id, conversation_id):
    """检查是否需要触发自动记忆提炼，如果需要则启动后台线程。
    用内存字典记录每个会话上次提炼时的消息数，
    当新消息数比上次多 >= EXTRACT_INTERVAL 条时触发。
    """
    import threading

    total_msgs = ChatMessage.query.filter_by(conversation_id=conversation_id).count()
    last_count = _last_extract_msg_count.get(conversation_id, 0)

    # 首次（last_count=0）且消息 >= 6 条，或者距上次提炼新增 >= EXTRACT_INTERVAL 条
    should_trigger = False
    if last_count == 0 and total_msgs >= 6:
        should_trigger = True
    elif last_count > 0 and (total_msgs - last_count) >= EXTRACT_INTERVAL:
        should_trigger = True

    if should_trigger:
        _last_extract_msg_count[conversation_id] = total_msgs
        print(f"[Auto Memory] Triggering extraction: conv={conversation_id}, msgs={total_msgs}, last={last_count}")
        threading.Thread(
            target=auto_extract_memories,
            args=(flask_app, user_id, conversation_id),
            daemon=True,
        ).start()


MEMORY_EXTRACT_PROMPT = """分析以下对话，提取值得长期记忆的信息。只提取以下类型：
- 用户的个人信息、偏好、习惯
- 重要的业务决策、结论
- 用户明确要求记住的事项
- 项目进展、关键节点

规则：
- 如果没有值得记忆的信息，返回空数组 []
- 每条记忆独立、简洁（1-2句话）
- 不要记录闲聊、问候等无实质内容
- 不要记录AI工具调用的技术细节

输出 JSON 格式：
[
  {"title": "记忆标题", "content": "具体内容"},
  ...
]
只输出 JSON，不要其他内容。"""

MEMORY_COMPRESS_PROMPT = """将以下多条相关记忆合并压缩为一条简洁的记忆。保留所有关键信息，去除重复。

输出格式：
{"title": "合并后的标题", "content": "合并后的内容"}
只输出 JSON，不要其他内容。"""


def _call_deepseek_for_extraction(messages):
    """调用 DeepSeek API（非流式），用于记忆提炼"""
    try:
        resp = http_requests.post(
            DEEPSEEK_API_URL,
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': DEEPSEEK_MODEL,
                'messages': messages,
                'stream': False,
                'temperature': 0.3,  # 低温度，更精确
                'max_tokens': 2048,
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message'].get('content', '')
    except Exception as e:
        print(f"[Memory Extract DeepSeek Error] {e}")
        traceback.print_exc()
        return None


def deduplicate_memory(user_id, title, content):
    """去重/合并：检查是否已有相似记忆
    返回: ('new', None) 需要创建新记忆
          ('update', existing_file) 需要更新已有记忆
          ('skip', None) 完全重复，跳过
    """
    new_embedding = generate_embedding(content)
    if not new_embedding:
        return ('new', None, None)

    # 查所有非核心记忆文件
    existing = MemoryFile.query.filter_by(user_id=user_id, is_core=False).filter(
        MemoryFile.embedding.isnot(None)
    ).all()

    best_match = None
    best_sim = 0.0
    for f in existing:
        try:
            f_embedding = json.loads(f.embedding)
            sim = cosine_similarity(new_embedding, f_embedding)
            if sim > best_sim:
                best_sim = sim
                best_match = f
        except (json.JSONDecodeError, TypeError):
            continue

    if best_sim > 0.90:
        # 几乎完全重复，跳过
        return ('skip', None, new_embedding)
    elif best_sim > 0.85:
        # 高度相似，更新合并
        return ('update', best_match, new_embedding)
    else:
        # 新信息
        return ('new', None, new_embedding)


def auto_extract_memories(flask_app, user_id, conversation_id):
    """后台线程：从最近对话中自动提炼记忆
    Args:
        flask_app: Flask app 对象（线程需要 app context）
        user_id: 用户 ID
        conversation_id: 会话 ID
    """
    try:
        with flask_app.app_context():
            print(f"[Auto Memory] 开始提炼 user={user_id}, conv={conversation_id}")

            # 1. 获取最近的对话消息（最近 10 条）
            msgs = ChatMessage.query.filter_by(
                conversation_id=conversation_id
            ).order_by(ChatMessage.created_at.desc()).limit(10).all()
            msgs.reverse()  # 按时间正序

            if len(msgs) < 4:
                print(f"[Auto Memory] 消息太少({len(msgs)}条)，跳过")
                return

            # 2. 构建对话文本
            conv_text = '\n'.join([f'{m.role}: {m.content}' for m in msgs])

            # 3. 调用 DeepSeek 提炼
            result_str = _call_deepseek_for_extraction([
                {'role': 'system', 'content': MEMORY_EXTRACT_PROMPT},
                {'role': 'user', 'content': conv_text},
            ])

            if not result_str:
                print("[Auto Memory] DeepSeek 返回空，跳过")
                return

            # 4. 解析 JSON 结果
            try:
                # 清理可能的 markdown 代码块标记
                clean = result_str.strip()
                if clean.startswith('```'):
                    clean = clean.split('\n', 1)[-1]  # 去掉第一行
                    if clean.endswith('```'):
                        clean = clean[:-3]
                    clean = clean.strip()
                memories = json.loads(clean)
            except json.JSONDecodeError:
                print(f"[Auto Memory] JSON 解析失败: {result_str[:200]}")
                return

            if not memories or not isinstance(memories, list):
                print("[Auto Memory] 无值得记忆的信息")
                return

            # 5. 逐条去重并存入
            created = 0
            updated = 0
            skipped = 0
            for mem in memories[:5]:  # 最多处理 5 条
                title = mem.get('title', '').strip()
                content = mem.get('content', '').strip()
                if not title or not content:
                    continue

                action, existing_file, embedding = deduplicate_memory(user_id, title, content)

                if action == 'skip':
                    skipped += 1
                    continue
                elif action == 'update' and existing_file:
                    # 合并内容
                    existing_file.content = f"{existing_file.content}\n\n---\n\n{content}"
                    existing_file.title = title  # 更新标题
                    if embedding:
                        # 重新生成合并后内容的 embedding
                        merged_embedding = generate_embedding(existing_file.content)
                        if merged_embedding:
                            existing_file.embedding = json.dumps(merged_embedding)
                    updated += 1
                else:
                    # 创建新记忆
                    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')[:20]
                    file_key = f"memory/auto/{timestamp}.md"
                    mf = MemoryFile(
                        user_id=user_id,
                        file_key=file_key,
                        title=title,
                        content=f"# {title}\n\n{content}",
                        always_load=False,
                        is_core=False,
                        embedding=json.dumps(embedding) if embedding else None,
                        source_conversation_id=conversation_id,
                    )
                    db.session.add(mf)
                    created += 1

            db.session.commit()
            print(f"[Auto Memory] 完成: 新建={created}, 更新={updated}, 跳过={skipped}")

            # 6. 检查是否需要压缩
            compress_memories_if_needed(user_id)

    except Exception as e:
        print(f"[Auto Memory Error] {e}")
        traceback.print_exc()


def compress_memories_if_needed(user_id, threshold=30):
    """当非核心记忆文件超过阈值时，自动压缩合并相似记忆"""
    try:
        non_core = MemoryFile.query.filter_by(user_id=user_id, is_core=False).all()
        if len(non_core) < threshold:
            return

        print(f"[Memory Compress] 记忆数量={len(non_core)}，超过阈值{threshold}，开始压缩")

        # 1. 加载所有有 embedding 的记忆
        files_with_emb = []
        for f in non_core:
            if f.embedding:
                try:
                    emb = json.loads(f.embedding)
                    files_with_emb.append((f, emb))
                except (json.JSONDecodeError, TypeError):
                    continue

        if len(files_with_emb) < threshold:
            return

        # 2. 简单聚类：贪心法，相似度 > 0.7 的归为一组
        used = set()
        clusters = []
        for i, (f_i, emb_i) in enumerate(files_with_emb):
            if i in used:
                continue
            cluster = [(f_i, emb_i)]
            used.add(i)
            for j, (f_j, emb_j) in enumerate(files_with_emb):
                if j in used:
                    continue
                sim = cosine_similarity(emb_i, emb_j)
                if sim > 0.7:
                    cluster.append((f_j, emb_j))
                    used.add(j)
            if len(cluster) >= 2:
                clusters.append(cluster)

        if not clusters:
            print("[Memory Compress] 没有可合并的记忆组")
            return

        # 3. 对每组进行合并
        merged_count = 0
        for cluster in clusters[:5]:  # 每次最多合并 5 组
            memories_text = '\n\n'.join([
                f"[{f.title}]\n{f.content}" for f, _ in cluster
            ])

            result_str = _call_deepseek_for_extraction([
                {'role': 'system', 'content': MEMORY_COMPRESS_PROMPT},
                {'role': 'user', 'content': memories_text},
            ])

            if not result_str:
                continue

            try:
                clean = result_str.strip()
                if clean.startswith('```'):
                    clean = clean.split('\n', 1)[-1]
                    if clean.endswith('```'):
                        clean = clean[:-3]
                    clean = clean.strip()
                merged = json.loads(clean)
            except json.JSONDecodeError:
                continue

            title = merged.get('title', '').strip()
            content = merged.get('content', '').strip()
            if not title or not content:
                continue

            # 保留第一个文件，更新内容，删除其余
            keep = cluster[0][0]
            keep.title = title
            keep.content = f"# {title}\n\n{content}"
            new_emb = generate_embedding(keep.content)
            if new_emb:
                keep.embedding = json.dumps(new_emb)

            for f, _ in cluster[1:]:
                db.session.delete(f)

            merged_count += 1

        db.session.commit()
        remaining = MemoryFile.query.filter_by(user_id=user_id, is_core=False).count()
        print(f"[Memory Compress] 完成: 合并了 {merged_count} 组，剩余 {remaining} 条记忆")

    except Exception as e:
        print(f"[Memory Compress Error] {e}")
        traceback.print_exc()
