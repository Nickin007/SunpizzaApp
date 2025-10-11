#!/usr/bin/env python3
"""
活动日志数据库迁移脚本
创建 activity_logs 表
"""

import os
import sys

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_activity_logs():
    """创建活动日志表"""
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("  活动日志数据库迁移")
        print("=" * 60)
        print()
        
        try:
            print("1. 创建 activity_logs 表...")
            
            # 创建表
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    action_type ENUM(
                        'work_order_created',
                        'work_order_status_changed',
                        'work_order_assigned',
                        'work_order_comment',
                        'work_order_image_added'
                    ) NOT NULL,
                    work_order_id INT,
                    user_id INT NOT NULL,
                    target_user_id INT,
                    old_value VARCHAR(100),
                    new_value VARCHAR(100),
                    comment TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_work_order_id (work_order_id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (target_user_id) REFERENCES users(id)
                )
            """))
            
            db.session.commit()
            print("   ✅ activity_logs 表创建成功")
            
            print()
            print("=" * 60)
            print("✅ 数据库迁移完成！")
            print("=" * 60)
            print()
            print("提示：")
            print("1. activity_logs 表已创建，用于记录系统活动")
            print("2. 工单的创建、状态变更、评论等操作会自动记录日志")
            print("3. 请重启后端服务以应用更改")
            print()
            
        except Exception as e:
            print(f"❌ 迁移失败: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate_activity_logs()

