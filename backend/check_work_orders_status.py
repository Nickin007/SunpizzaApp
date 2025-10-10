#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工单状态诊断脚本
检查后端API和数据库中的工单数据
"""

import requests
import json
import sys
import io

# 解决Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 配置
# BASE_URL = "http://localhost:5000/api"  # 本地测试
BASE_URL = "http://118.89.73.199:5000/api"  # 生产服务器

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_backend_health():
    """检查后端服务是否运行"""
    print_section("1. 检查后端服务状态")
    try:
        response = requests.get(f"{BASE_URL}/users/", timeout=5)
        if response.status_code in [200, 401]:  # 401说明服务在运行，只是需要认证
            print("✅ 后端服务运行正常")
            return True
        else:
            print(f"⚠️ 后端服务异常，状态码: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 无法连接到后端服务: {e}")
        return False

def login_and_get_token():
    """登录并获取token"""
    print_section("2. 登录获取Token")
    
    # 测试账号列表
    test_accounts = [
        {"username": "admin", "password": "admin123", "role": "管理员"},
        {"username": "regional_mgr", "password": "manager123", "role": "区域经理"},
        {"username": "shop_mgr", "password": "shop123", "role": "店长"},
    ]
    
    for account in test_accounts:
        try:
            response = requests.post(
                f"{BASE_URL}/users/login",
                json={"username": account["username"], "password": account["password"]},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('data', {}).get('token')
                print(f"✅ 登录成功 ({account['role']}: {account['username']})")
                return token, account['role']
            else:
                print(f"⚠️ {account['role']} 登录失败: {response.status_code}")
        except Exception as e:
            print(f"❌ 登录异常 ({account['role']}): {e}")
    
    print("❌ 所有测试账号都无法登录")
    return None, None

def check_work_orders(token, role):
    """检查工单列表"""
    print_section(f"3. 检查工单列表 (当前角色: {role})")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/work-orders/?page=1&per_page=20",
            headers=headers,
            timeout=15  # 增加超时时间
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            work_orders = data.get('data', {}).get('items', [])
            total = data.get('data', {}).get('total', 0)
            
            print(f"[OK] API调用成功")
            print(f"[统计] 工单总数: {total}")
            print(f"[统计] 本页工单数: {len(work_orders)}")
            
            if work_orders:
                print(f"\n最近的工单:")
                for i, wo in enumerate(work_orders[:5], 1):
                    # 处理嵌套字典格式
                    status_name = wo.get('status', {}).get('status_name') if wo.get('status') else None
                    shop_name = wo.get('shop', {}).get('name') if wo.get('shop') else None
                    type_name = wo.get('type', {}).get('type_name') if wo.get('type') else None
                    priority_name = wo.get('priority', {}).get('priority_name') if wo.get('priority') else None
                    
                    print(f"  {i}. ID:{wo.get('id')} | {wo.get('title')}")
                    print(f"      类型:{type_name} | 优先级:{priority_name} | 状态:{status_name} | 门店:{shop_name}")
            else:
                print("⚠️ 没有找到工单数据")
            
            return work_orders
        else:
            print(f"❌ API调用失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"❌ 检查工单列表异常: {e}")
        return None

def check_dict_data(token):
    """检查字典数据"""
    print_section("4. 检查字典数据")
    
    dict_endpoints = [
        ("任务类型", "/work-orders/dict/types"),
        ("优先级", "/work-orders/dict/priorities"),
        ("工单状态", "/work-orders/dict/statuses"),
    ]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    for name, endpoint in dict_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                items = data.get('data', [])
                print(f"✅ {name}: {len(items)} 项")
                for item in items:
                    item_name = item.get('type_name') or item.get('priority_name') or item.get('status_name')
                    print(f"   - {item_name} (ID: {item.get('id')})")
            else:
                print(f"❌ {name}: API调用失败 ({response.status_code})")
        except Exception as e:
            print(f"❌ {name}: 检查异常 - {e}")

def check_database_directly():
    """直接检查数据库（需要在服务器上运行）"""
    print_section("5. 数据库直接检查提示")
    print("如果API正常但看不到数据，请在服务器上执行以下SQL:")
    print("\n-- 检查工单总数")
    print("SELECT COUNT(*) FROM work_orders;")
    print("\n-- 检查最近的工单")
    print("SELECT id, title, status_id, shop_id, created_at FROM work_orders ORDER BY created_at DESC LIMIT 5;")
    print("\n-- 检查字典数据")
    print("SELECT 'types' as dict_type, COUNT(*) as count FROM dict_task_type")
    print("UNION SELECT 'priorities', COUNT(*) FROM dict_priority")
    print("UNION SELECT 'statuses', COUNT(*) FROM dict_status;")

def main():
    print(">>> 圣比萨工单系统 - 诊断工具")
    print(f"目标服务器: {BASE_URL}")
    
    # 1. 检查后端健康状态
    if not check_backend_health():
        print("\n❌ 后端服务无法访问，请检查:")
        print("   1. 后端服务是否正在运行")
        print("   2. 端口是否开放 (5000)")
        print("   3. 防火墙是否允许访问")
        return
    
    # 2. 登录获取token
    token, role = login_and_get_token()
    if not token:
        print("\n❌ 无法登录，请检查:")
        print("   1. 数据库是否正常")
        print("   2. 用户数据是否存在")
        print("   3. 密码是否正确")
        return
    
    # 3. 检查工单列表
    work_orders = check_work_orders(token, role)
    
    # 4. 检查字典数据
    check_dict_data(token)
    
    # 5. 数据库检查提示
    check_database_directly()
    
    # 总结
    print_section("诊断总结")
    if work_orders is not None and len(work_orders) > 0:
        print("[OK] 系统正常，能够获取工单数据")
        print("[提示] 如果APP看不到工单，请检查:")
        print("   1. APP的API地址配置是否正确")
        print("   2. APP的token是否有效")
        print("   3. APP当前登录的账号权限")
    elif work_orders is not None and len(work_orders) == 0:
        print("[警告] API正常但没有工单数据")
        print("[提示] 建议:")
        print("   1. 检查数据库中是否有工单记录")
        print("   2. 检查当前账号的权限是否能看到工单")
        print("   3. 尝试创建新的工单测试")
    else:
        print("[错误] 无法获取工单数据")
        print("[提示] 请查看上面的详细错误信息")

if __name__ == "__main__":
    main()

