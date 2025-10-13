#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
饿了么门店数据分析 - 数据库迁移脚本

创建表：
- eleme_store_daily_data: 门店每日数据表
- eleme_import_logs: 数据导入日志表
- eleme_field_config: 字段配置表（用于数据库编辑功能）
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_eleme_tables():
    """执行饿了么数据分析相关的数据库迁移"""
    app = create_app()
    
    with app.app_context():
        print("="*60)
        print("  饿了么门店数据分析 - 数据库迁移")
        print("="*60)
        print()
        
        try:
            # 1. 创建门店每日数据表
            print("1. 创建 eleme_store_daily_data 表...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS eleme_store_daily_data (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    
                    -- 基础信息
                    data_date DATE NOT NULL COMMENT '数据日期',
                    store_name VARCHAR(200) NOT NULL COMMENT '门店名称',
                    store_id VARCHAR(50) COMMENT '门店编号',
                    province VARCHAR(50) COMMENT '省份',
                    city VARCHAR(50) COMMENT '城市',
                    district VARCHAR(50) COMMENT '区县',
                    address VARCHAR(500) COMMENT '门店地址',
                    first_open_time DATETIME COMMENT '首次营业时间',
                    is_direct VARCHAR(10) COMMENT '是否直营',
                    
                    -- 运营时长
                    business_hours VARCHAR(50) COMMENT '营业时长',
                    peak_hours VARCHAR(50) COMMENT '高峰期营业时长',
                    abnormal_close_hours VARCHAR(50) COMMENT '异常关店时长',
                    is_valid_store VARCHAR(10) COMMENT '是否有效门店',
                    
                    -- 订单财务
                    valid_orders INT DEFAULT 0 COMMENT '有效订单',
                    invalid_orders INT DEFAULT 0 COMMENT '无效订单',
                    merchant_invalid_orders INT DEFAULT 0 COMMENT '商户原因无效订单数',
                    income DECIMAL(10,2) DEFAULT 0 COMMENT '收入',
                    packaging_fee DECIMAL(10,2) DEFAULT 0 COMMENT '打包费',
                    platform_service_fee DECIMAL(10,2) DEFAULT 0 COMMENT '平台技术服务费',
                    delivery_subsidy DECIMAL(10,2) DEFAULT 0 COMMENT '配送费补贴',
                    fulfillment_service_fee DECIMAL(10,2) DEFAULT 0 COMMENT '履约技术服务费',
                    refund_fee DECIMAL(10,2) DEFAULT 0 COMMENT '退单费用',
                    customer_payment_total DECIMAL(10,2) DEFAULT 0 COMMENT '顾客实付总额',
                    avg_payment_per_order DECIMAL(10,2) DEFAULT 0 COMMENT '单均实付',
                    avg_income_per_order DECIMAL(10,2) DEFAULT 0 COMMENT '单均收入',
                    
                    -- 客户行为（营销漏斗）
                    exposure_users INT DEFAULT 0 COMMENT '曝光人数',
                    exposure_new_users INT DEFAULT 0 COMMENT '新客曝光人数',
                    exposure_old_users INT DEFAULT 0 COMMENT '老客曝光人数',
                    exposure_times INT DEFAULT 0 COMMENT '曝光次数',
                    visit_users INT DEFAULT 0 COMMENT '进店人数',
                    visit_new_users INT DEFAULT 0 COMMENT '新客进店人数',
                    visit_old_users INT DEFAULT 0 COMMENT '老客进店人数',
                    visit_times INT DEFAULT 0 COMMENT '进店次数',
                    order_users INT DEFAULT 0 COMMENT '下单人数',
                    order_new_users INT DEFAULT 0 COMMENT '新客下单人数',
                    order_old_users INT DEFAULT 0 COMMENT '老客下单人数',
                    order_times INT DEFAULT 0 COMMENT '下单次数',
                    visit_conversion_rate DECIMAL(5,2) COMMENT '进店转化率',
                    new_visit_conversion_rate DECIMAL(5,2) COMMENT '新客进店转化率',
                    old_visit_conversion_rate DECIMAL(5,2) COMMENT '老客进店转化率',
                    order_conversion_rate DECIMAL(5,2) COMMENT '下单转化率',
                    new_order_conversion_rate DECIMAL(5,2) COMMENT '新客下单转化率',
                    old_order_conversion_rate DECIMAL(5,2) COMMENT '老客下单转化率',
                    
                    -- 商品运营
                    online_products INT DEFAULT 0 COMMENT '上架商品数',
                    sold_products INT DEFAULT 0 COMMENT '有交易商品数',
                    out_of_stock_products INT DEFAULT 0 COMMENT '库存不足商品数',
                    new_products INT DEFAULT 0 COMMENT '新上架商品数',
                    promotion_products INT DEFAULT 0 COMMENT '活动商品数',
                    discount_orders INT DEFAULT 0 COMMENT '满减活动订单数',
                    repurchase_7d_users INT DEFAULT 0 COMMENT '近7日复购人数',
                    repurchase_7d_rate DECIMAL(5,2) COMMENT '近7日复购率',
                    repurchase_30d_users INT DEFAULT 0 COMMENT '近30日复购人数',
                    repurchase_30d_rate DECIMAL(5,2) COMMENT '近30日复购率',
                    
                    -- 服务质量
                    bad_review_orders INT DEFAULT 0 COMMENT '差评订单数',
                    complaint_orders INT DEFAULT 0 COMMENT '投诉订单数',
                    complaint_order_ids TEXT COMMENT '投诉订单ID',
                    overtime_orders INT DEFAULT 0 COMMENT '出餐超时订单数',
                    overtime_order_ids TEXT COMMENT '出餐超时订单ID',
                    avg_cooking_time DECIMAL(5,2) COMMENT '单均出餐时长',
                    reject_orders INT DEFAULT 0 COMMENT '拒单数',
                    merchant_cancel_orders INT DEFAULT 0 COMMENT '商责取消数',
                    merchant_cancel_rate DECIMAL(5,2) COMMENT '商责取消率',
                    merchant_refund_orders INT DEFAULT 0 COMMENT '商责退单数',
                    merchant_refund_rate DECIMAL(5,2) COMMENT '商责退单率',
                    avg_pickup_time DECIMAL(5,2) COMMENT '单均取餐时长',
                    
                    -- 评分体系
                    store_score DECIMAL(3,2) COMMENT '店铺评分',
                    satisfaction_score DECIMAL(3,2) COMMENT '满意度得分',
                    taste_score DECIMAL(3,2) COMMENT '味道得分',
                    packaging_score DECIMAL(3,2) COMMENT '包装得分',
                    
                    -- 近60日评价
                    good_rate_60d DECIMAL(5,2) COMMENT '近60日好评率',
                    good_count_60d INT DEFAULT 0 COMMENT '近60日好评数',
                    medium_rate_60d DECIMAL(5,2) COMMENT '近60日中评率',
                    medium_count_60d INT DEFAULT 0 COMMENT '近60日中评数',
                    bad_rate_60d DECIMAL(5,2) COMMENT '近60日差评率',
                    bad_count_60d INT DEFAULT 0 COMMENT '近60日差评数',
                    quality_rate_60d DECIMAL(5,2) COMMENT '近60日优质评价率',
                    quality_count_60d INT DEFAULT 0 COMMENT '近60日优质评价数',
                    review_rate_60d DECIMAL(5,2) COMMENT '近60日订单评价率',
                    review_count_60d INT DEFAULT 0 COMMENT '近60日订单评价数',
                    bad_reply_rate_60d DECIMAL(5,2) COMMENT '近60日差评人工回复率',
                    
                    -- 近30日评价
                    good_rate_30d DECIMAL(5,2) COMMENT '近30日好评率',
                    good_count_30d INT DEFAULT 0 COMMENT '近30日好评数',
                    medium_rate_30d DECIMAL(5,2) COMMENT '近30日中评率',
                    medium_count_30d INT DEFAULT 0 COMMENT '近30日中评数',
                    bad_rate_30d DECIMAL(5,2) COMMENT '近30日差评率',
                    bad_count_30d INT DEFAULT 0 COMMENT '近30日差评数',
                    quality_rate_30d DECIMAL(5,2) COMMENT '近30日优质评价率',
                    quality_count_30d INT DEFAULT 0 COMMENT '近30日优质评价数',
                    review_rate_30d DECIMAL(5,2) COMMENT '近30日订单评价率',
                    review_count_30d INT DEFAULT 0 COMMENT '近30日订单评价数',
                    bad_reply_rate_30d DECIMAL(5,2) COMMENT '近30日差评人工回复率',
                    
                    -- 元数据
                    import_batch_id VARCHAR(50) COMMENT '导入批次ID',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    
                    -- 索引
                    INDEX idx_date (data_date),
                    INDEX idx_store (store_id),
                    INDEX idx_date_store (data_date, store_id),
                    INDEX idx_city (city),
                    INDEX idx_batch (import_batch_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么门店每日数据表';
            """))
            print("   ✅ eleme_store_daily_data 表创建成功")
            
            # 2. 创建导入日志表
            print("2. 创建 eleme_import_logs 表...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS eleme_import_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    batch_id VARCHAR(50) UNIQUE NOT NULL COMMENT '批次ID',
                    file_name VARCHAR(200) COMMENT '文件名',
                    data_date DATE COMMENT '数据日期',
                    total_rows INT DEFAULT 0 COMMENT '总行数',
                    success_rows INT DEFAULT 0 COMMENT '成功行数',
                    failed_rows INT DEFAULT 0 COMMENT '失败行数',
                    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing' COMMENT '状态',
                    error_message TEXT COMMENT '错误信息',
                    imported_by INT COMMENT '导入人ID',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    completed_at DATETIME COMMENT '完成时间',
                    
                    INDEX idx_date (data_date),
                    INDEX idx_status (status),
                    FOREIGN KEY (imported_by) REFERENCES users(id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么数据导入日志表';
            """))
            print("   ✅ eleme_import_logs 表创建成功")
            
            # 3. 创建字段配置表（用于数据库编辑功能）
            print("3. 创建 eleme_field_config 表...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS eleme_field_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    field_name VARCHAR(100) NOT NULL COMMENT '字段名称（数据库列名）',
                    display_name VARCHAR(100) NOT NULL COMMENT '显示名称（中文）',
                    field_type VARCHAR(50) DEFAULT 'VARCHAR' COMMENT '字段类型',
                    field_category VARCHAR(50) COMMENT '字段分类',
                    is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
                    sort_order INT DEFAULT 0 COMMENT '排序',
                    description TEXT COMMENT '字段描述',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                    
                    UNIQUE KEY uk_field_name (field_name),
                    INDEX idx_category (field_category),
                    INDEX idx_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饿了么字段配置表';
            """))
            print("   ✅ eleme_field_config 表创建成功")
            
            # 4. 插入初始字段配置数据
            print("4. 插入初始字段配置...")
            field_configs = [
                # 基础信息类
                ('data_date', '日期', 'DATE', '基础信息', 1, 1),
                ('store_name', '门店名称', 'VARCHAR', '基础信息', 1, 2),
                ('store_id', '门店编号', 'VARCHAR', '基础信息', 1, 3),
                ('city', '城市', 'VARCHAR', '基础信息', 1, 4),
                
                # 运营时长类
                ('business_hours', '营业时长', 'VARCHAR', '运营时长', 1, 10),
                ('peak_hours', '高峰期营业时长', 'VARCHAR', '运营时长', 1, 11),
                ('abnormal_close_hours', '异常关店时长', 'VARCHAR', '运营时长', 1, 12),
                ('is_valid_store', '是否有效门店', 'VARCHAR', '运营时长', 1, 13),
                
                # 订单财务类
                ('valid_orders', '有效订单', 'INT', '订单财务', 1, 20),
                ('income', '收入', 'DECIMAL', '订单财务', 1, 21),
                ('packaging_fee', '打包费', 'DECIMAL', '订单财务', 1, 22),
                ('platform_service_fee', '平台技术服务费', 'DECIMAL', '订单财务', 1, 23),
                ('customer_payment_total', '顾客实付总额', 'DECIMAL', '订单财务', 1, 24),
                ('avg_payment_per_order', '单均实付', 'DECIMAL', '订单财务', 1, 25),
                
                # 营销漏斗类
                ('exposure_users', '曝光人数', 'INT', '营销漏斗', 1, 30),
                ('visit_users', '进店人数', 'INT', '营销漏斗', 1, 31),
                ('order_users', '下单人数', 'INT', '营销漏斗', 1, 32),
                ('visit_conversion_rate', '进店转化率', 'DECIMAL', '营销漏斗', 1, 33),
                ('order_conversion_rate', '下单转化率', 'DECIMAL', '营销漏斗', 1, 34),
                
                # 商品运营类
                ('online_products', '上架商品数', 'INT', '商品运营', 1, 40),
                ('sold_products', '有交易商品数', 'INT', '商品运营', 1, 41),
                ('discount_orders', '满减活动订单数', 'INT', '商品运营', 1, 42),
                ('repurchase_7d_rate', '近7日复购率', 'DECIMAL', '商品运营', 1, 43),
                
                # 服务质量类
                ('bad_review_orders', '差评订单数', 'INT', '服务质量', 1, 50),
                ('complaint_orders', '投诉订单数', 'INT', '服务质量', 1, 51),
                ('avg_cooking_time', '单均出餐时长', 'DECIMAL', '服务质量', 1, 52),
                ('store_score', '店铺评分', 'DECIMAL', '服务质量', 1, 53),
                ('good_rate_60d', '近60日好评率', 'DECIMAL', '服务质量', 1, 54),
            ]
            
            for field_name, display_name, field_type, category, is_active, sort_order in field_configs:
                try:
                    db.session.execute(text("""
                        INSERT INTO eleme_field_config 
                        (field_name, display_name, field_type, field_category, is_active, sort_order)
                        VALUES (:field_name, :display_name, :field_type, :category, :is_active, :sort_order)
                        ON DUPLICATE KEY UPDATE 
                            display_name = VALUES(display_name),
                            field_type = VALUES(field_type),
                            field_category = VALUES(field_category)
                    """), {
                        'field_name': field_name,
                        'display_name': display_name,
                        'field_type': field_type,
                        'category': category,
                        'is_active': is_active,
                        'sort_order': sort_order
                    })
                except Exception as e:
                    print(f"   ⚠️  插入字段 {field_name} 失败: {str(e)}")
            
            print("   ✅ 初始字段配置插入成功")
            
            db.session.commit()
            
            print()
            print("="*60)
            print("✅ 数据库迁移完成！")
            print("="*60)
            print()
            print("提示：")
            print("1. 饿了么门店数据分析表已创建")
            print("2. 支持约80+个数据字段")
            print("3. 字段配置表支持动态编辑")
            print("4. 请重启后端服务以应用更改")
            print()
            
        except Exception as e:
            db.session.rollback()
            print()
            print("❌ 迁移失败:", str(e))
            print()
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate_eleme_tables()

