import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../core/services/api_service.dart';
import '../core/services/storage_service.dart';
import '../core/constants/api_constants.dart';
import '../core/config/environment.dart';
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
      // 打印调试信息
      if (kDebugMode) {
        print('========================================');
        print('🔐 Login Request');
        print('Environment: ${EnvironmentConfig.environmentName}');
        print('API URL: ${EnvironmentConfig.apiBaseUrl}');
        print('Login Endpoint: ${ApiConstants.login}');
        print('Full URL: ${EnvironmentConfig.apiBaseUrl}${ApiConstants.login}');
        print('========================================');
      }

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
        
        if (kDebugMode) {
          print('✅ Login Success: ${_currentUser?.realName}');
        }
        return true;
      } else {
        _errorMessage = response.data['message'] ?? '登录失败';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      // 详细的错误信息（用于调试）
      if (kDebugMode) {
        print('========================================');
        print('❌ Login Error');
        print('Error Type: ${e.runtimeType}');
        
        if (e is DioException) {
          print('Dio Error Type: ${e.type}');
          print('Error Message: ${e.message}');
          print('Response: ${e.response?.data}');
          print('Status Code: ${e.response?.statusCode}');
          
          // 针对不同错误类型给出提示
          switch (e.type) {
            case DioExceptionType.connectionTimeout:
              print('⚠️ Connection timeout - server not responding');
              break;
            case DioExceptionType.sendTimeout:
              print('⚠️ Send timeout');
              break;
            case DioExceptionType.receiveTimeout:
              print('⚠️ Receive timeout');
              break;
            case DioExceptionType.badResponse:
              print('⚠️ Bad response from server');
              break;
            case DioExceptionType.cancel:
              print('⚠️ Request cancelled');
              break;
            case DioExceptionType.connectionError:
              print('⚠️ Connection error - cannot reach server');
              print('Possible reasons:');
              print('  1. Server is down');
              print('  2. Wrong IP/Port');
              print('  3. Firewall blocking');
              print('  4. iOS Info.plist missing HTTP exception');
              break;
            case DioExceptionType.unknown:
              print('⚠️ Unknown error: ${e.message}');
              break;
            default:
              print('⚠️ Other error');
          }
        } else {
          print('Error: $e');
        }
        print('========================================');
      }
      
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

