/// 环境配置
/// 用于区分开发环境和生产环境的 API 地址

import 'package:flutter/foundation.dart';

enum Environment {
  /// 开发环境（本地电脑 + 手机真机调试）
  development,
  
  /// 生产环境（部署到服务器）
  production,
}

class EnvironmentConfig {
  /// 🤖 自动检测当前环境
  /// 
  /// Debug 模式（flutter run）    → 开发环境
  /// Release 模式（flutter build） → 生产环境
  /// 
  /// 也可以手动指定：设置 _forceEnvironment
  static Environment? _forceEnvironment; // null = 自动检测
  
  /// 手动强制指定环境（用于特殊测试）
  /// 例如：EnvironmentConfig.forceEnvironment(Environment.production);
  static void forceEnvironment(Environment? env) {
    _forceEnvironment = env;
  }
  
  /// 获取当前环境
  static Environment get currentEnvironment {
    // 如果手动指定了环境，使用指定的
    if (_forceEnvironment != null) {
      return _forceEnvironment!;
    }
    
    // 自动检测：Debug 模式 = 开发环境，Release 模式 = 生产环境
    return kDebugMode ? Environment.development : Environment.production;
  }
  
  /// 开发环境配置
  static const String developmentApiUrl = 'http://192.168.31.164:5000'; // 👈 你的电脑 IP
  
  /// 生产环境配置
  static const String productionApiUrl = 'http://118.89.73.199'; // 👈 服务器地址
  
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

