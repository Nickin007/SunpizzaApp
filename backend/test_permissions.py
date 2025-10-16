#!/usr/bin/env python3
"""测试新的工单权限系统"""

import requests
import json
from datetime import datetime

# 配置
BASE_URL = "http://118.89.73.199:5000/api"

# 测试账号（需要根据实际情况修改）
ACCOUNTS = {
    'admin': {'username': 'admin', 'password': 'admin123'},
    'regional_manager': {'username': 'regional_manager', 'password': 'rm123'},
    'shop_manager': {'username': 'shop_manager', 'password': 'sm123'},
    'eleme_operator': {'username': 'eleme_operator', 'password': 'eo123'},
}

def login(username, password):
    """登录并获取token"""
    response = requests.post(
        f"{BASE_URL}/users/login",
        json={'username': username, 'password': password}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get('data', {}).get('token')
    else:
        print(f"❌ 登录失败: {username}")
        return None

def get_headers(token):
    """获取请求头"""
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

def test_visibility(role_name, token):
    """测试工单可见性"""
    print(f"\n{'='*60}")
    print(f"🔍 测试 {role_name} 的工单可见性")
    print('='*60)
    
    headers = get_headers(token)
    response = requests.get(f"{BASE_URL}/work-orders/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        work_orders = data.get('data', [])
        print(f"✅ 能看到 {len(work_orders)} 个工单")
        
        if work_orders:
            for wo in work_orders[:3]:  # 只显示前3个
                print(f"   - [{wo['id']}] {wo['title']}")
                print(f"     创建者: {wo.get('creator_name', 'N/A')}, 受理人: {wo.get('assignee_name', 'N/A')}")
    else:
        print(f"❌ 获取工单列表失败: {response.status_code}")
        print(f"   {response.text}")

def test_create_and_assign(creator_role, creator_token, assignee_id, assignee_name):
    """测试创建工单并分配"""
    print(f"\n{'='*60}")
    print(f"📝 测试 {creator_role} 给 {assignee_name} 分配工单")
    print('='*60)
    
    headers = get_headers(creator_token)
    
    work_order_data = {
        'title': f'[测试] {creator_role} -> {assignee_name} ({datetime.now().strftime("%H:%M:%S")})',
        'description': '这是一个测试工单，用于验证权限系统',
        'type_id': 1,
        'priority_id': 2,
        'status_id': 1,
        'assignee_id': assignee_id
    }
    
    response = requests.post(
        f"{BASE_URL}/work-orders/",
        headers=headers,
        json=work_order_data
    )
    
    if response.status_code == 201:
        data = response.json()
        work_order = data.get('data', {})
        print(f"✅ 工单创建成功: ID={work_order.get('id')}")
        return work_order.get('id')
    else:
        print(f"❌ 工单创建失败: {response.status_code}")
        print(f"   {response.text}")
        return None

def test_update_status(role_name, token, work_order_id, new_status_id):
    """测试更新工单状态"""
    print(f"\n{'='*60}")
    print(f"✏️ 测试 {role_name} 修改工单状态 (ID={work_order_id})")
    print('='*60)
    
    headers = get_headers(token)
    
    response = requests.put(
        f"{BASE_URL}/work-orders/{work_order_id}",
        headers=headers,
        json={'status_id': new_status_id}
    )
    
    if response.status_code == 200:
        print(f"✅ 状态更新成功: 新状态ID={new_status_id}")
    else:
        print(f"❌ 状态更新失败: {response.status_code}")
        print(f"   {response.text}")

def test_assign_to_admin(role_name, token):
    """测试分配工单给admin（应该失败）"""
    print(f"\n{'='*60}")
    print(f"🚫 测试 {role_name} 给 admin 分配工单（预期失败）")
    print('='*60)
    
    headers = get_headers(token)
    
    # 假设admin的ID是1（需要根据实际情况调整）
    work_order_data = {
        'title': '[测试] 尝试分配给admin',
        'description': '这个应该失败',
        'type_id': 1,
        'priority_id': 2,
        'assignee_id': 1  # admin的ID
    }
    
    response = requests.post(
        f"{BASE_URL}/work-orders/",
        headers=headers,
        json=work_order_data
    )
    
    if response.status_code != 201:
        print(f"✅ 正确拒绝: {response.json().get('message', '未知错误')}")
    else:
        print(f"❌ 错误：应该拒绝但创建成功了！")

def main():
    print("="*60)
    print("🧪 工单权限系统测试")
    print("="*60)
    print(f"测试环境: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 登录所有账号
    tokens = {}
    for role, credentials in ACCOUNTS.items():
        token = login(credentials['username'], credentials['password'])
        if token:
            tokens[role] = token
            print(f"✅ {role} 登录成功")
        else:
            print(f"❌ {role} 登录失败")
    
    if not tokens:
        print("\n❌ 没有账号登录成功，测试终止")
        return
    
    print("\n" + "="*60)
    print("📊 第一阶段：测试工单可见性")
    print("="*60)
    
    # 测试各角色的可见性
    for role, token in tokens.items():
        test_visibility(role, token)
    
    print("\n" + "="*60)
    print("📝 第二阶段：测试工单创建和分配")
    print("="*60)
    
    # 模拟实际工作流程
    work_order_ids = []
    
    # 场景1：区域经理给店长分配工单
    if 'regional_manager' in tokens and 'shop_manager' in tokens:
        wo_id = test_create_and_assign(
            'regional_manager',
            tokens['regional_manager'],
            3,  # 假设shop_manager的ID是3
            'shop_manager'
        )
        if wo_id:
            work_order_ids.append(('regional_manager', wo_id))
    
    # 场景2：店长给外卖运营分配工单
    if 'shop_manager' in tokens and 'eleme_operator' in tokens:
        wo_id = test_create_and_assign(
            'shop_manager',
            tokens['shop_manager'],
            4,  # 假设eleme_operator的ID是4
            'eleme_operator'
        )
        if wo_id:
            work_order_ids.append(('shop_manager', wo_id))
    
    print("\n" + "="*60)
    print("✏️ 第三阶段：测试状态更新")
    print("="*60)
    
    # 测试状态更新权限
    if work_order_ids and 'shop_manager' in tokens:
        role, wo_id = work_order_ids[0]
        # 店长尝试更新区域经理创建的工单状态
        test_update_status('shop_manager', tokens['shop_manager'], wo_id, 2)
    
    print("\n" + "="*60)
    print("🚫 第四阶段：测试权限边界")
    print("="*60)
    
    # 测试不能给admin分配工单
    if 'regional_manager' in tokens:
        test_assign_to_admin('regional_manager', tokens['regional_manager'])
    
    print("\n" + "="*60)
    print("✅ 测试完成！")
    print("="*60)
    print("\n请检查上述测试结果，确保：")
    print("  1. ✅ Admin能看到所有工单")
    print("  2. ✅ 其他角色只能看到自己相关的工单")
    print("  3. ✅ 所有角色可以创建和分配工单")
    print("  4. ✅ 受理人可以修改工单状态")
    print("  5. ✅ 不能给admin分配工单")
    print()

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {str(e)}")
        import traceback
        traceback.print_exc()

