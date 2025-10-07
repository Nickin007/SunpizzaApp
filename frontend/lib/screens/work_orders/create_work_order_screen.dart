import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/constants/app_colors.dart';

/// 创建工单页面（占位）
class CreateWorkOrderScreen extends StatelessWidget {
  const CreateWorkOrderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('创建工单'),
      ),
      body: Center(
        child: Text(
          '创建工单表单 - 待实现',
          style: TextStyle(fontSize: 16.sp),
        ),
      ),
    );
  }
}


