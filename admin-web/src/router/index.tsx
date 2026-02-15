import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import PortalSelect from '../pages/PortalSelect';
import DeliveryLayout from '../layouts/DeliveryLayout';
import PortalLayout, { THEMES } from '../layouts/PortalLayout';
import DeliveryWelcome from '../pages/Delivery/Welcome';
import PlaceholderPage from '../pages/Placeholder';
import UserManagement from '../pages/Admin/UserManagement';
// 饿了么页面
import ElemeSiteSelection from '../pages/Delivery/Eleme/SiteSelectionV2';
import ElemeCostAnalysis from '../pages/Delivery/Eleme/CostAnalysis';
import ElemeExcelToolkit from '../pages/Delivery/Eleme/ExcelToolkit';
// 美团外卖页面（占位）
import MeituanCostAnalysis from '../pages/Delivery/Meituan/CostAnalysis';
// 财务后台页面
import AccountingCostAnalysis from '../pages/Accounting/CostAnalysis';
import AccountingBooks from '../pages/Accounting/Books';
import AccountingSubjects from '../pages/Accounting/Subjects';
import AccountingVoucherForm from '../pages/Accounting/VoucherForm';
import AccountingVoucherList from '../pages/Accounting/VoucherList';
import AccountingWelcome from '../pages/Accounting/Welcome';
// AI Agent 后台页面
import AgentChat from '../pages/Agent/Chat';
import AgentFileEditor from '../pages/Agent/FileEditor';
import AgentMemoryBrowser from '../pages/Agent/MemoryBrowser';
import { useAuthStore } from '../store/authStore';
// 图标
import {
  DashboardOutlined,
  TeamOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  TransactionOutlined,
  VideoCameraOutlined,
  AppstoreOutlined,
  ShopOutlined,
  DollarOutlined,
  SettingOutlined,
  BookOutlined,
  FormOutlined,
  AuditOutlined,
  SearchOutlined,
  RobotOutlined,
  FileMarkdownOutlined,
  FolderOutlined,
  MessageOutlined,
} from '@ant-design/icons';

// 路由守卫 - 检查是否登录
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// 角色守卫 - 检查角色权限
const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/portal-select" replace />;
  return <>{children}</>;
};

// ========== 各门户侧边栏菜单配置 ==========
const supplyChainMenu = [
  {
    key: '/supply-chain/welcome',
    icon: <DashboardOutlined />,
    label: '首页',
  },
  {
    key: '/supply-chain/inventory',
    icon: <DatabaseOutlined />,
    label: '库存管理',
  },
  {
    key: '/supply-chain/purchase',
    icon: <ShoppingCartOutlined />,
    label: '采购管理',
  },
];

const accountingMenu = [
  {
    key: '/accounting/welcome',
    icon: <DashboardOutlined />,
    label: '首页',
  },
  {
    key: 'finance-module',
    icon: <BookOutlined />,
    label: '财务模块',
    children: [
      { key: '/accounting/books', icon: <BookOutlined />, label: '账套管理' },
      { key: '/accounting/subjects', icon: <DatabaseOutlined />, label: '科目管理' },
      { key: '/accounting/voucher/new', icon: <FormOutlined />, label: '凭证录入' },
      { key: '/accounting/vouchers', icon: <SearchOutlined />, label: '凭证查询' },
    ],
  },
  {
    key: '/accounting/cost-analysis',
    icon: <DollarOutlined />,
    label: '成本分析',
  },
];

const douyinMenu = [
  {
    key: '/douyin/welcome',
    icon: <DashboardOutlined />,
    label: '首页',
  },
  {
    key: '/douyin/operation',
    icon: <VideoCameraOutlined />,
    label: '抖音运营',
  },
  {
    key: '/douyin/miniapp',
    icon: <AppstoreOutlined />,
    label: '小程序管理',
  },
  {
    key: '/douyin/offline',
    icon: <ShopOutlined />,
    label: '线下门店',
  },
];

const adminMenu = [
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: '账号管理',
  },
];

const agentMenu = [
  {
    key: '/agent/chat',
    icon: <MessageOutlined />,
    label: 'Agent 对话',
  },
  {
    key: 'memory-core',
    icon: <FileMarkdownOutlined />,
    label: '记忆管理',
    children: [
      { key: '/agent/file?path=USER.md', icon: <FileMarkdownOutlined />, label: '用户档案 (USER.md)' },
      { key: '/agent/file?path=SOUL.md', icon: <RobotOutlined />, label: 'AI 人设 (SOUL.md)' },
      { key: '/agent/file?path=memory/preferences.md', icon: <FileMarkdownOutlined />, label: '偏好记忆' },
      { key: '/agent/file?path=memory/contacts.md', icon: <FileMarkdownOutlined />, label: '联系人' },
    ],
  },
  {
    key: 'memory-extended',
    icon: <FolderOutlined />,
    label: '扩展记忆',
    children: [
      { key: '/agent/memory?folder=projects', icon: <FolderOutlined />, label: '项目记忆' },
      { key: '/agent/memory?folder=daily', icon: <FolderOutlined />, label: '每日记录' },
    ],
  },
];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Navigate to="/portal-select" replace />,
  },
  // 门户选择页
  {
    path: '/portal-select',
    element: <PrivateRoute><PortalSelect /></PrivateRoute>,
  },
  // ========== 外卖运营路由 ==========
  {
    path: '/delivery',
    element: (
      <RoleRoute allowedRoles={['admin', 'delivery_operation']}>
        <DeliveryLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/delivery/welcome" replace /> },
      { path: 'welcome', element: <DeliveryWelcome /> },
      { path: 'site-selection', element: <ElemeSiteSelection /> },
      { path: 'eleme/excel-toolkit', element: <ElemeExcelToolkit /> },
    ],
  },
  // ========== 供应链后台 ==========
  {
    path: '/supply-chain',
    element: (
      <RoleRoute allowedRoles={['admin', 'SupplyChain_operation']}>
        <PortalLayout title="供应链数字化后台" theme={THEMES.green} menuItems={supplyChainMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/supply-chain/welcome" replace /> },
      {
        path: 'welcome',
        element: <PlaceholderPage title="供应链数字化后台" description="供应链管理、库存管理、采购管理" color="#52c41a" />,
      },
      {
        path: 'inventory',
        element: <PlaceholderPage title="库存管理" description="实时库存监控、出入库管理" color="#52c41a" />,
      },
      {
        path: 'purchase',
        element: <PlaceholderPage title="采购管理" description="采购订单、供应商管理" color="#52c41a" />,
      },
    ],
  },
  // ========== 财务后台 ==========
  {
    path: '/accounting',
    element: (
      <RoleRoute allowedRoles={['admin', 'Accouting_operation']}>
        <PortalLayout title="财务数字化后台" theme={THEMES.orange} menuItems={accountingMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/accounting/welcome" replace /> },
      {
        path: 'welcome',
        element: <AccountingWelcome />,
      },
      { path: 'books', element: <AccountingBooks /> },
      { path: 'subjects', element: <AccountingSubjects /> },
      { path: 'voucher/new', element: <AccountingVoucherForm /> },
      { path: 'voucher/edit/:id', element: <AccountingVoucherForm /> },
      { path: 'vouchers', element: <AccountingVoucherList /> },
      { path: 'cost-analysis', element: <AccountingCostAnalysis /> },
    ],
  },
  // ========== 抖音/小程序后台 ==========
  {
    path: '/douyin',
    element: (
      <RoleRoute allowedRoles={['admin', 'DouyinANDOffline_operation']}>
        <PortalLayout title="抖音/小程序数字化后台" theme={THEMES.purple} menuItems={douyinMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/douyin/welcome" replace /> },
      {
        path: 'welcome',
        element: <PlaceholderPage title="抖音/小程序数字化后台" description="抖音运营、小程序管理、线下门店数据分析" color="#722ed1" />,
      },
      {
        path: 'operation',
        element: <PlaceholderPage title="抖音运营" description="短视频数据、直播管理、营销活动" color="#722ed1" />,
      },
      {
        path: 'miniapp',
        element: <PlaceholderPage title="小程序管理" description="小程序订单、用户分析、活动配置" color="#722ed1" />,
      },
      {
        path: 'offline',
        element: <PlaceholderPage title="线下门店" description="门店数据、堂食分析、运营报表" color="#722ed1" />,
      },
    ],
  },
  // ========== 账号权限管理后台 ==========
  {
    path: '/admin',
    element: (
      <RoleRoute allowedRoles={['admin']}>
        <PortalLayout title="账号权限管理后台" theme={THEMES.red} menuItems={adminMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', element: <UserManagement /> },
    ],
  },
  // ========== AI Agent 后台 ==========
  {
    path: '/agent',
    element: (
      <RoleRoute allowedRoles={['admin']}>
        <PortalLayout title="AI Agent 后台" theme={THEMES.teal} menuItems={agentMenu} />
      </RoleRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/agent/chat" replace /> },
      { path: 'chat', element: <AgentChat /> },
      { path: 'file', element: <AgentFileEditor /> },
      { path: 'memory', element: <AgentMemoryBrowser /> },
    ],
  },
  // 404 处理
  {
    path: '*',
    element: <Navigate to="/portal-select" replace />,
  },
]);

export default router;
