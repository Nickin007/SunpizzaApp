#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
培训模块数据库迁移脚本
用于更新 TrainingCourse、ExamQuestion 表结构，并创建 ExamSubmission 表
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from sqlalchemy import text

def migrate_training_tables():
    """迁移培训模块数据库表"""
    app = create_app()
    
    with app.app_context():
        print("="*60)
        print("  培训模块数据库迁移")
        print("="*60)
        
        try:
            # 1. 修改 training_courses 表
            print("\n1. 修改 training_courses 表...")
            
            # 添加 video_url 字段
            try:
                db.session.execute(text(
                    "ALTER TABLE training_courses ADD COLUMN video_url VARCHAR(500)"
                ))
                print("   ✅ 添加 video_url 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  video_url 字段已存在")
                else:
                    raise
            
            # 添加 document_content 字段
            try:
                db.session.execute(text(
                    "ALTER TABLE training_courses ADD COLUMN document_content TEXT"
                ))
                print("   ✅ 添加 document_content 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  document_content 字段已存在")
                else:
                    raise
            
            # 迁移现有数据：将 content_text 数据复制到 document_content
            db.session.execute(text(
                "UPDATE training_courses SET document_content = content_text WHERE document_content IS NULL"
            ))
            print("   ✅ 迁移 content_text 到 document_content")
            
            # 注意：不删除旧字段 content_type, content_url, content_text，保持向后兼容
            
            # 2. 修改 exam_questions 表
            print("\n2. 修改 exam_questions 表...")
            
            # 添加 is_subjective 字段
            try:
                db.session.execute(text(
                    "ALTER TABLE exam_questions ADD COLUMN is_subjective TINYINT(1) DEFAULT 0"
                ))
                print("   ✅ 添加 is_subjective 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  is_subjective 字段已存在")
                else:
                    raise
            
            # 添加 score 字段
            try:
                db.session.execute(text(
                    "ALTER TABLE exam_questions ADD COLUMN score INT DEFAULT 10"
                ))
                print("   ✅ 添加 score 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  score 字段已存在")
                else:
                    raise
            
            # 添加 sort_order 字段
            try:
                db.session.execute(text(
                    "ALTER TABLE exam_questions ADD COLUMN sort_order INT DEFAULT 0"
                ))
                print("   ✅ 添加 sort_order 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  sort_order 字段已存在")
                else:
                    raise
            
            # 修改 correct_answer 为可选
            try:
                db.session.execute(text(
                    "ALTER TABLE exam_questions MODIFY correct_answer VARCHAR(255) NULL"
                ))
                print("   ✅ 修改 correct_answer 为可选字段")
            except Exception as e:
                print(f"   ⚠️  修改 correct_answer 失败: {e}")
            
            # 添加 subjective 到 question_type 枚举（如果不存在）
            try:
                db.session.execute(text(
                    "ALTER TABLE exam_questions MODIFY question_type "
                    "ENUM('single_choice', 'multiple_choice', 'true_false', 'subjective') NOT NULL"
                ))
                print("   ✅ 更新 question_type 枚举值")
            except Exception as e:
                print(f"   ⚠️  更新枚举值失败: {e}")
            
            # 3. 添加 learning_records 新字段
            print("\n3. 修改 learning_records 表...")
            
            try:
                db.session.execute(text(
                    "ALTER TABLE learning_records ADD COLUMN video_progress INT DEFAULT 0"
                ))
                print("   ✅ 添加 video_progress 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  video_progress 字段已存在")
                else:
                    raise
            
            try:
                db.session.execute(text(
                    "ALTER TABLE learning_records ADD COLUMN document_read TINYINT(1) DEFAULT 0"
                ))
                print("   ✅ 添加 document_read 字段")
            except Exception as e:
                if 'Duplicate column name' in str(e) or 'already exists' in str(e):
                    print("   ⚠️  document_read 字段已存在")
                else:
                    raise
            
            # 4. 创建 exam_submissions 表
            print("\n4. 创建 exam_submissions 表...")
            
            try:
                db.session.execute(text("""
                    CREATE TABLE IF NOT EXISTS exam_submissions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        course_id INT NOT NULL,
                        answers JSON NOT NULL,
                        objective_score INT DEFAULT 0,
                        subjective_score INT DEFAULT 0,
                        total_score INT DEFAULT 0,
                        status ENUM('pending_review', 'passed', 'failed') DEFAULT 'pending_review',
                        reviewed_by INT,
                        reviewed_at DATETIME,
                        feedback TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (course_id) REFERENCES training_courses(id),
                        FOREIGN KEY (reviewed_by) REFERENCES users(id)
                    )
                """))
                print("   ✅ 创建 exam_submissions 表")
            except Exception as e:
                if 'already exists' in str(e):
                    print("   ⚠️  exam_submissions 表已存在")
                else:
                    raise
            
            # 提交所有更改
            db.session.commit()
            
            print("\n" + "="*60)
            print("✅ 数据库迁移完成！")
            print("="*60)
            print("\n提示：")
            print("1. 旧字段（content_type, content_url, content_text）已保留，保持向后兼容")
            print("2. 新课程将使用 video_url 和 document_content 字段")
            print("3. 考试系统现在支持主观题和自动判分")
            print("4. 请重启后端服务以应用更改")
            
        except Exception as e:
            print(f"\n❌ 迁移失败: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    migrate_training_tables()

