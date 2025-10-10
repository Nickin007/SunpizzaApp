#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建培训模块测试数据
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import TrainingCategory, TrainingCourse, ExamQuestion

def create_test_data():
    """创建测试数据"""
    app = create_app()
    
    with app.app_context():
        print("="*60)
        print("  创建培训模块测试数据")
        print("="*60)
        
        # 1. 创建分类（如果不存在）
        print("\n1. 检查培训分类...")
        categories = {
            'product': None,
            'service': None,
            'operation': None
        }
        
        for cat_type in categories.keys():
            category = TrainingCategory.query.filter_by(type=cat_type, parent_id=None).first()
            if not category:
                category = TrainingCategory(
                    name=f"{cat_type.capitalize()}培训",
                    type=cat_type,
                    sort_order=0
                )
                db.session.add(category)
                db.session.flush()
                print(f"   ✅ 创建分类: {category.name}")
            else:
                print(f"   ⚠️  分类已存在: {category.name}")
            categories[cat_type] = category
        
        db.session.commit()
        
        # 2. 创建测试课程
        print("\n2. 创建测试课程...")
        
        # 课程1：有视频和文档，有考试
        course1 = TrainingCourse.query.filter_by(title='披萨制作标准流程').first()
        if not course1:
            course1 = TrainingCourse(
                title='披萨制作标准流程',
                description='本课程将详细讲解圣比萨的标准制作流程，包括面团制作、酱料配比、烘烤技巧等。',
                category_id=categories['product'].id,
                video_url='https://www.w3schools.com/html/mov_bbb.mp4',  # 测试视频
                document_content='''
                <h1>披萨制作标准流程</h1>
                
                <h2>一、面团制作</h2>
                <p>高筋面粉500g，温水300ml，酵母5g，盐10g，橄榄油30ml。</p>
                <ol>
                    <li>将酵母溶于温水中，静置5分钟</li>
                    <li>混合面粉和盐，倒入酵母水</li>
                    <li>揉面至光滑，加入橄榄油继续揉</li>
                    <li>发酵1小时至2倍大</li>
                </ol>
                
                <h2>二、酱料配比</h2>
                <p>番茄酱200g，罗勒、牛至各5g，大蒜末10g，盐、黑胡椒适量。</p>
                <p><strong>注意：</strong>酱料要均匀涂抹，边缘留出1cm。</p>
                
                <h2>三、烘烤技巧</h2>
                <ul>
                    <li>预热烤箱至230°C</li>
                    <li>烘烤时间：12-15分钟</li>
                    <li>观察饼边颜色，金黄色即可</li>
                </ul>
                
                <p style="color: red; font-weight: bold;">重要提示：安全操作，注意高温！</p>
                ''',
                has_exam=True,
                is_published=True
            )
            db.session.add(course1)
            db.session.flush()
            print(f"   ✅ 创建课程: {course1.title}")
            
            # 添加考试题目
            questions = [
                # 单选题
                {
                    'question_text': '披萨面团发酵的标准时间是？',
                    'question_type': 'single_choice',
                    'options': ['30分钟', '1小时', '2小时', '3小时'],
                    'correct_answer': '1小时',
                    'is_subjective': False,
                    'score': 10,
                    'sort_order': 1
                },
                # 多选题
                {
                    'question_text': '披萨酱料中需要哪些调料？（多选）',
                    'question_type': 'multiple_choice',
                    'options': ['罗勒', '牛至', '孜然', '大蒜末'],
                    'correct_answer': '罗勒,牛至,大蒜末',
                    'is_subjective': False,
                    'score': 15,
                    'sort_order': 2
                },
                # 判断题
                {
                    'question_text': '披萨烘烤时，边缘需要涂抹酱料。',
                    'question_type': 'true_false',
                    'options': ['正确', '错误'],
                    'correct_answer': '错误',
                    'is_subjective': False,
                    'score': 10,
                    'sort_order': 3
                },
                # 主观题
                {
                    'question_text': '请简述披萨制作过程中最重要的三个注意事项。',
                    'question_type': 'subjective',
                    'options': None,
                    'correct_answer': None,
                    'is_subjective': True,
                    'score': 25,
                    'sort_order': 4
                },
            ]
            
            for q_data in questions:
                question = ExamQuestion(
                    course_id=course1.id,
                    **q_data
                )
                db.session.add(question)
            
            print(f"   ✅ 添加 {len(questions)} 道考试题目")
        else:
            print(f"   ⚠️  课程已存在: {course1.title}")
        
        # 课程2：只有文档，无考试
        course2 = TrainingCourse.query.filter_by(title='客户服务礼仪规范').first()
        if not course2:
            course2 = TrainingCourse(
                title='客户服务礼仪规范',
                description='学习圣比萨的服务标准和礼仪规范，提升客户满意度。',
                category_id=categories['service'].id,
                video_url=None,
                document_content='''
                <h1>客户服务礼仪规范</h1>
                
                <h2>服务标准</h2>
                <p>1. <strong>微笑服务</strong>：始终保持真诚的微笑</p>
                <p>2. <strong>礼貌用语</strong>：您好、请、谢谢、再见</p>
                <p>3. <strong>响应时间</strong>：客户呼叫后30秒内响应</p>
                
                <h2>服务流程</h2>
                <ol>
                    <li>主动问候</li>
                    <li>了解需求</li>
                    <li>专业推荐</li>
                    <li>确认订单</li>
                    <li>送别致谢</li>
                </ol>
                ''',
                has_exam=False,
                is_published=True
            )
            db.session.add(course2)
            print(f"   ✅ 创建课程: {course2.title}")
        else:
            print(f"   ⚠️  课程已存在: {course2.title}")
        
        # 课程3：有视频，无文档，有考试
        course3 = TrainingCourse.query.filter_by(title='门店日常运营管理').first()
        if not course3:
            course3 = TrainingCourse(
                title='门店日常运营管理',
                description='掌握门店日常运营的各项管理要点，包括人员排班、库存管理、卫生检查等。',
                category_id=categories['operation'].id,
                video_url='https://www.w3schools.com/html/movie.mp4',  # 测试视频
                document_content='<p>请观看视频学习门店运营管理要点。</p>',
                has_exam=True,
                is_published=True
            )
            db.session.add(course3)
            db.session.flush()
            print(f"   ✅ 创建课程: {course3.title}")
            
            # 添加简单的考试题目
            questions = [
                {
                    'question_text': '门店每日营业前必须完成哪些准备工作？',
                    'question_type': 'subjective',
                    'options': None,
                    'correct_answer': None,
                    'is_subjective': True,
                    'score': 40,
                    'sort_order': 1
                },
            ]
            
            for q_data in questions:
                question = ExamQuestion(
                    course_id=course3.id,
                    **q_data
                )
                db.session.add(question)
            
            print(f"   ✅ 添加 {len(questions)} 道考试题目")
        else:
            print(f"   ⚠️  课程已存在: {course3.title}")
        
        db.session.commit()
        
        print("\n" + "="*60)
        print("✅ 测试数据创建完成！")
        print("="*60)
        print("\n测试数据包括：")
        print(f"  - 3个分类（产品类、服务类、运营类）")
        print(f"  - 3个课程：")
        print(f"    1. 披萨制作标准流程（视频+文档+考试）")
        print(f"    2. 客户服务礼仪规范（仅文档）")
        print(f"    3. 门店日常运营管理（视频+考试）")
        print("\n现在可以在APP中测试培训功能了！")

if __name__ == "__main__":
    create_test_data()

