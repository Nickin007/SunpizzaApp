#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
工单模块 API 测试脚本
测试所有工单相关的后端接口
"""

import requests
import json
from datetime import datetime, timedelta

# 测试环境配置
BASE_URL = "http://localhost:5000"
TOKEN = None  # 将在登录后获取

def print_test_result(test_name, success, message=""):
    """打印测试结果"""
    status = "✅ 通过" if success else "❌ 失败"
    print(f"{status} | {test_name}")
    if message:
        print(f"   {message}")
    print()

def login(username="admin", password="admin123"):
    """登录并获取 token"""
    global TOKEN
    url = f"{BASE_URL}/api/users/login"
    data = {"username": username, "password": password}
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            TOKEN = result['data']['token']
            print_test_result("用户登录", True, f"用户: {result['data']['user']['real_name']}")
            return True
        else:
            print_test_result("用户登录", False, f"状态码: {response.status_code}")
            return False
    except Exception as e:
        print_test_result("用户登录", False, f"错误: {str(e)}")
        return False

def get_headers():
    """获取请求头（包含 token）"""
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def test_get_task_types():
    """测试：获取任务类型列表"""
    url = f"{BASE_URL}/api/work-orders/dict/types"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            types = data['data']
            print_test_result("获取任务类型列表", True, 
                            f"共 {len(types)} 种类型: {', '.join([t['type_name'] for t in types])}")
            return types
        else:
            print_test_result("获取任务类型列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取任务类型列表", False, f"错误: {str(e)}")
        return []

def test_get_priorities():
    """测试：获取优先级列表"""
    url = f"{BASE_URL}/api/work-orders/dict/priorities"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            priorities = data['data']
            print_test_result("获取优先级列表", True, 
                            f"共 {len(priorities)} 种优先级: {', '.join([p['priority_name'] for p in priorities])}")
            return priorities
        else:
            print_test_result("获取优先级列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取优先级列表", False, f"错误: {str(e)}")
        return []

def test_get_statuses():
    """测试：获取状态列表"""
    url = f"{BASE_URL}/api/work-orders/dict/statuses"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            statuses = data['data']
            print_test_result("获取状态列表", True, 
                            f"共 {len(statuses)} 种状态: {', '.join([s['status_name'] for s in statuses])}")
            return statuses
        else:
            print_test_result("获取状态列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取状态列表", False, f"错误: {str(e)}")
        return []

def test_get_shops():
    """测试：获取门店列表"""
    url = f"{BASE_URL}/api/shops/"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            # 门店 API 返回分页数据
            shops = data['data']['items']
            total = data['data']['pagination']['total']
            print_test_result("获取门店列表", True, 
                            f"共 {total} 家门店")
            return shops
        else:
            print_test_result("获取门店列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取门店列表", False, f"错误: {str(e)}")
        return []

def test_create_work_order(type_id, priority_id, shop_id):
    """测试：创建工单"""
    url = f"{BASE_URL}/api/work-orders/"
    
    # 计算7天后的截止日期
    due_date = (datetime.now() + timedelta(days=7)).isoformat()
    
    data = {
        "title": "【测试工单】咖啡机故障需要维修",
        "description": "门店咖啡机出现故障，显示 E01 错误代码，请尽快安排维修人员检查。",
        "type_id": type_id,
        "priority_id": priority_id,
        "shop_id": shop_id,  # 明确指定门店
        "due_date": due_date
    }
    
    try:
        response = requests.post(url, json=data, headers=get_headers())
        if response.status_code == 201:
            result = response.json()
            work_order = result['data']
            print_test_result("创建工单", True, 
                            f"工单ID: {work_order['id']}, 标题: {work_order['title']}")
            return work_order['id']
        else:
            print_test_result("创建工单", False, 
                            f"状态码: {response.status_code}, 响应: {response.text}")
            return None
    except Exception as e:
        print_test_result("创建工单", False, f"错误: {str(e)}")
        return None

def test_get_work_orders():
    """测试：获取工单列表"""
    url = f"{BASE_URL}/api/work-orders/"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            work_orders = data['data']['items']
            total = data['data']['pagination']['total']
            print_test_result("获取工单列表", True, 
                            f"共 {total} 条工单，当前页 {len(work_orders)} 条")
            return work_orders
        else:
            print_test_result("获取工单列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取工单列表", False, f"错误: {str(e)}")
        return []

def test_get_work_order_detail(work_order_id):
    """测试：获取工单详情"""
    url = f"{BASE_URL}/api/work-orders/{work_order_id}"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            work_order = data['data']
            print_test_result("获取工单详情", True, 
                            f"标题: {work_order['title']}, 状态: {work_order['status']['status_name']}")
            return work_order
        else:
            print_test_result("获取工单详情", False, f"状态码: {response.status_code}")
            return None
    except Exception as e:
        print_test_result("获取工单详情", False, f"错误: {str(e)}")
        return None

def test_add_comment(work_order_id):
    """测试：添加评论"""
    url = f"{BASE_URL}/api/work-orders/{work_order_id}/comments"
    
    data = {
        "content": "已收到工单，正在联系维修人员，预计明天上午到店检查。"
    }
    
    try:
        response = requests.post(url, json=data, headers=get_headers())
        if response.status_code == 201:
            result = response.json()
            comment = result['data']
            print_test_result("添加评论", True, 
                            f"评论ID: {comment['id']}, 内容: {comment['content'][:30]}...")
            return comment['id']
        else:
            print_test_result("添加评论", False, f"状态码: {response.status_code}")
            return None
    except Exception as e:
        print_test_result("添加评论", False, f"错误: {str(e)}")
        return None

def test_update_work_order(work_order_id):
    """测试：更新工单状态"""
    url = f"{BASE_URL}/api/work-orders/{work_order_id}"
    
    data = {
        "status_id": 2,  # 进行中
        "completion_progress": 50
    }
    
    try:
        response = requests.put(url, json=data, headers=get_headers())
        if response.status_code == 200:
            result = response.json()
            work_order = result['data']
            print_test_result("更新工单状态", True, 
                            f"状态: {work_order['status']['status_name']}, 进度: {work_order['completion_progress']}%")
            return True
        else:
            print_test_result("更新工单状态", False, f"状态码: {response.status_code}")
            return False
    except Exception as e:
        print_test_result("更新工单状态", False, f"错误: {str(e)}")
        return False

def test_get_stats():
    """测试：获取工单统计数据"""
    url = f"{BASE_URL}/api/work-orders/stats"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            stats = data['data']
            stats_str = ", ".join([f"{k}: {v}" for k, v in stats.items()])
            print_test_result("获取工单统计数据", True, stats_str)
            return stats
        else:
            print_test_result("获取工单统计数据", False, f"状态码: {response.status_code}")
            return {}
    except Exception as e:
        print_test_result("获取工单统计数据", False, f"错误: {str(e)}")
        return {}

def test_get_assignable_users():
    """测试：获取可分配用户列表"""
    url = f"{BASE_URL}/api/work-orders/assignable-users"
    
    try:
        response = requests.get(url, headers=get_headers())
        if response.status_code == 200:
            data = response.json()
            users = data['data']
            print_test_result("获取可分配用户列表", True, 
                            f"共 {len(users)} 个用户")
            return users
        else:
            print_test_result("获取可分配用户列表", False, f"状态码: {response.status_code}")
            return []
    except Exception as e:
        print_test_result("获取可分配用户列表", False, f"错误: {str(e)}")
        return []

def main():
    """主测试流程"""
    print("=" * 60)
    print("🧪 工单模块 API 测试")
    print("=" * 60)
    print()
    
    # 1. 登录
    print("【步骤 1】登录系统")
    print("-" * 60)
    if not login():
        print("❌ 登录失败，终止测试")
        return
    
    # 2. 获取字典数据
    print("【步骤 2】获取字典数据（类型、优先级、状态）")
    print("-" * 60)
    task_types = test_get_task_types()
    priorities = test_get_priorities()
    statuses = test_get_statuses()
    
    if not task_types or not priorities or not statuses:
        print("❌ 获取字典数据失败，终止测试")
        return
    
    # 3. 获取门店列表
    print("【步骤 3】获取门店列表")
    print("-" * 60)
    shops = test_get_shops()
    
    if not shops:
        print("❌ 获取门店列表失败，终止测试")
        return
    
    # 4. 创建工单
    print("【步骤 4】创建新工单")
    print("-" * 60)
    work_order_id = test_create_work_order(task_types[0]['id'], priorities[1]['id'], shops[0]['id'])
    
    if not work_order_id:
        print("❌ 创建工单失败，终止测试")
        return
    
    # 5. 获取工单列表
    print("【步骤 5】获取工单列表")
    print("-" * 60)
    work_orders = test_get_work_orders()
    
    # 6. 获取工单详情
    print("【步骤 6】获取工单详情")
    print("-" * 60)
    work_order = test_get_work_order_detail(work_order_id)
    
    # 7. 添加评论
    print("【步骤 7】添加评论")
    print("-" * 60)
    comment_id = test_add_comment(work_order_id)
    
    # 8. 更新工单状态
    print("【步骤 8】更新工单状态")
    print("-" * 60)
    test_update_work_order(work_order_id)
    
    # 9. 获取统计数据
    print("【步骤 9】获取统计数据")
    print("-" * 60)
    test_get_stats()
    
    # 10. 获取可分配用户列表
    print("【步骤 10】获取可分配用户列表")
    print("-" * 60)
    test_get_assignable_users()
    
    # 测试完成
    print("=" * 60)
    print("✅ 所有测试完成！")
    print("=" * 60)
    print()
    print("💡 提示：")
    print("  - 测试数据已创建在数据库中")
    print("  - 可以在前端应用中查看这些测试工单")
    print("  - 如需清理测试数据，请手动删除")
    print()

if __name__ == "__main__":
    main()

