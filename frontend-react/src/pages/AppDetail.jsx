import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiInfo, FiShield, FiDatabase, FiFolder, FiActivity, FiUsers } from 'react-icons/fi';
import appService from '../services/app.service';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import OverviewTab from '../components/app/OverviewTab';
import RuleEngineTab from '../components/app/RuleEngineTab';
import DataPlaygroundTab from '../components/app/DataPlaygroundTab';
import RealtimeDataPlaygroundTab from '../components/app/RealtimeDataPlaygroundTab';
import StorageTab from '../components/app/StorageTab';
import AppSettings from '../components/AppSettings';
import UsersTab from '../components/app/UsersTab';

const AppDetail = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { updateCurrentApp } = useApp();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadApp();
  }, [appId]);

  const loadApp = async () => {
    try {
      setLoading(true);
      const appData = await appService.getAppById(appId);
      setApp(appData);
      updateCurrentApp({ id: appId, ...appData });
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể tải ứng dụng';
      toast.error(message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: FiInfo },
    { id: 'users', label: 'Người dùng', icon: FiUsers },
    { id: 'database', label: 'Cơ sở dữ liệu', icon: FiDatabase },
    { id: 'realtime', label: 'Realtime DB', icon: FiActivity },
    { id: 'storage', label: 'Lưu trữ', icon: FiFolder },
    { id: 'rules', label: 'Quy tắc', icon: FiShield },
    { id: 'settings', label: 'Cài đặt', icon: FiInfo },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-400">Đang tải ứng dụng...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!app) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-400">Không tìm thấy ứng dụng</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white mb-4 transition-colors"
        >
          ← Quay lại Bảng điều khiển
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">{app.name}</h1>
        <p className="text-gray-400">App ID: {appId}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${activeTab === tab.id
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab app={app} appId={appId} />}
        {activeTab === 'users' && <UsersTab appId={appId} />}
        {activeTab === 'database' && <DataPlaygroundTab appId={appId} />}
        {activeTab === 'realtime' && <RealtimeDataPlaygroundTab appId={appId} />}
        {activeTab === 'storage' && <StorageTab appId={appId} />}
        {activeTab === 'rules' && <RuleEngineTab appId={appId} />}
        {activeTab === 'settings' && (
          <AppSettings
            app={app}
            onUpdate={(updatedApp) => {
              setApp(updatedApp);
              toast.success('Cập nhật ứng dụng thành công');
            }}
            onDelete={(deletedAppId) => {
              toast.success('Xóa ứng dụng thành công');
              navigate('/');
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AppDetail;

