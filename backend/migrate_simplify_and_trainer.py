"""
迁移脚本：简化 Agent 架构为两层 + 插入 Trainer Agent
1. 将引用被删 Agent 的 chat_conversations.agent_id 重置为 strategy_ai
2. 删除所有 L3 Agent（需先删，因为外键指向 L2）
3. 删除所有 L2 Agent
4. 插入 Trainer Agent（L1, active）
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db

app = create_app()

TRAINER_PROMPT = r"""你是圣比萨数字化平台的 Agent 训练管理专家。你的职责是帮助管理员通过自然语言对话来查看、修改和创建 Agent。

## 通用规则
- 回复使用中文，Markdown 格式
- 操作前先确认用户意图，操作后汇报改动摘要
- 修改 system_prompt 时保留原有结构，只做增量修改

## 工作流程
1. 用户描述需求后，先用 `list_agents` 了解当前所有 Agent 的全貌
2. 用 `get_agent_detail` 读取目标 Agent 的完整配置（特别是 system_prompt）
3. 根据用户需求，用 `update_agent` 修改配置或用 `create_agent` 创建新 Agent
4. 操作完成后，向用户说明：改了什么、为什么这样改、会如何影响该 Agent 的行为

## 工具说明
- `list_agents`：列出所有 Agent 基本信息（id、名称、层级、状态、prompt 预览）
- `get_agent_detail(agent_id)`：获取某个 Agent 的完整配置，包括 system_prompt 全文
- `update_agent(agent_id, ...)`：更新 Agent 的指定字段（name/description/system_prompt/status/icon/level/parent_id）
- `create_agent(id, name, level, ...)`：创建一个新的 Agent

## 注意事项
- 不要修改自己（trainer）的配置，除非用户明确要求
- 修改 system_prompt 时，先用 get_agent_detail 读取当前内容，理解结构后再做修改
- 创建新 Agent 时，level 只能是 1 或 2；建议 L2 设置 parent_id 指向某个 L1 Agent
- status 可选值：active（启用）、placeholder（占位/即将上线）、disabled（禁用）"""

with app.app_context():
    conn = db.engine.raw_connection()
    cursor = conn.cursor()

    print("=== 1. 重置引用被删 Agent 的 conversation agent_id ===")
    cursor.execute("SELECT id FROM agent_definitions WHERE level >= 2")
    ids_to_remove = [row[0] for row in cursor.fetchall()]
    affected = 0
    if ids_to_remove:
        placeholders = ','.join(['%s'] * len(ids_to_remove))
        cursor.execute(
            f"UPDATE chat_conversations SET agent_id = 'strategy_ai' WHERE agent_id COLLATE utf8mb4_unicode_ci IN ({placeholders})",
            ids_to_remove
        )
        affected = cursor.rowcount
    print(f"  已重置 {affected} 条会话")

    print("=== 2. 删除所有 L3 Agent ===")
    cursor.execute("DELETE FROM agent_definitions WHERE level = 3")
    deleted_l3 = cursor.rowcount
    print(f"  已删除 {deleted_l3} 个 L3 Agent")

    print("=== 3. 删除所有 L2 Agent ===")
    cursor.execute("DELETE FROM agent_definitions WHERE level = 2")
    deleted_l2 = cursor.rowcount
    print(f"  已删除 {deleted_l2} 个 L2 Agent")

    print("=== 4. 插入 Trainer Agent ===")
    try:
        cursor.execute(
            "INSERT INTO agent_definitions (id, name, level, parent_id, description, system_prompt, icon, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            ('trainer', 'Trainer - 训练管理', 1, None,
             '通过对话管理所有 Agent 的配置：查看、修改 system_prompt、创建新 Agent',
             TRAINER_PROMPT, 'ToolOutlined', 'active')
        )
        print("  OK - Trainer Agent 已插入")
    except Exception as e:
        if 'Duplicate entry' in str(e):
            print("  SKIP - Trainer Agent 已存在，更新 system_prompt")
            cursor.execute(
                "UPDATE agent_definitions SET system_prompt = %s, status = 'active' WHERE id = 'trainer'",
                (TRAINER_PROMPT,)
            )
        else:
            raise

    conn.commit()
    cursor.close()
    conn.close()

    print("\n=== 迁移完成 ===")
    print(f"  删除: {deleted_l3} 个 L3 + {deleted_l2} 个 L2")
    print("  新增: Trainer Agent (L1, active)")
    print("  当前架构: L1 (StrategyAI + Trainer) → L2 (未来按需创建)")
