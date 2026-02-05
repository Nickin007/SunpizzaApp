import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import DeliveryLayout from '../layouts/DeliveryLayout';
import DeliveryWelcome from '../pages/Delivery/Welcome';
// 饿了么页面
import ElemeSiteSelection from '../pages/Delivery/Eleme/SiteSelectionV2';
import ElemeCostAnalysis from '../pages/Delivery/Eleme/CostAnalysis';
// 美团外卖页面
import MeituanCostAnalysis from '../pages/Delivery/Meituan/CostAnalysis';
import { useAuthStore } from '../store/authStore';

// 路由守卫组件 - 检查是否登录
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  // 外卖运营路由
  {
    path: '/delivery',
    element: <PrivateRoute><DeliveryLayout /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/delivery/welcome" replace />,
      },
      {
        path: 'welcome',
        element: <DeliveryWelcome />,
      },
      // 选址工具（独立模块）
      {
        path: 'site-selection',
        element: <ElemeSiteSelection />,
      },
      // 饿了么路由
      {
        path: 'eleme/cost-analysis',
        element: <ElemeCostAnalysis />,
      },
      // 美团外卖路由
      {
        path: 'meituan/cost-analysis',
        element: <MeituanCostAnalysis />,
      },
    ],
  },
  // 404 处理 - 重定向到登录页
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);

export default router;
