// ===== 在浏览器 F12 Console 中运行此脚本 =====
// 复制整个脚本，粘贴到浏览器 Console 中，按回车运行

console.clear();
console.log('%c╔═══════════════════════════════════════════════════════╗', 'color: #e31e24; font-weight: bold;');
console.log('%c║     仪表盘 API 详细诊断 v2.0                         ║', 'color: #e31e24; font-weight: bold;');
console.log('%c╚═══════════════════════════════════════════════════════╝', 'color: #e31e24; font-weight: bold;');
console.log('');

const BASE_URL = 'http://118.89.73.199:5000/api';
const token = localStorage.getItem('admin_token');

if (!token) {
    console.log('%c❌ 未找到 Token！请先登录系统。', 'color: red; font-size: 16px; font-weight: bold;');
} else {
    console.log('%c✅ Token 已找到', 'color: green; font-weight: bold;');
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('');
}

// 测试工单统计 API
async function testWorkOrderStats() {
    console.log('%c【测试1】工单统计 API', 'color: #e31e24; font-weight: bold; font-size: 14px;');
    console.log('请求 URL:', `${BASE_URL}/work-orders/statistics`);
    
    try {
        const response = await fetch(`${BASE_URL}/work-orders/statistics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('响应状态:', response.status, response.statusText);
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
            console.log('%c✅ 工单统计成功', 'color: green; font-weight: bold;');
            console.log('数据:', data.data);
        } else {
            console.log('%c❌ 工单统计失败', 'color: red; font-weight: bold;');
            console.log('错误:', data);
        }
    } catch (error) {
        console.log('%c❌ 请求异常', 'color: red; font-weight: bold;');
        console.log('错误:', error);
    }
    console.log('');
}

// 测试用户统计 API
async function testUserStats() {
    console.log('%c【测试2】用户统计 API', 'color: #e31e24; font-weight: bold; font-size: 14px;');
    
    const roles = [
        { name: '管理员', value: 'admin' },
        { name: '区域经理', value: 'regional_manager' },
        { name: '店长', value: 'shop_manager' },
        { name: '员工', value: 'employee' }
    ];
    
    for (const role of roles) {
        const url = `${BASE_URL}/users/?role=${role.value}&per_page=1000`;
        console.log(`请求 ${role.name}:`, url);
        
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('  响应状态:', response.status, response.statusText);
            const data = await response.json();
            
            if (response.ok && data.code === 200) {
                console.log(`  %c✅ ${role.name}: ${data.data.total} 个`, 'color: green; font-weight: bold;');
            } else {
                console.log(`  %c❌ ${role.name} 失败`, 'color: red; font-weight: bold;');
                console.log('  错误:', data);
            }
        } catch (error) {
            console.log(`  %c❌ ${role.name} 请求异常`, 'color: red; font-weight: bold;');
            console.log('  错误:', error);
        }
    }
    console.log('');
}

// 测试门店统计 API
async function testShopStats() {
    console.log('%c【测试3】门店统计 API', 'color: #e31e24; font-weight: bold; font-size: 14px;');
    const url = `${BASE_URL}/shops/?per_page=1000`;
    console.log('请求 URL:', url);
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('响应状态:', response.status, response.statusText);
        const data = await response.json();
        
        if (response.ok && data.code === 200) {
            console.log('%c✅ 门店统计成功', 'color: green; font-weight: bold;');
            console.log('门店总数:', data.data.total);
            console.log('门店列表:', data.data.items);
        } else {
            console.log('%c❌ 门店统计失败', 'color: red; font-weight: bold;');
            console.log('错误:', data);
        }
    } catch (error) {
        console.log('%c❌ 请求异常', 'color: red; font-weight: bold;');
        console.log('错误:', error);
    }
    console.log('');
}

// 检查前端代码逻辑
function checkFrontendCode() {
    console.log('%c【测试4】前端代码检查', 'color: #e31e24; font-weight: bold; font-size: 14px;');
    console.log('检查前端是否正确处理 API 响应...');
    console.log('');
    console.log('期望的响应格式:');
    console.log('{');
    console.log('  "code": 200,');
    console.log('  "data": {');
    console.log('    "items": [...],');
    console.log('    "total": 10');
    console.log('  }');
    console.log('}');
    console.log('');
}

// 运行所有测试
async function runAllTests() {
    await testWorkOrderStats();
    await testUserStats();
    await testShopStats();
    checkFrontendCode();
    
    console.log('%c═══════════════════════════════════════════════════════', 'color: #e31e24;');
    console.log('%c诊断完成！', 'color: green; font-size: 16px; font-weight: bold;');
    console.log('');
    console.log('%c📋 如何解决问题：', 'color: #1890ff; font-size: 14px; font-weight: bold;');
    console.log('1. 如果某个 API 返回 401/403 → Token 问题，重新登录');
    console.log('2. 如果某个 API 返回 404 → 后端路由问题');
    console.log('3. 如果某个 API 返回 500 → 后端代码错误，检查服务器日志');
    console.log('4. 如果 total 为 0 但没报错 → 数据库没有数据');
    console.log('');
}

// 自动运行
runAllTests();

