#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新在营门店列表脚本
从56个门店更新到59个门店
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def update_stores():
    """更新门店列表"""
    from app import create_app, db
    from sqlalchemy import text
    
    app = create_app()
    
    with app.app_context():
        print("="*70)
        print("开始更新在营门店列表...")
        print("="*70)
        
        # 1. 删除3个关闭/改名的门店
        stores_to_delete = [
            '圣比萨·披萨·焗饭(亿象城店)',
            '圣比萨·披萨·焗饭(瞿溪店)',
            '圣比萨·披萨·意面(永中店)',  # 这个改名了
        ]
        
        print(f"\n[1/3] 删除 {len(stores_to_delete)} 个门店...")
        deleted_count = 0
        for store_name in stores_to_delete:
            try:
                result = db.session.execute(
                    text("DELETE FROM eleme_active_stores WHERE store_name = :store_name"),
                    {'store_name': store_name}
                )
                if result.rowcount > 0:
                    deleted_count += 1
                    print(f"  [-] {store_name}")
                else:
                    print(f"  [SKIP] {store_name} (不存在)")
            except Exception as e:
                print(f"  [ERROR] {store_name}: {str(e)}")
        
        db.session.commit()
        print(f"✓ 成功删除 {deleted_count} 个门店")
        
        # 2. 新增6个门店
        stores_to_add = [
            '圣比萨·披萨·炸鸡(青墩店)',
            '圣比萨·披萨·炸鸡(玉环陈屿店)',
            '圣比萨·披萨·牛排意面(永中店)',  # 永中店改名后的版本
            '圣比萨披萨.炸鸡(益林店)',
            '圣比萨·披萨·意面(天河店)',
            '圣比萨·披萨·炸鸡(临安店)',
        ]
        
        print(f"\n[2/3] 新增 {len(stores_to_add)} 个门店...")
        added_count = 0
        for store_name in stores_to_add:
            try:
                db.session.execute(
                    text("""
                        INSERT INTO eleme_active_stores (store_name, is_active)
                        VALUES (:store_name, TRUE)
                        ON DUPLICATE KEY UPDATE store_name = store_name
                    """),
                    {'store_name': store_name}
                )
                added_count += 1
                print(f"  [+] {store_name}")
            except Exception as e:
                print(f"  [ERROR] {store_name}: {str(e)}")
        
        db.session.commit()
        print(f"✓ 成功新增 {added_count} 个门店")
        
        # 3. 验证最终数据
        print("\n[3/3] 验证数据...")
        result = db.session.execute(text("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
            FROM eleme_active_stores
        """)).fetchone()
        
        total, active, inactive = result[0], result[1], result[2]
        
        print(f"  总门店数：{total}")
        print(f"  在营门店：{active}")
        print(f"  停业门店：{inactive}")
        
        print("\n" + "="*70)
        if total == 59:
            print("[SUCCESS] 更新完成！门店数量正确（59个）")
        else:
            print(f"[WARNING] 更新完成，但门店数量不符合预期（期望59个，实际{total}个）")
        print("="*70)
        
        # 4. 显示所有门店列表（用于确认）
        print("\n[验证] 当前所有门店列表：")
        print("-"*70)
        result = db.session.execute(text("""
            SELECT store_name, is_active
            FROM eleme_active_stores
            ORDER BY id
        """))
        for i, row in enumerate(result, 1):
            status = "在营" if row[1] else "停业"
            print(f"  {i:2d}. {row[0]} [{status}]")
        print("-"*70)

if __name__ == '__main__':
    update_stores()

