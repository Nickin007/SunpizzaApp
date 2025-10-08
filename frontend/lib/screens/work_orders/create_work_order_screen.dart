import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/work_order_provider.dart';
import '../../models/work_order_model.dart';

/// 创建工单页面
class CreateWorkOrderScreen extends StatefulWidget {
  const CreateWorkOrderScreen({super.key});

  @override
  State<CreateWorkOrderScreen> createState() => _CreateWorkOrderScreenState();
}

class _CreateWorkOrderScreenState extends State<CreateWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  TaskType? _selectedType;
  Priority? _selectedPriority;
  DateTime? _selectedDueDate;
  
  bool _isLoading = false;
  
  // 字典数据
  List<TaskType> _taskTypes = [];
  List<Priority> _priorities = [];
  
  @override
  void initState() {
    super.initState();
    _loadDictData();
  }
  
  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
  
  /// 加载字典数据
  Future<void> _loadDictData() async {
    // TODO: 从 API 加载任务类型和优先级
    // 暂时使用模拟数据
    setState(() {
      _taskTypes = [
        TaskType(id: 1, typeName: '稽查整改', color: '#FF6B6B'),
        TaskType(id: 2, typeName: '营销活动', color: '#4ECDC4'),
        TaskType(id: 3, typeName: '设备报修', color: '#45B7D1'),
        TaskType(id: 4, typeName: '物料申请', color: '#96CEB4'),
        TaskType(id: 5, typeName: '人员调度', color: '#F7C46C'),
        TaskType(id: 6, typeName: '其他', color: '#9E9E9E'),
      ];
      
      _priorities = [
        Priority(id: 1, priorityName: '低', color: '#5DADE2', sortOrder: 1),
        Priority(id: 2, priorityName: '中', color: '#F4D03F', sortOrder: 2),
        Priority(id: 3, priorityName: '高', color: '#EC7063', sortOrder: 3),
      ];
    });
  }
  
  /// 选择截止日期
  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null) {
      setState(() {
        _selectedDueDate = picked;
      });
    }
  }
  
  /// 提交工单
  Future<void> _submitWorkOrder() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    if (_selectedType == null) {
      _showMessage('请选择任务类型');
      return;
    }
    
    if (_selectedPriority == null) {
      _showMessage('请选择优先级');
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      // TODO: 调用 API 创建工单
      // final workOrderProvider = context.read<WorkOrderProvider>();
      // final authProvider = context.read<AuthProvider>();
      // final data = {
      //   'title': _titleController.text.trim(),
      //   'description': _descriptionController.text.trim(),
      //   'type_id': _selectedType!.id,
      //   'priority_id': _selectedPriority!.id,
      //   if (_selectedDueDate != null) 
      //     'due_date': _selectedDueDate!.toIso8601String(),
      //   if (authProvider.currentUser?.shopId != null)
      //     'shop_id': authProvider.currentUser!.shopId,
      // };
      // await workOrderProvider.createWorkOrder(data);
      
      // 模拟API调用延迟
      await Future.delayed(const Duration(seconds: 1));
      
      if (mounted) {
        _showMessage('工单创建成功！', isSuccess: true);
        context.pop();
      }
    } catch (e) {
      _showMessage('创建失败：$e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
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
        title: const Text('创建工单'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submitWorkOrder,
            child: _isLoading
                ? SizedBox(
                    width: 20.w,
                    height: 20.w,
                    child: const CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    '提交',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16.w),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题输入框
              _buildSectionTitle('工单标题', required: true),
              SizedBox(height: 8.h),
              _buildTextField(
                controller: _titleController,
                hint: '请输入工单标题',
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return '请输入工单标题';
                  }
                  return null;
                },
              ),
              SizedBox(height: 20.h),
              
              // 任务类型选择
              _buildSectionTitle('任务类型', required: true),
              SizedBox(height: 8.h),
              _buildTypeSelector(),
              SizedBox(height: 20.h),
              
              // 优先级选择
              _buildSectionTitle('优先级', required: true),
              SizedBox(height: 8.h),
              _buildPrioritySelector(),
              SizedBox(height: 20.h),
              
              // 工单描述
              _buildSectionTitle('工单描述'),
              SizedBox(height: 8.h),
              _buildTextField(
                controller: _descriptionController,
                hint: '请详细描述工单内容...',
                maxLines: 5,
              ),
              SizedBox(height: 20.h),
              
              // 截止日期
              _buildSectionTitle('截止日期'),
              SizedBox(height: 8.h),
              _buildDueDateSelector(),
              SizedBox(height: 40.h),
              
              // 提交按钮
              SizedBox(
                width: double.infinity,
                height: 50.h,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitWorkOrder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          '创建工单',
                          style: TextStyle(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  /// 章节标题
  Widget _buildSectionTitle(String title, {bool required = false}) {
    return Row(
      children: [
        if (required)
          Padding(
            padding: EdgeInsets.only(right: 4.w),
            child: Text(
              '*',
              style: TextStyle(
                fontSize: 16.sp,
                color: AppColors.error,
              ),
            ),
          ),
        Text(
          title,
          style: TextStyle(
            fontSize: 16.sp,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
  
  /// 文本输入框
  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: TextStyle(fontSize: 15.sp),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppColors.textHint),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.r),
          borderSide: BorderSide(color: AppColors.error),
        ),
      ),
    );
  }
  
  /// 任务类型选择器
  Widget _buildTypeSelector() {
    return Wrap(
      spacing: 10.w,
      runSpacing: 10.h,
      children: _taskTypes.map((type) {
        final isSelected = _selectedType?.id == type.id;
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedType = type;
            });
          },
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(20.r),
              border: Border.all(
                color: isSelected ? AppColors.primary : AppColors.divider,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: Text(
              type.typeName,
              style: TextStyle(
                fontSize: 14.sp,
                color: isSelected ? Colors.white : AppColors.textPrimary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
  
  /// 优先级选择器
  Widget _buildPrioritySelector() {
    return Row(
      children: _priorities.map((priority) {
        final isSelected = _selectedPriority?.id == priority.id;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: priority.id == 3 ? 0 : 10.w),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedPriority = priority;
                });
              },
              child: Container(
                padding: EdgeInsets.symmetric(vertical: 12.h),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(12.r),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.divider,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    priority.priorityName,
                    style: TextStyle(
                      fontSize: 15.sp,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
  
  /// 截止日期选择器
  Widget _buildDueDateSelector() {
    return GestureDetector(
      onTap: _selectDueDate,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 14.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: Border.all(color: AppColors.divider),
        ),
        child: Row(
          children: [
            Icon(
              Icons.calendar_today,
              color: AppColors.primary,
              size: 20.w,
            ),
            SizedBox(width: 12.w),
            Text(
              _selectedDueDate != null
                  ? _formatDate(_selectedDueDate!)
                  : '请选择截止日期（可选）',
              style: TextStyle(
                fontSize: 15.sp,
                color: _selectedDueDate != null 
                    ? AppColors.textPrimary 
                    : AppColors.textHint,
              ),
            ),
            const Spacer(),
            if (_selectedDueDate != null)
              GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedDueDate = null;
                  });
                },
                child: Icon(
                  Icons.close,
                  color: AppColors.textSecondary,
                  size: 20.w,
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
