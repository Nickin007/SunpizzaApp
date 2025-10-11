import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Shops from '../pages/Shops';
import WorkOrders from '../pages/WorkOrders';
import Dict from '../pages/Dict';
import Training from '../pages/Training';
import { useAuthStore } from '../store/authStore';

// 路由守卫组件
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
    element: <PrivateRoute><MainLayout /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'shops',
        element: <Shops />,
      },
      {
        path: 'work-orders',
        element: <WorkOrders />,
      },
      {
        path: 'dict',
        element: <Dict />,
      },
      {
        path: 'training',
        element: <Training />,
      },
    ],
  },
]);

export default router;

