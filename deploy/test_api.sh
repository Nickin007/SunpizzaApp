#!/bin/bash

# 圣比萨后端 API 测试脚本
# 测试所有主要接口是否正常工作

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API 基础地址
API_BASE="http://118.89.73.199"

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}测试 ${TOTAL_TESTS}: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${API_BASE}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    # 分离响应体和状态码
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    echo -e "请求: ${method} ${endpoint}"
    [ -n "$data" ] && echo -e "数据: ${data}"
    echo -e "响应码: ${http_code}"
    echo -e "响应体: ${body}" | head -c 500
    
    # 检查状态码
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ 失败 (期望: ${expected_code}, 实际: ${http_code})${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo ""
echo "========================================"
echo "🧪 圣比萨后端 API 测试"
echo "========================================"
echo -e "API 地址: ${API_BASE}"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ============================================================
# 基础测试
# ============================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📡 基础服务测试${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

test_api "健康检查" "GET" "/health" "" "200"

# ============================================================
# 用户认证测试
# ============================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}👤 用户认证测试${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 测试登录（管理员）
test_api "管理员登录" "POST" "/api/users/login" \
    '{"username":"admin","password":"admin123"}' "200"

# 保存 Token
if [ $? -eq 0 ]; then
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}Token 已保存${NC}"
fi

# 测试错误密码
test_api "错误密码登录" "POST" "/api/users/login" \
    '{"username":"admin","password":"wrongpassword"}' "401"

# 测试不存在的用户
test_api "不存在的用户登录" "POST" "/api/users/login" \
    '{"username":"notexist","password":"123456"}' "401"

# ============================================================
# 门店管理测试
# ============================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🏪 门店管理测试${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 获取门店列表（需要认证）
if [ -n "$TOKEN" ]; then
    echo ""
    echo -e "${YELLOW}测试: 获取门店列表${NC}"
    response=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/shops/" \
        -H "Authorization: Bearer $TOKEN")
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "请求: GET /api/shops"
    echo -e "响应码: ${http_code}"
    echo -e "响应体: ${body}" | head -c 500
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  跳过需要认证的测试（未获取到 Token）${NC}"
fi

# ============================================================
# 工单管理测试
# ============================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 工单管理测试${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 获取工单列表（需要认证）
if [ -n "$TOKEN" ]; then
    echo ""
    echo -e "${YELLOW}测试: 获取工单列表${NC}"
    response=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/work-orders/" \
        -H "Authorization: Bearer $TOKEN")
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "请求: GET /api/work-orders"
    echo -e "响应码: ${http_code}"
    echo -e "响应体: ${body}" | head -c 500
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi

# ============================================================
# 培训中心测试
# ============================================================

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📚 培训中心测试${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 获取培训分类（需要认证）
if [ -n "$TOKEN" ]; then
    echo ""
    echo -e "${YELLOW}测试: 获取培训分类${NC}"
    response=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/training/categories" \
        -H "Authorization: Bearer $TOKEN")
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "请求: GET /api/training/categories"
    echo -e "响应码: ${http_code}"
    echo -e "响应体: ${body}" | head -c 500
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
fi

# ============================================================
# 测试总结
# ============================================================

echo ""
echo ""
echo "========================================"
echo "📊 测试总结"
echo "========================================"
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"
echo -e "成功率: $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
echo ""
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 如果有失败的测试，退出码为 1
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}⚠️  部分测试失败，请检查后端日志：${NC}"
    echo "  tail -f /home/ubuntu/SunpizzaApp/backend/logs/gunicorn_error.log"
    exit 1
else
    echo -e "${GREEN}🎉 所有测试通过！后端部署成功！${NC}"
    exit 0
fi

