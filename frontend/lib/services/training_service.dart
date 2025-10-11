import '../core/services/api_service.dart';

/// 培训模块 API 服务
class TrainingService {
  final ApiService _apiService = ApiService();

  /// 获取培训分类
  /// [type] - 可选，筛选分类类型：product/service/operation
  Future<List<Map<String, dynamic>>> getCategories({String? type}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (type != null) queryParams['type'] = type;

      final response = await _apiService.get(
        '/api/training/categories',
        queryParameters: queryParams,
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取分类失败');
      }
    } catch (e) {
      throw Exception('获取分类失败: $e');
    }
  }

  /// 获取课程列表
  /// [categoryId] - 可选，按分类筛选
  Future<List<Map<String, dynamic>>> getCourses({int? categoryId}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (categoryId != null) queryParams['category_id'] = categoryId;

      final response = await _apiService.get(
        '/api/training/courses',
        queryParameters: queryParams,
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取课程列表失败');
      }
    } catch (e) {
      throw Exception('获取课程列表失败: $e');
    }
  }

  /// 获取课程详情（包含视频、文档、学习记录）
  Future<Map<String, dynamic>> getCourseDetail(int courseId) async {
    try {
      final response = await _apiService.get(
        '/api/training/courses/$courseId',
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '获取课程详情失败');
      }
    } catch (e) {
      throw Exception('获取课程详情失败: $e');
    }
  }

  /// 开始学习课程
  Future<Map<String, dynamic>> startLearning(int courseId) async {
    try {
      final response = await _apiService.post(
        '/api/training/courses/$courseId/start',
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '开始学习失败');
      }
    } catch (e) {
      throw Exception('开始学习失败: $e');
    }
  }

  /// 更新视频观看进度
  /// [courseId] - 课程ID
  /// [progress] - 观看进度（秒）
  Future<void> updateVideoProgress(int courseId, int progress) async {
    try {
      await _apiService.post(
        '/api/training/courses/$courseId/update-progress',
        data: {'video_progress': progress},
      );
    } catch (e) {
      // 静默失败，不影响用户体验
      print('更新视频进度失败: $e');
    }
  }

  /// 标记文档为已阅读
  Future<void> markDocumentRead(int courseId) async {
    try {
      await _apiService.post(
        '/api/training/courses/$courseId/mark-document-read',
      );
    } catch (e) {
      print('标记文档已读失败: $e');
    }
  }

  /// 完成课程学习
  Future<Map<String, dynamic>> completeLearning(int courseId) async {
    try {
      final response = await _apiService.post(
        '/api/training/courses/$courseId/complete',
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '完成学习失败');
      }
    } catch (e) {
      throw Exception('完成学习失败: $e');
    }
  }

  /// 获取我的学习记录
  Future<List<Map<String, dynamic>>> getMyLearningRecords() async {
    try {
      final response = await _apiService.get(
        '/api/training/my-records',
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取学习记录失败');
      }
    } catch (e) {
      throw Exception('获取学习记录失败: $e');
    }
  }
}

