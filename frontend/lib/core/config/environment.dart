/// 环境配置
/// 用于区分开发环境和生产环境的 API 地址

enum Environment {
  /// 开发环境（本地电脑 + 手机真机调试）
  development,
  
  /// 生产环境（部署到服务器）
  production,
}

class EnvironmentConfig {
  /// 当前环境（可以手动切换）
  /// 
  /// 🔧 开发时改成 Environment.development
  /// 🚀 上线前改成 Environment.production
  static const Environment currentEnvironment = Environment.development;
  
  /// 开发环境配置
  static const String developmentApiUrl = 'http://192.168.31.164:5000'; // 👈 你的电脑 IP
  
  /// 生产环境配置
  static const String productionApiUrl = 'https://api.sunpizza.com'; // 👈 修改成你的服务器域名
  
  /// 获取当前环境的 API 地址
  static String get apiBaseUrl {
    switch (currentEnvironment) {
      case Environment.development:
        return developmentApiUrl;
      case Environment.production:
        return productionApiUrl;
    }
  }
  
  /// 是否为开发环境
  static bool get isDevelopment => currentEnvironment == Environment.development;
  
  /// 是否为生产环境
  static bool get isProduction => currentEnvironment == Environment.production;
  
  /// 环境名称（用于调试）
  static String get environmentName {
    switch (currentEnvironment) {
      case Environment.development:
        return '开发环境';
      case Environment.production:
        return '生产环境';
    }
  }
  
  /// 打印当前环境信息（用于调试）
  static void printEnvironmentInfo() {
    print('========================================');
    print('🌍 当前环境: $environmentName');
    print('🔗 API 地址: $apiBaseUrl');
    print('========================================');
  }
}

