import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/constants/api_constants.dart';
import '../models/work_order_model.dart';

/// 工单状态管理
class WorkOrderProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<WorkOrder> _workOrders = [];
  WorkOrder? _currentWorkOrder;
  bool _isLoading = false;
  String? _errorMessage;

  List<WorkOrder> get workOrders => _workOrders;
  WorkOrder? get currentWorkOrder => _currentWorkOrder;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// 获取工单列表
  Future<void> fetchWorkOrders({
    int? statusId,
    int? typeId,
    int? priorityId,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final queryParams = <String, dynamic>{};
      if (statusId != null) queryParams['status_id'] = statusId;
      if (typeId != null) queryParams['type_id'] = typeId;
      if (priorityId != null) queryParams['priority_id'] = priorityId;

      final response = await _apiService.get(
        ApiConstants.workOrders,
        queryParameters: queryParams,
      );

      if (response.data['success']) {
        final items = response.data['data']['items'] as List;
        _workOrders = items.map((item) => WorkOrder.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response.data['message'];
      }
    } catch (e) {
      _errorMessage = '获取工单列表失败';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 获取工单详情
  Future<void> fetchWorkOrderDetail(int id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.get('${ApiConstants.workOrders}/$id');

      if (response.data['success']) {
        _currentWorkOrder = WorkOrder.fromJson(response.data['data']);
        _errorMessage = null;
      } else {
        _errorMessage = response.data['message'];
      }
    } catch (e) {
      _errorMessage = '获取工单详情失败';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 创建工单
  Future<bool> createWorkOrder(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.post(
        ApiConstants.workOrders,
        data: data,
      );

      if (response.data['success']) {
        _errorMessage = null;
        await fetchWorkOrders(); // 刷新列表
        return true;
      } else {
        _errorMessage = response.data['message'];
        return false;
      }
    } catch (e) {
      _errorMessage = '创建工单失败';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// 更新工单
  Future<bool> updateWorkOrder(int id, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.put(
        '${ApiConstants.workOrders}/$id',
        data: data,
      );

      if (response.data['success']) {
        _errorMessage = null;
        await fetchWorkOrderDetail(id); // 刷新详情
        return true;
      } else {
        _errorMessage = response.data['message'];
        return false;
      }
    } catch (e) {
      _errorMessage = '更新工单失败';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

