import 'package:flutter/material.dart';

/// 工单列表页（占位）
class WorkOrderListScreen extends StatelessWidget {
  const WorkOrderListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('工单列表')),
      body: const Center(
        child: Text('工单列表 - 待实现'),
      ),
    );
  }
}

