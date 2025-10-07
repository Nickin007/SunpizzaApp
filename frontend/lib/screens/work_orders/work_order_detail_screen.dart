import 'package:flutter/material.dart';

/// 工单详情页（占位）
class WorkOrderDetailScreen extends StatelessWidget {
  final int workOrderId;

  const WorkOrderDetailScreen({super.key, required this.workOrderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('工单详情')),
      body: Center(
        child: Text('工单 ID: $workOrderId - 待实现'),
      ),
    );
  }
}

