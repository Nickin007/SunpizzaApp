import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/services/storage_service.dart';
import '../core/constants/api_constants.dart';
import '../models/user_model.dart';

/// 认证状态管理
class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final StorageService _storage = StorageService();

  User? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;

  /// 登录
  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.post(
        ApiConstants.login,
        data: {
          'username': username,
          'password': password,
        },
      );

      if (response.data['success']) {
        final token = response.data['data']['token'];
        final userInfo = response.data['data']['user'];

        await _storage.saveToken(token);
        await _storage.saveUserInfo(userInfo);

        _currentUser = User.fromJson(userInfo);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data['message'] ?? '登录失败';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = '网络错误，请稍后重试';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// 登出
  Future<void> logout() async {
    await _storage.clearAll();
    _currentUser = null;
    notifyListeners();
  }

  /// 检查登录状态
  Future<bool> checkAuth() async {
    final userInfo = await _storage.getUserInfo();
    if (userInfo != null) {
      _currentUser = User.fromJson(userInfo);
      notifyListeners();
      return true;
    }
    return false;
  }
}

