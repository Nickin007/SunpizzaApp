"""测试MySQL连接和.env配置"""
import os
import pymysql
from dotenv import load_dotenv

# 加载.env文件
load_dotenv()

print("=" * 60)
print("🔍 调试MySQL连接问题")
print("=" * 60)
print()

# 显示读取到的配置
print("📋 从.env文件读取到的配置：")
print(f"  MYSQL_HOST: {os.getenv('MYSQL_HOST')}")
print(f"  MYSQL_PORT: {os.getenv('MYSQL_PORT')}")
print(f"  MYSQL_USER: {os.getenv('MYSQL_USER')}")
print(f"  MYSQL_PASSWORD: {'*' * len(os.getenv('MYSQL_PASSWORD', ''))} (长度: {len(os.getenv('MYSQL_PASSWORD', ''))})")
print(f"  MYSQL_DATABASE: {os.getenv('MYSQL_DATABASE')}")
print()

# 测试连接1: 使用localhost
print("🧪 测试1: 使用 localhost")
try:
    conn = pymysql.connect(
        host='localhost',
        port=int(os.getenv('MYSQL_PORT', 3306)),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        charset='utf8mb4'
    )
    print("  ✅ 连接成功！")
    conn.close()
except Exception as e:
    print(f"  ❌ 连接失败: {e}")

print()

# 测试连接2: 使用127.0.0.1
print("🧪 测试2: 使用 127.0.0.1")
try:
    conn = pymysql.connect(
        host='127.0.0.1',
        port=int(os.getenv('MYSQL_PORT', 3306)),
        user=os.getenv('MYSQL_USER'),
        password=os.getenv('MYSQL_PASSWORD'),
        charset='utf8mb4'
    )
    print("  ✅ 连接成功！")
    conn.close()
except Exception as e:
    print(f"  ❌ 连接失败: {e}")

print()

# 测试连接3: 直接使用密码（排除.env问题）
print("🧪 测试3: 直接使用密码 YYyy1q2w3e")
try:
    conn = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='YYyy1q2w3e',
        charset='utf8mb4'
    )
    print("  ✅ 连接成功！")
    
    # 显示MySQL版本
    cursor = conn.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"  📦 MySQL版本: {version[0]}")
    
    conn.close()
except Exception as e:
    print(f"  ❌ 连接失败: {e}")

print()
print("=" * 60)
print("💡 分析建议：")
print("  - 如果测试3成功，说明密码正确但.env加载有问题")
print("  - 如果测试2成功但测试1失败，需要修改.env中的MYSQL_HOST为127.0.0.1")
print("  - 如果都失败，可能是MySQL权限配置问题")
print("=" * 60)

