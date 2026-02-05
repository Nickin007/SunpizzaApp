# Gunicorn 配置文件 - 生产环境
import multiprocessing

# ⭐ 关键：监听所有网络接口，允许外部访问
bind = "0.0.0.0:5000"

# 工作进程数
workers = 4

# 工作模式
worker_class = "sync"

# 连接数
worker_connections = 1000

# 超时时间（秒）- 10分钟，用于POI分区县查询等长时间操作
timeout = 600

# 保持连接时间
keepalive = 2

# 日志配置
accesslog = "/home/ubuntu/SunpizzaApp/backend/logs/gunicorn_access.log"
errorlog = "/home/ubuntu/SunpizzaApp/backend/logs/gunicorn_error.log"
loglevel = "info"

# 进程命名
proc_name = "sunpizza_backend"

# Daemon（systemd 管理时设置为 False）
daemon = False

# PID 文件
pidfile = "/home/ubuntu/SunpizzaApp/backend/gunicorn.pid"

# 启动回调
def on_starting(server):
    print(f"🚀 Gunicorn 正在启动...")
    print(f"📡 监听地址: {bind}")
    print(f"👷 工作进程数: {workers}")

def when_ready(server):
    print(f"✅ Gunicorn 已就绪！")
    print(f"🌐 可以通过 http://{bind}/api 访问")

