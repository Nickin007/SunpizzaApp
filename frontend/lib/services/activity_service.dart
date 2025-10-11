import '../core/services/api_service.dart';

/// 活动日志服务
class ActivityService {
  final ApiService _apiService = ApiService();

  /// 获取活动日志列表
  /// 
  /// [page] 页码，默认为1
  /// [perPage] 每页数量，默认为20
  Future<Map<String, dynamic>> getActivities({
    int page = 1,
    int perPage = 20,
  }) async {
    try {
      print('📊 获取活动日志列表 - 页码: $page');
      
      final response = await _apiService.get(
        '/api/work-orders/activities',
        queryParameters: {
          'page': page,
          'per_page': perPage,
        },
      );

      if (response.data['success']) {
        print('✅ 活动日志获取成功，共 ${response.data['total']} 条');
        return response.data;
      } else {
        throw Exception(response.data['message'] ?? '获取活动日志失败');
      }
    } catch (e) {
      print('❌ 获取活动日志失败: $e');
      rethrow;
    }
  }

  /// 格式化时间显示（相对时间）
  /// 
  /// 例如：刚刚、5分钟前、1小时前、昨天、2天前
  String formatRelativeTime(String? isoTime) {
    if (isoTime == null) return '未知时间';
    
    try {
      final activityTime = DateTime.parse(isoTime);
      final now = DateTime.now();
      final difference = now.difference(activityTime);

      if (difference.inSeconds < 60) {
        return '刚刚';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes}分钟前';
      } else if (difference.inHours < 24) {
        return '${difference.inHours}小时前';
      } else if (difference.inDays == 1) {
        return '昨天';
      } else if (difference.inDays < 7) {
        return '${difference.inDays}天前';
      } else {
        // 超过7天，显示具体日期
        return '${activityTime.month}月${activityTime.day}日';
      }
    } catch (e) {
      print('❌ 时间格式化失败: $e');
      return '未知时间';
    }
  }

  /// 格式化完整时间显示
  /// 
  /// 例如：2025-10-11 14:30:25
  String formatFullTime(String? isoTime) {
    if (isoTime == null) return '未知时间';
    
    try {
      final activityTime = DateTime.parse(isoTime);
      return '${activityTime.year}-${activityTime.month.toString().padLeft(2, '0')}-${activityTime.day.toString().padLeft(2, '0')} '
          '${activityTime.hour.toString().padLeft(2, '0')}:${activityTime.minute.toString().padLeft(2, '0')}:${activityTime.second.toString().padLeft(2, '0')}';
    } catch (e) {
      print('❌ 时间格式化失败: $e');
      return '未知时间';
    }
  }
}

