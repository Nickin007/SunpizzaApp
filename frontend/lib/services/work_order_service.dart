import '../core/services/api_service.dart';

/// 工单模块 API 服务
class WorkOrderService {
  final ApiService _apiService = ApiService();

  WorkOrderService();

  /// 获取工单统计数据（用于首页仪表盘）
  Future<Map<String, dynamic>> getStats() async {
    try {
      final response = await _apiService.get('/api/work-orders/stats');
      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '获取统计数据失败');
      }
    } catch (e) {
      throw Exception('获取统计数据失败: $e');
    }
  }

  /// 获取工单列表
  /// 
  /// [statusId] 状态筛选（1=待受理, 2=进行中, 3=已完成, 4=已关闭）
  /// [page] 页码
  /// [perPage] 每页数量
  Future<Map<String, dynamic>> getWorkOrders({
    int? statusId,
    int page = 1,
    int perPage = 20,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'per_page': perPage,
        if (statusId != null) 'status_id': statusId,
      };

      final response = await _apiService.get(
        '/api/work-orders/',
        queryParameters: queryParams,
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '获取工单列表失败');
      }
    } catch (e) {
      throw Exception('获取工单列表失败: $e');
    }
  }

  /// 获取工单详情
  Future<Map<String, dynamic>> getWorkOrderDetail(int workOrderId) async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/$workOrderId',
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '获取工单详情失败');
      }
    } catch (e) {
      throw Exception('获取工单详情失败: $e');
    }
  }

  /// 创建工单
  Future<Map<String, dynamic>> createWorkOrder({
    required String title,
    required int typeId,
    required int priorityId,
    required int assigneeId, // ✅ 改为必填（新权限要求）
    String? description,
    int? shopId, // ✅ 改为可选（不再强制关联门店）
    String? dueDate,
  }) async {
    try {
      final data = {
        'title': title,
        'type_id': typeId,
        'priority_id': priorityId,
        'assignee_id': assigneeId, // ✅ 必填，不再使用 if
        if (description != null) 'description': description,
        if (shopId != null) 'shop_id': shopId,
        if (dueDate != null) 'due_date': dueDate,
      };

      final response = await _apiService.post(
        '/api/work-orders/',
        data: data,
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '创建工单失败');
      }
    } catch (e) {
      throw Exception('创建工单失败: $e');
    }
  }

  /// 更新工单
  Future<Map<String, dynamic>> updateWorkOrder(
    int workOrderId, {
    String? title,
    String? description,
    int? statusId,
    int? priorityId,
    String? completionNotes,
    String? dueDate,
  }) async {
    try {
      final data = {
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (statusId != null) 'status_id': statusId,
        if (priorityId != null) 'priority_id': priorityId,
        if (completionNotes != null) 'completion_notes': completionNotes,
        if (dueDate != null) 'due_date': dueDate,
      };

      final response = await _apiService.put(
        '/api/work-orders/$workOrderId',
        data: data,
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '更新工单失败');
      }
    } catch (e) {
      throw Exception('更新工单失败: $e');
    }
  }

  /// 添加评论
  Future<Map<String, dynamic>> addComment(
    int workOrderId, {
    required String content,
    String? attachmentUrl,
  }) async {
    try {
      final data = {
        'content': content,
        if (attachmentUrl != null) 'attachment_url': attachmentUrl,
      };

      final response = await _apiService.post(
        '/api/work-orders/$workOrderId/comments',
        data: data,
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '添加评论失败');
      }
    } catch (e) {
      throw Exception('添加评论失败: $e');
    }
  }

  /// 获取任务类型字典
  Future<List<Map<String, dynamic>>> getTaskTypes() async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/dict/types',
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取任务类型失败');
      }
    } catch (e) {
      throw Exception('获取任务类型失败: $e');
    }
  }

  /// 获取优先级字典
  Future<List<Map<String, dynamic>>> getPriorities() async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/dict/priorities',
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取优先级列表失败');
      }
    } catch (e) {
      throw Exception('获取优先级列表失败: $e');
    }
  }

  /// 获取状态字典
  Future<List<Map<String, dynamic>>> getStatuses() async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/dict/statuses',
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取状态列表失败');
      }
    } catch (e) {
      throw Exception('获取状态列表失败: $e');
    }
  }

  /// 获取可分配用户列表
  Future<List<Map<String, dynamic>>> getAssignableUsers() async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/assignable-users',
      );

      if (response.data['success']) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      } else {
        throw Exception(response.data['message'] ?? '获取用户列表失败');
      }
    } catch (e) {
      throw Exception('获取用户列表失败: $e');
    }
  }

  /// 获取门店列表
  Future<Map<String, dynamic>> getShops({int page = 1, int perPage = 100}) async {
    try {
      final response = await _apiService.get(
        '/api/shops/',
        queryParameters: {
          'page': page,
          'per_page': perPage,
        },
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '获取门店列表失败');
      }
    } catch (e) {
      throw Exception('获取门店列表失败: $e');
    }
  }

  /// 根据真实姓名搜索用户
  Future<Map<String, dynamic>> searchUserByName(String realName) async {
    try {
      final response = await _apiService.get(
        '/api/work-orders/search-user-by-name',
        queryParameters: {
          'real_name': realName,
        },
      );

      if (response.data['success']) {
        return response.data['data'];
      } else {
        throw Exception(response.data['message'] ?? '未找到该用户');
      }
    } catch (e) {
      throw Exception('$e');
    }
  }

  /// 删除工单（仅管理员）
  Future<void> deleteWorkOrder(int workOrderId) async {
    try {
      final response = await _apiService.delete(
        '/api/work-orders/$workOrderId',
      );

      if (!response.data['success']) {
        throw Exception(response.data['message'] ?? '删除工单失败');
      }
    } catch (e) {
      throw Exception('删除工单失败: $e');
    }
  }
}

