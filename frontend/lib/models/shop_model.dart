/// 门店模型
class Shop {
  final int id;
  final String name;
  final String? address;
  final int? regionalManagerId;
  final String? regionalManagerName;
  final String? createdAt;

  Shop({
    required this.id,
    required this.name,
    this.address,
    this.regionalManagerId,
    this.regionalManagerName,
    this.createdAt,
  });

  factory Shop.fromJson(Map<String, dynamic> json) {
    return Shop(
      id: json['id'],
      name: json['name'],
      address: json['address'],
      regionalManagerId: json['regional_manager_id'],
      regionalManagerName: json['regional_manager_name'],
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'regional_manager_id': regionalManagerId,
      'regional_manager_name': regionalManagerName,
      'created_at': createdAt,
    };
  }
}

