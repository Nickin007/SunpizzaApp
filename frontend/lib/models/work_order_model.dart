/// 工单模型
class WorkOrder {
  final int id;
  final String title;
  final String? description;
  final TaskType? type;
  final Priority? priority;
  final Status? status;
  final UserInfo? creator;
  final UserInfo? assignee;
  final ShopInfo? shop;
  final String? dueDate;
  final int completionProgress;
  final String? completionNotes;
  final String? createdAt;
  final String? updatedAt;
  final List<Comment>? comments;
  final List<Attachment>? attachments;

  WorkOrder({
    required this.id,
    required this.title,
    this.description,
    this.type,
    this.priority,
    this.status,
    this.creator,
    this.assignee,
    this.shop,
    this.dueDate,
    this.completionProgress = 0,
    this.completionNotes,
    this.createdAt,
    this.updatedAt,
    this.comments,
    this.attachments,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      type: json['type'] != null ? TaskType.fromJson(json['type']) : null,
      priority: json['priority'] != null ? Priority.fromJson(json['priority']) : null,
      status: json['status'] != null ? Status.fromJson(json['status']) : null,
      creator: json['creator'] != null ? UserInfo.fromJson(json['creator']) : null,
      assignee: json['assignee'] != null ? UserInfo.fromJson(json['assignee']) : null,
      shop: json['shop'] != null ? ShopInfo.fromJson(json['shop']) : null,
      dueDate: json['due_date'],
      completionProgress: json['completion_progress'] ?? 0,
      completionNotes: json['completion_notes'],
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
      comments: json['comments'] != null
          ? (json['comments'] as List).map((c) => Comment.fromJson(c)).toList()
          : null,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List).map((a) => Attachment.fromJson(a)).toList()
          : null,
    );
  }
}

class TaskType {
  final int id;
  final String typeName;
  final String? color;

  TaskType({required this.id, required this.typeName, this.color});

  factory TaskType.fromJson(Map<String, dynamic> json) {
    return TaskType(
      id: json['id'],
      typeName: json['type_name'],
      color: json['color'],
    );
  }
}

class Priority {
  final int id;
  final String priorityName;
  final String? color;
  final int? sortOrder;

  Priority({required this.id, required this.priorityName, this.color, this.sortOrder});

  factory Priority.fromJson(Map<String, dynamic> json) {
    return Priority(
      id: json['id'],
      priorityName: json['priority_name'],
      color: json['color'],
      sortOrder: json['sort_order'],
    );
  }
}

class Status {
  final int id;
  final String statusName;
  final String? color;

  Status({required this.id, required this.statusName, this.color});

  factory Status.fromJson(Map<String, dynamic> json) {
    return Status(
      id: json['id'],
      statusName: json['status_name'],
      color: json['color'],
    );
  }
}

class UserInfo {
  final int id;
  final String realName;

  UserInfo({required this.id, required this.realName});

  factory UserInfo.fromJson(Map<String, dynamic> json) {
    return UserInfo(
      id: json['id'],
      realName: json['real_name'],
    );
  }
}

class ShopInfo {
  final int id;
  final String name;
  final String? address;

  ShopInfo({required this.id, required this.name, this.address});

  factory ShopInfo.fromJson(Map<String, dynamic> json) {
    return ShopInfo(
      id: json['id'],
      name: json['name'],
      address: json['address'],
    );
  }
}

class Comment {
  final int id;
  final String content;
  final UserInfo? author;
  final String? attachmentUrl;
  final String? createdAt;

  Comment({
    required this.id,
    required this.content,
    this.author,
    this.attachmentUrl,
    this.createdAt,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['id'],
      content: json['content'],
      author: json['author'] != null ? UserInfo.fromJson(json['author']) : null,
      attachmentUrl: json['attachment_url'],
      createdAt: json['created_at'],
    );
  }
}

class Attachment {
  final int id;
  final String fileName;
  final String fileUrl;
  final String? fileType;
  final String? uploadedBy;
  final String? uploadedAt;

  Attachment({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    this.fileType,
    this.uploadedBy,
    this.uploadedAt,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'],
      fileName: json['file_name'],
      fileUrl: json['file_url'],
      fileType: json['file_type'],
      uploadedBy: json['uploaded_by'],
      uploadedAt: json['uploaded_at'],
    );
  }
}

