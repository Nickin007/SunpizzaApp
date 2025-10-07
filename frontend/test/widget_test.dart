// 圣比萨智能门店管理平台 - Widget 测试
//
// 基础测试：验证应用能够正常启动

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sunpizza_app/main.dart';

void main() {
  testWidgets('App smoke test - 应用启动测试', (WidgetTester tester) async {
    // 构建应用并触发一帧
    await tester.pumpWidget(const SunpizzaApp());
    
    // 等待初始化完成
    await tester.pumpAndSettle();

    // 验证登录页面的基本元素是否存在
    // 这里可以添加更多具体的测试，例如：
    // expect(find.text('圣比萨智能门店管理平台'), findsOneWidget);
    // expect(find.byType(TextField), findsWidgets);
    
    // 基础测试：确保应用能够正常构建
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
