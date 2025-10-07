"""数据库初始化脚本"""
import pymysql
from app import create_app, db
from app.models import (
    User, Shop, DictTaskType, DictPriority, DictStatus,
    RoutineTaskTemplate, TrainingCategory
)
from config import Config

def create_database_if_not_exists():
    """如果数据库不存在则创建"""
    print("=" * 60)
    print("🚀 圣比萨智能门店管理平台 - 数据库初始化")
    print("=" * 60)
    print()
    
    # 连接到MySQL服务器（不指定数据库）
    print("📡 正在连接到MySQL服务器...")
    try:
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            port=Config.MYSQL_PORT,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # 检查数据库是否存在
        cursor.execute(f"SHOW DATABASES LIKE '{Config.MYSQL_DATABASE}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"✅ 数据库 '{Config.MYSQL_DATABASE}' 已存在")
            
            # 询问是否重新创建
            response = input(f"\n⚠️  是否要删除并重新创建数据库？这将清空所有数据！(yes/no): ").strip().lower()
            if response in ['yes', 'y']:
                print(f"🗑️  正在删除数据库 '{Config.MYSQL_DATABASE}'...")
                cursor.execute(f"DROP DATABASE `{Config.MYSQL_DATABASE}`")
                print("✅ 数据库已删除")
                
                print(f"📦 正在创建数据库 '{Config.MYSQL_DATABASE}'...")
                cursor.execute(
                    f"CREATE DATABASE `{Config.MYSQL_DATABASE}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
                print("✅ 数据库创建成功")
            else:
                print("📋 保留现有数据库，仅更新表结构")
        else:
            # 创建数据库
            print(f"📦 正在创建数据库 '{Config.MYSQL_DATABASE}'...")
            cursor.execute(
                f"CREATE DATABASE `{Config.MYSQL_DATABASE}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            print("✅ 数据库创建成功")
        
        connection.commit()
        cursor.close()
        connection.close()
        print()
        
    except pymysql.err.OperationalError as e:
        print(f"\n❌ 连接MySQL失败: {e}")
        print("\n请检查：")
        print("  1. MySQL服务是否已启动")
        print("  2. .env文件中的数据库配置是否正确")
        print("  3. MySQL用户名和密码是否正确")
        exit(1)
    except Exception as e:
        print(f"\n❌ 创建数据库失败: {e}")
        exit(1)

def init_database():
    """初始化数据库"""
    # 先创建数据库
    create_database_if_not_exists()
    
    app = create_app()
    
    with app.app_context():
        # 创建所有表
        print("📋 正在创建数据库表...")
        db.create_all()
        
        print("✅ 数据库表创建成功")
        print()
        
        # 初始化字典表数据
        print("📚 正在初始化字典表...")
        init_dict_tables()
        print("✅ 字典表初始化成功")
        print()
        
        # 创建默认管理员账户
        print("👤 正在创建默认管理员账户...")
        create_default_admin()
        print()
        
        # 创建示例数据
        print("🎲 正在创建示例数据...")
        create_sample_data()
        print()
        
        print("=" * 60)
        print("🎉 数据库初始化完成！")
        print("=" * 60)
        print()
        print("📝 测试账号：")
        print("  管理员    - 用户名: admin         密码: admin123")
        print("  区域经理  - 用户名: manager1      密码: 123456")
        print("  店长1     - 用户名: shopmanager1  密码: 123456")
        print("  店长2     - 用户名: shopmanager2  密码: 123456")
        print()
        print("🚀 现在可以启动后端服务了: python app.py")
        print("=" * 60)

def init_dict_tables():
    """初始化字典表数据"""
    
    # 任务类型
    task_types = [
        {'id': 1, 'type_name': '稽查整改', 'color': '#FF6B6B'},
        {'id': 2, 'type_name': '营销活动', 'color': '#4ECDC4'},
        {'id': 3, 'type_name': '设备报修', 'color': '#45B7D1'},
        {'id': 4, 'type_name': '物料申请', 'color': '#96CEB4'},
        {'id': 5, 'type_name': '人员调度', 'color': '#F7C46C'},
        {'id': 6, 'type_name': '其他', 'color': '#9E9E9E'}
    ]
    
    for tt in task_types:
        task_type = DictTaskType(**tt)
        db.session.add(task_type)
    
    # 优先级
    priorities = [
        {'id': 1, 'priority_name': '低', 'color': '#5DADE2', 'sort_order': 1},
        {'id': 2, 'priority_name': '中', 'color': '#F4D03F', 'sort_order': 2},
        {'id': 3, 'priority_name': '高', 'color': '#EC7063', 'sort_order': 3}
    ]
    
    for p in priorities:
        priority = DictPriority(**p)
        db.session.add(priority)
    
    # 状态
    statuses = [
        {'id': 1, 'status_name': '待受理', 'color': '#95A5A6'},
        {'id': 2, 'status_name': '进行中', 'color': '#3498DB'},
        {'id': 3, 'status_name': '已完成', 'color': '#2ECC71'},
        {'id': 4, 'status_name': '已关闭', 'color': '#7F8C8D'}
    ]
    
    for s in statuses:
        status = DictStatus(**s)
        db.session.add(status)
    
    db.session.commit()

def create_default_admin():
    """创建默认管理员账户"""
    # 检查管理员是否已存在
    existing_admin = User.query.filter_by(username='admin').first()
    if existing_admin:
        print("  ℹ️  管理员账户已存在，跳过创建")
        return
    
    admin = User(
        username='admin',
        real_name='系统管理员',
        role='admin'
    )
    admin.set_password('admin123')  # 默认密码，生产环境需修改
    db.session.add(admin)
    db.session.commit()
    print("  ✅ 管理员账户创建成功")
    print("     用户名: admin")
    print("     密码: admin123")

def create_sample_data():
    """创建示例数据"""
    
    # 检查是否已有示例数据
    if Shop.query.first():
        print("  ℹ️  示例数据已存在，跳过创建")
        return
    
    # 创建示例门店
    print("  📍 创建示例门店...")
    shop1 = Shop(name='圣比萨-王府井店', address='北京市东城区王府井大街1号')
    shop2 = Shop(name='圣比萨-三里屯店', address='北京市朝阳区三里屯路11号')
    db.session.add_all([shop1, shop2])
    db.session.commit()
    
    # 创建区域经理
    print("  👔 创建区域经理...")
    rm = User(
        username='manager1',
        real_name='张经理',
        role='regional_manager'
    )
    rm.set_password('123456')
    db.session.add(rm)
    db.session.commit()
    
    # 关联门店到区域经理
    shop1.regional_manager_id = rm.id
    shop2.regional_manager_id = rm.id
    
    # 创建店长
    print("  👨‍💼 创建店长账户...")
    sm1 = User(
        username='shopmanager1',
        real_name='李店长',
        role='shop_manager',
        shop_id=shop1.id
    )
    sm1.set_password('123456')
    
    sm2 = User(
        username='shopmanager2',
        real_name='王店长',
        role='shop_manager',
        shop_id=shop2.id
    )
    sm2.set_password('123456')
    
    db.session.add_all([sm1, sm2])
    
    # 创建日清模板
    print("  🧹 创建清洁任务模板...")
    daily_template = RoutineTaskTemplate(
        task_name='日常清洁检查',
        description='每日门店清洁标准检查',
        frequency='daily',
        checklist_json=[
            {'item': '地面清洁', 'required_photo': True},
            {'item': '桌面擦拭', 'required_photo': False},
            {'item': '厨房消毒', 'required_photo': True},
            {'item': '垃圾清理', 'required_photo': False}
        ],
        is_active=True
    )
    
    # 创建周清模板
    weekly_template = RoutineTaskTemplate(
        task_name='周度深度清洁',
        description='每周深度清洁检查',
        frequency='weekly',
        checklist_json=[
            {'item': '冰箱清洁', 'required_photo': True},
            {'item': '油烟机清洗', 'required_photo': True},
            {'item': '库房整理', 'required_photo': True},
            {'item': '设备保养', 'required_photo': False}
        ],
        is_active=True
    )
    
    db.session.add_all([daily_template, weekly_template])
    
    # 创建培训分类
    print("  📚 创建培训分类...")
    product_cat = TrainingCategory(
        name='产品类培训',
        type='product',
        sort_order=1
    )
    
    service_cat = TrainingCategory(
        name='服务类培训',
        type='service',
        sort_order=2
    )
    
    operation_cat = TrainingCategory(
        name='运营程序类培训',
        type='operation',
        sort_order=3
    )
    
    db.session.add_all([product_cat, service_cat, operation_cat])
    
    db.session.commit()
    print("  ✅ 示例数据创建成功")

if __name__ == '__main__':
    init_database()

