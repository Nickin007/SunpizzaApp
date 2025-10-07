import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/constants/api_constants.dart';
import '../models/shop_model.dart';

/// 门店状态管理
class ShopProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Shop> _shops = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<Shop> get shops => _shops;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// 获取门店列表
  Future<void> fetchShops() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.get(ApiConstants.shops);

      if (response.data['success']) {
        final items = response.data['data']['items'] as List;
        _shops = items.map((item) => Shop.fromJson(item)).toList();
        _errorMessage = null;
      } else {
        _errorMessage = response.data['message'];
      }
    } catch (e) {
      _errorMessage = '获取门店列表失败';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

