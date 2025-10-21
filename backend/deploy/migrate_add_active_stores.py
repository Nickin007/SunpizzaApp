#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：创建在营门店表并初始化数据
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    """执行迁移"""
    from app import create_app, db
    from sqlalchemy import text
    
    app = create_app()
    
    with app.app_context():
        print("开始迁移：创建在营门店表...")
        
        # 1. 创建表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS `eleme_active_stores` (
            `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
            `store_name` VARCHAR(200) NOT NULL COMMENT '门店名称',
            `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否在营',
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            PRIMARY KEY (`id`),
            UNIQUE KEY `uk_store_name` (`store_name`),
            KEY `idx_is_active` (`is_active`),
            KEY `idx_created_at` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么在营门店列表';
        """
        
        print("创建 eleme_active_stores 表...")
        db.session.execute(text(create_table_sql))
        db.session.commit()
        print("✓ eleme_active_stores 表创建成功")
        
        # 2. 初始化56个门店数据
        stores = [
            '圣比萨·披萨·炸鸡(八滩店)',
            '圣比萨·披萨·炸鸡(滨海店)',
            '圣比萨•披萨•意面(钱库店)',
            '圣比萨·披萨·意面(灵溪江湾店)',
            '圣比萨·披萨·意面(马站店)',
            '圣比萨·披萨·意面(金乡店)',
            '圣比萨·披萨·意面(宜山店)',
            '圣比萨·披萨·意面(灵溪店)',
            '圣比萨·披萨·焗饭(白象店)',
            '圣比萨·披萨·意面(柳市店)',
            '圣比萨·披萨·意面(虹桥店)',
            '圣比萨·披萨·意面(白石店)',
            '圣比萨·披萨·意面(翁垟店)',
            '圣比萨·披萨·意面(龙港西城店)',
            '圣比萨·披萨·意面(龙港店)',
            '圣比萨·披萨·意面(浙南科技城店)',
            '圣比萨·披萨·焗饭(泰亨温学府店)',
            '圣比萨·披萨·意面(永中店)',
            '圣比萨·披萨·意面(汤家桥店)',
            '圣比萨·披萨·意面(鞋都店)',
            '圣比萨·披萨·意面(葡萄棚店)',
            '圣比萨•披萨·意面(垟田店)',
            '圣比萨·意面·焗饭(新城店)',
            '圣比萨·披萨·意面(黄龙店)',
            '圣比萨·意面·焗饭(雪景店)',
            '圣比萨·披萨·意面(春晖店)',
            '圣比萨·披萨·意面(欧洲城店)',
            '圣比萨·披萨·意面(茶山大学城店)',
            '圣比萨·披萨·焗饭(亿象城店)',
            '圣比萨·披萨·意面(蟠凤店)',
            '圣比萨·披萨·焗饭(瞿溪店)',
            '圣比萨·披萨·焗饭(鳌江店)',
            '圣比萨•披萨•意面(郭溪店)',
            '圣比萨•披萨•意面(新桥店)',
            '圣比萨·披萨·意面(娄桥店)',
            '圣比萨·披萨·意面(龙霞店)',
            '圣比萨·米开朗(平阳店)',
            '圣比萨·披萨·意面(水头店)',
            '圣比萨·披萨·意面(百悦广场店)',
            '圣比萨·意面·焗饭(温溪店)',
            '圣比萨·披萨·焗饭(塘下店)',
            '圣比萨·披萨·意面(仙降店)',
            '圣比萨·披萨·意面(陶山店)',
            '圣比萨·披萨·意面·焗饭(嵊州吾悦店)',
            '圣比萨·披萨·炸鸡(陈家港店)',
            '圣比萨·披萨·炸鸡(幸福路店)',
            '圣比萨·披萨·意面(佛堂店)',
            '圣比萨·披萨·意面(三江立体城店)',
            '圣比萨·披萨·意面(瓯北店)',
            '圣比萨(上塘店)',
            '圣比萨·披萨·意面(恒达广场店)',
            '圣比萨·披萨·意面(双塔店)',
            '圣比萨·披萨·意面(玉环楚门店)',
            '圣比萨·披萨·意面(玉环沙门桐兴店)',
            '圣比萨·披萨·意面(玉环珠城店)',
            '圣比萨·披萨·意面(玉环坎门店)',
        ]
        
        print(f"\n开始初始化 {len(stores)} 个门店数据...")
        
        # 使用批量插入
        insert_sql = """
        INSERT INTO eleme_active_stores (store_name, is_active)
        VALUES (:store_name, TRUE)
        ON DUPLICATE KEY UPDATE store_name = store_name;
        """
        
        inserted_count = 0
        for store_name in stores:
            try:
                db.session.execute(
                    text(insert_sql),
                    {'store_name': store_name}
                )
                inserted_count += 1
                print(f"  ✓ {store_name}")
            except Exception as e:
                print(f"  ✗ {store_name}: {str(e)}")
        
        db.session.commit()
        
        print(f"\n✓ 成功初始化 {inserted_count}/{len(stores)} 个门店数据")
        print("\n迁移完成！")
        
        # 3. 验证数据
        verify_sql = "SELECT COUNT(*) as count FROM eleme_active_stores"
        result = db.session.execute(text(verify_sql)).fetchone()
        print(f"\n数据验证：当前在营门店表共有 {result[0]} 条记录")

if __name__ == '__main__':
    migrate()

