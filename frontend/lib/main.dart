import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/config/environment.dart';
import 'providers/auth_provider.dart';
import 'providers/work_order_provider.dart';
import 'providers/shop_provider.dart';

void main() {
  // 🚀 强制使用生产环境进行测试
  // 连接到远程服务器: http://118.89.73.199:5000
  EnvironmentConfig.forceEnvironment(Environment.production);
  
  // 打印环境信息（用于调试）
  EnvironmentConfig.printEnvironmentInfo();
  
  runApp(const SunpizzaApp());
}

class SunpizzaApp extends StatelessWidget {
  const SunpizzaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => WorkOrderProvider()),
        ChangeNotifierProvider(create: (_) => ShopProvider()),
      ],
      child: ScreenUtilInit(
        designSize: const Size(375, 812),
        minTextAdapt: true,
        splitScreenMode: true,
        builder: (context, child) {
          return MaterialApp.router(
            title: '圣比萨智能门店管理平台',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            routerConfig: AppRouter.router,
            locale: const Locale('zh', 'CN'),
          );
        },
      ),
    );
  }
}

