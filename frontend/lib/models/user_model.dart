/// 用户模型
class User {
  final int id;
  final String username;
  final String realName;
  final String role;
  final int? shopId;
  final String? shopName;
  final String? createdAt;

  User({
    required this.id,
    required this.username,
    required this.realName,
    required this.role,
    this.shopId,
    this.shopName,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      realName: json['real_name'],
      role: json['role'],
      shopId: json['shop_id'],
      shopName: json['shop_name'],
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'real_name': realName,
      'role': role,
      'shop_id': shopId,
      'shop_name': shopName,
      'created_at': createdAt,
    };
  }

  /// 获取角色显示名称
  String getRoleDisplayName() {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'regional_manager':
        return '区域经理';
      case 'shop_manager':
        return '店长';
      default:
        return '未知';
    }
  }
}

