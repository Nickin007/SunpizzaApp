import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_colors.dart';
import '../../models/work_order_model.dart';

/// 工单详情页
class WorkOrderDetailScreen extends StatefulWidget {
  final int workOrderId;

  const WorkOrderDetailScreen({super.key, required this.workOrderId});

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  bool _isLoading = true;
  WorkOrder? _workOrder;
  
  // 评论输入控制器
  final _commentController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _loadWorkOrderDetail();
  }
  
  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
  
  /// 加载工单详情
  Future<void> _loadWorkOrderDetail() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      // TODO: 从 API 加载工单详情
      await Future.delayed(const Duration(seconds: 1));
      
      // 模拟数据
      setState(() {
        _workOrder = WorkOrder(
          id: widget.workOrderId,
          title: '【营销活动】双十一促销活动准备',
          description: '需要准备促销海报、更新菜单价格、培训员工促销话术',
          type: TaskType(id: 2, typeName: '营销活动', color: '#4ECDC4'),
          priority: Priority(id: 2, priorityName: '中', color: '#F4D03F'),
          status: Status(id: 2, statusName: '进行中', color: '#3498DB'),
          creator: UserInfo(id: 1, realName: '张经理'),
          assignee: UserInfo(id: 3, realName: '李店长'),
          shop: ShopInfo(id: 1, name: '圣比萨-王府井店', address: '北京市东城区王府井大街1号'),
          dueDate: '2025-11-11T23:59:59',
          completionProgress: 60,
          createdAt: '2025-10-01T10:00:00',
          updatedAt: '2025-10-08T15:30:00',
          comments: [
            Comment(
              id: 1,
              content: '海报已经制作完成，明天可以张贴',
              author: UserInfo(id: 3, realName: '李店长'),
              createdAt: '2025-10-08T10:00:00',
            ),
            Comment(
              id: 2,
              content: '菜单价格已更新系统',
              author: UserInfo(id: 3, realName: '李店长'),
              createdAt: '2025-10-08T14:30:00',
            ),
          ],
          attachments: [],
        );
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        _showMessage('加载失败：$e');
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
  
  /// 添加评论
  Future<void> _addComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) {
      _showMessage('请输入评论内容');
      return;
    }
    
    try {
      // TODO: 调用 API 添加评论
      await Future.delayed(const Duration(milliseconds: 500));
      
      _showMessage('评论添加成功', isSuccess: true);
      _commentController.clear();
      
      // 重新加载工单详情
      _loadWorkOrderDetail();
    } catch (e) {
      _showMessage('评论失败：$e');
    }
  }
  
  /// 更新工单状态
  Future<void> _updateStatus(int statusId, String statusName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认操作'),
        content: Text('确定要将工单状态更新为"$statusName"吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      // TODO: 调用 API 更新状态
      await Future.delayed(const Duration(milliseconds: 500));
      
      _showMessage('状态更新成功', isSuccess: true);
      _loadWorkOrderDetail();
    } catch (e) {
      _showMessage('更新失败：$e');
    }
  }
  
  void _showMessage(String message, {bool isSuccess = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isSuccess ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('工单详情'),
        actions: [
          // 更多操作菜单
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'edit') {
                // TODO: 跳转到编辑页面
                _showMessage('编辑功能待实现');
              } else if (value == 'delete') {
                // TODO: 删除工单
                _showMessage('删除功能待实现');
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Text('编辑工单'),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Text('删除工单'),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _workOrder == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64.w,
                        color: AppColors.textHint,
                      ),
                      SizedBox(height: 16.h),
                      Text(
                        '工单不存在或已被删除',
                        style: TextStyle(
                          fontSize: 16.sp,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // 工单详情内容（可滚动）
                    Expanded(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.all(16.w),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 基本信息卡片
                            _buildBasicInfoCard(),
                            SizedBox(height: 16.h),
                            
                            // 描述卡片
                            if (_workOrder!.description != null &&
                                _workOrder!.description!.isNotEmpty)
                              _buildDescriptionCard(),
                            if (_workOrder!.description != null &&
                                _workOrder!.description!.isNotEmpty)
                              SizedBox(height: 16.h),
                            
                            // 进度卡片
                            _buildProgressCard(),
                            SizedBox(height: 16.h),
                            
                            // 评论列表
                            _buildCommentsSection(),
                          ],
                        ),
                      ),
                    ),
                    
                    // 底部操作栏
                    _buildBottomActions(),
                  ],
                ),
    );
  }
  
  /// 基本信息卡片
  Widget _buildBasicInfoCard() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 标题
          Text(
            _workOrder!.title,
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 16.h),
          
          // 标签行（类型、优先级、状态）
          Wrap(
            spacing: 8.w,
            runSpacing: 8.h,
            children: [
              _buildTag(
                _workOrder!.type!.typeName,
                Color(int.parse(_workOrder!.type!.color!.replaceFirst('#', '0xFF'))),
              ),
              _buildTag(
                _workOrder!.priority!.priorityName,
                Color(int.parse(_workOrder!.priority!.color!.replaceFirst('#', '0xFF'))),
              ),
              _buildTag(
                _workOrder!.status!.statusName,
                Color(int.parse(_workOrder!.status!.color!.replaceFirst('#', '0xFF'))),
              ),
            ],
          ),
          SizedBox(height: 16.h),
          
          // 详细信息
          _buildInfoRow('创建人', _workOrder!.creator?.realName ?? '-'),
          _buildInfoRow('受理人', _workOrder!.assignee?.realName ?? '-'),
          _buildInfoRow('所属门店', _workOrder!.shop?.name ?? '-'),
          _buildInfoRow('截止日期', _formatDate(_workOrder!.dueDate)),
          _buildInfoRow('创建时间', _formatDate(_workOrder!.createdAt)),
          _buildInfoRow('更新时间', _formatDate(_workOrder!.updatedAt)),
        ],
      ),
    );
  }
  
  /// 描述卡片
  Widget _buildDescriptionCard() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '工单描述',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 12.h),
          Text(
            _workOrder!.description!,
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
  
  /// 进度卡片
  Widget _buildProgressCard() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '完成进度',
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${_workOrder!.completionProgress}%',
                style: TextStyle(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          SizedBox(height: 12.h),
          LinearProgressIndicator(
            value: _workOrder!.completionProgress / 100,
            backgroundColor: AppColors.divider,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            minHeight: 8.h,
            borderRadius: BorderRadius.circular(4.r),
          ),
        ],
      ),
    );
  }
  
  /// 评论列表
  Widget _buildCommentsSection() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '评论记录',
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          SizedBox(height: 12.h),
          
          if (_workOrder!.comments == null || _workOrder!.comments!.isEmpty)
            Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20.h),
                child: Text(
                  '暂无评论',
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.textHint,
                  ),
                ),
              ),
            )
          else
            ..._workOrder!.comments!.map((comment) => _buildCommentItem(comment)),
        ],
      ),
    );
  }
  
  /// 评论项
  Widget _buildCommentItem(Comment comment) {
    return Container(
      margin: EdgeInsets.only(bottom: 16.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16.w,
                backgroundColor: AppColors.primary.withOpacity(0.1),
                child: Text(
                  comment.author?.realName.substring(0, 1) ?? '?',
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
              SizedBox(width: 8.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      comment.author?.realName ?? '未知用户',
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _formatDate(comment.createdAt),
                      style: TextStyle(
                        fontSize: 12.sp,
                        color: AppColors.textHint,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 8.h),
          Text(
            comment.content,
            style: TextStyle(
              fontSize: 14.sp,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
  
  /// 底部操作栏
  Widget _buildBottomActions() {
    return Container(
      padding: EdgeInsets.all(16.w),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 评论输入框
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: '添加评论...',
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20.r),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                SizedBox(width: 8.w),
                IconButton(
                  onPressed: _addComment,
                  icon: const Icon(Icons.send),
                  color: AppColors.primary,
                ),
              ],
            ),
            SizedBox(height: 12.h),
            
            // 状态更新按钮
            Row(
              children: [
                if (_workOrder!.status!.id == 1) // 待受理
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _updateStatus(2, '进行中'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.statusInProgress,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8.r),
                        ),
                      ),
                      child: const Text('接受工单'),
                    ),
                  ),
                if (_workOrder!.status!.id == 2) // 进行中
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _updateStatus(3, '已完成'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.statusCompleted,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8.r),
                        ),
                      ),
                      child: const Text('完成工单'),
                    ),
                  ),
                if (_workOrder!.status!.id == 3) // 已完成
                  Expanded(
                    child: Container(
                      padding: EdgeInsets.symmetric(vertical: 12.h),
                      decoration: BoxDecoration(
                        color: AppColors.statusCompleted.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8.r),
                      ),
                      child: Center(
                        child: Text(
                          '工单已完成',
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w600,
                            color: AppColors.statusCompleted,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  /// 标签
  Widget _buildTag(String text, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4.r),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12.sp,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
  
  /// 信息行
  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8.h),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 70.w,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14.sp,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} '
          '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }
}
