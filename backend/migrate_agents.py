"""
迁移脚本：三级 Agent 架构
1. 创建 agent_definitions 表
2. 创建 agent_dispatch_logs 表
3. chat_conversations 新增 agent_id 字段
4. 插入初始 Agent 数据（StrategyAI active + L2/L3 placeholder）
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db

app = create_app()

STRATEGY_AI_PROMPT = r"""你是圣比萨数字化平台的AI助手。你负责帮助管理员处理与公司运营相关的问题。

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
- 所有自定义变量在同一对话中跨消息自动保留。**遇到 NameError 时，先执行 `print([v for v in dir() if not v.startswith('_')])` 确认可用变量，很可能是你记错了变量名。严禁不检查就说"变量丢失"或"需要重新加载数据"。**

## 调度能力
你可以调度下辖的 L2 领域专家 Agent 来处理专业问题。当用户的问题涉及特定领域时，使用 `dispatch_agent` 工具将子任务分配给对应的专业 Agent。"""

AGENTS = [
    # L1
    {'id': 'strategy_ai', 'name': 'StrategyAI - 战略参谋', 'level': 1, 'parent_id': None,
     'description': '战略参谋、数据分析、扩张建议、跨领域洞察。可调度所有 L2 领域专家。',
     'icon': 'RocketOutlined', 'status': 'active', 'system_prompt': STRATEGY_AI_PROMPT},
    # L2
    {'id': 'supply_brain', 'name': 'SupplyBrain - 供应链大脑', 'level': 2, 'parent_id': 'strategy_ai',
     'description': '供应链管理：采购、库存、物流、供应商',
     'icon': 'ShoppingCartOutlined', 'status': 'placeholder'},
    {'id': 'online_master', 'name': 'OnlineMaster - 线上运营', 'level': 2, 'parent_id': 'strategy_ai',
     'description': '线上运营：外卖平台、抖音、小红书、广告投放',
     'icon': 'GlobalOutlined', 'status': 'placeholder'},
    {'id': 'offline_master', 'name': 'OfflineMaster - 线下运营', 'level': 2, 'parent_id': 'strategy_ai',
     'description': '线下运营：门店管理、排班、培训、巡检',
     'icon': 'ShopOutlined', 'status': 'placeholder'},
    {'id': 'finance_ai', 'name': 'FinanceAI - 财务风控', 'level': 2, 'parent_id': 'strategy_ai',
     'description': '财务风控：对账、现金流、风险稽查、加盟结算',
     'icon': 'DollarOutlined', 'status': 'placeholder'},
    # L3 - 供应链
    {'id': 'demand_forecast', 'name': 'DemandForecast - 需求预测', 'level': 3, 'parent_id': 'supply_brain',
     'description': '时间序列需求预测', 'icon': 'LineChartOutlined', 'status': 'placeholder'},
    {'id': 'procurement', 'name': 'Procurement - 采购执行', 'level': 3, 'parent_id': 'supply_brain',
     'description': '自动下单、供应商选择', 'icon': 'FileDoneOutlined', 'status': 'placeholder'},
    {'id': 'logistics', 'name': 'Logistics - 物流调度', 'level': 3, 'parent_id': 'supply_brain',
     'description': '路线优化、温度监控', 'icon': 'CarOutlined', 'status': 'placeholder'},
    {'id': 'supplier', 'name': 'Supplier - 供应商管理', 'level': 3, 'parent_id': 'supply_brain',
     'description': '供应商评分、比价、锁价建议', 'icon': 'TeamOutlined', 'status': 'placeholder'},
    # L3 - 线上
    {'id': 'content_factory', 'name': 'ContentFactory - 内容生成', 'level': 3, 'parent_id': 'online_master',
     'description': '文案、图片、视频内容生成', 'icon': 'EditOutlined', 'status': 'placeholder'},
    {'id': 'ads_optimizer', 'name': 'AdsOptimizer - 投放优化', 'level': 3, 'parent_id': 'online_master',
     'description': '多平台预算实时调整', 'icon': 'FundOutlined', 'status': 'placeholder'},
    {'id': 'review_master', 'name': 'ReviewMaster - 评论运营', 'level': 3, 'parent_id': 'online_master',
     'description': '自动回复、差评预警', 'icon': 'MessageOutlined', 'status': 'placeholder'},
    {'id': 'live_stream', 'name': 'LiveStream - 直播运营', 'level': 3, 'parent_id': 'online_master',
     'description': '直播脚本、排品、数据监控', 'icon': 'VideoCameraOutlined', 'status': 'placeholder'},
    # L3 - 线下
    {'id': 'scheduler', 'name': 'Scheduler - 智能排班', 'level': 3, 'parent_id': 'offline_master',
     'description': '预测+法规+技能匹配排班', 'icon': 'CalendarOutlined', 'status': 'placeholder'},
    {'id': 'inspector', 'name': 'Inspector - 视频巡检', 'level': 3, 'parent_id': 'offline_master',
     'description': '摄像头AI、SOP合规检查', 'icon': 'EyeOutlined', 'status': 'placeholder'},
    {'id': 'trainer', 'name': 'Trainer - 员工培训', 'level': 3, 'parent_id': 'offline_master',
     'description': 'AI陪练、考核推送', 'icon': 'BookOutlined', 'status': 'placeholder'},
    {'id': 'food_safety', 'name': 'FoodSafety - 食安监控', 'level': 3, 'parent_id': 'offline_master',
     'description': 'IoT温度、效期、异常行为监控', 'icon': 'SafetyCertificateOutlined', 'status': 'placeholder'},
    # L3 - 财务
    {'id': 'reconciliation', 'name': 'Reconciliation - 自动对账', 'level': 3, 'parent_id': 'finance_ai',
     'description': '多平台账单抓取对账', 'icon': 'AuditOutlined', 'status': 'placeholder'},
    {'id': 'cash_flow', 'name': 'CashFlow - 现金流预测', 'level': 3, 'parent_id': 'finance_ai',
     'description': '14天资金缺口预警', 'icon': 'StockOutlined', 'status': 'placeholder'},
    {'id': 'risk_auditor', 'name': 'RiskAuditor - 风险稽查', 'level': 3, 'parent_id': 'finance_ai',
     'description': '异常交易识别', 'icon': 'AlertOutlined', 'status': 'placeholder'},
    {'id': 'franchise_settlement', 'name': 'FranchiseSettlement - 加盟结算', 'level': 3, 'parent_id': 'finance_ai',
     'description': '自动分账、返点计算', 'icon': 'AccountBookOutlined', 'status': 'placeholder'},
]

with app.app_context():
    conn = db.engine.raw_connection()
    cursor = conn.cursor()

    print("=== 1. 创建 agent_definitions 表 ===")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_definitions (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            level TINYINT NOT NULL COMMENT '层级 1/2/3',
            parent_id VARCHAR(50) DEFAULT NULL,
            description TEXT,
            system_prompt TEXT,
            tools TEXT COMMENT 'JSON 工具定义',
            icon VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'placeholder',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES agent_definitions(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("  OK")

    print("=== 2. 创建 agent_dispatch_logs 表 ===")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_dispatch_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            source_agent_id VARCHAR(50) NOT NULL,
            target_agent_id VARCHAR(50) NOT NULL,
            dispatch_type VARCHAR(20) NOT NULL DEFAULT 'auto',
            task_summary TEXT,
            result_summary TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id),
            INDEX idx_conv (conversation_id),
            INDEX idx_source (source_agent_id),
            INDEX idx_target (target_agent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("  OK")

    print("=== 3. chat_conversations 新增 agent_id 字段 ===")
    try:
        cursor.execute("ALTER TABLE chat_conversations ADD COLUMN agent_id VARCHAR(50) DEFAULT 'strategy_ai' AFTER user_id;")
        print("  OK - 字段已添加")
    except Exception as e:
        if 'Duplicate column' in str(e):
            print("  SKIP - 字段已存在")
        else:
            raise

    print("=== 4. 插入初始 Agent 数据 ===")
    for agent in AGENTS:
        try:
            cursor.execute(
                "INSERT INTO agent_definitions (id, name, level, parent_id, description, system_prompt, icon, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (agent['id'], agent['name'], agent['level'], agent.get('parent_id'),
                 agent.get('description'), agent.get('system_prompt'), agent.get('icon'), agent['status'])
            )
            print(f"  + {agent['id']} (L{agent['level']}, {agent['status']})")
        except Exception as e:
            if 'Duplicate entry' in str(e):
                print(f"  SKIP {agent['id']} - 已存在")
            else:
                raise

    conn.commit()
    cursor.close()
    conn.close()
    print("\n=== 迁移完成 ===")
