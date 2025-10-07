import '../config/environment.dart';

/// API相关常量
class ApiConstants {
  // 基础URL - 根据环境配置自动切换
  static String get baseUrl => EnvironmentConfig.apiBaseUrl;

  // API端点
  static const String login = '/api/users/login';
  static const String register = '/api/users/register';
  static const String users = '/api/users';
  
  static const String shops = '/api/shops';
  
  static const String workOrders = '/api/work-orders';
  static const String workOrderComments = '/api/work-orders/{id}/comments';
  static const String taskTypes = '/api/work-orders/dict/types';
  static const String priorities = '/api/work-orders/dict/priorities';
  static const String statuses = '/api/work-orders/dict/statuses';
  
  static const String routineTaskTemplates = '/api/routine-tasks/templates';
  static const String myRoutineTasks = '/api/routine-tasks/my-tasks';
  static const String completeRoutineTask = '/api/routine-tasks/{id}/complete';
  
  static const String trainingCategories = '/api/training/categories';
  static const String trainingCourses = '/api/training/courses';
  static const String startLearning = '/api/training/courses/{id}/start';
  static const String completeLearning = '/api/training/courses/{id}/complete';
  static const String myLearningRecords = '/api/training/my-records';

  // 超时设置
  static const int connectTimeout = 30000; // 30秒
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;
}

