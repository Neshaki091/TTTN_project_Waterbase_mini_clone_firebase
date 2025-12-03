import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage } from 'react-icons/fi';
import appService from '../services/app.service';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const Dashboard = () => {
  const navigate = useNavigate();
  const { updateCurrentApp } = useApp();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAppData, setCreateAppData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [newAppCredentials, setNewAppCredentials] = useState(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const data = await appService.getAllApps();
      setApps(Array.isArray(data) ? data : data.apps || []);
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể tải danh sách ứng dụng';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    if (!createAppData.name.trim()) {
      toast.error('Tên ứng dụng là bắt buộc');
      return;
    }

    setCreating(true);
    try {
      const response = await appService.createApp({
        name: createAppData.name,
        description: createAppData.description
      });

      const app = response.app || response;
      const appId = app.appId;

      const apiKeyData = await appService.getAppAPIKey(appId);

      setNewAppCredentials({
        appId: appId,
        apiKey: apiKeyData.apiKey
      });

      toast.success('Tạo ứng dụng thành công!');
      await loadApps();
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể tạo ứng dụng';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleAppClick = (app) => {
    const appId = app.appId;
    updateCurrentApp({ id: appId, ...app });
    navigate(`/app/${appId}`);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ tạm!');
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ứng dụng của tôi</h1>
          <p className="text-gray-400">Quản lý và cấu hình các ứng dụng của bạn</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <FiPlus className="inline mr-2" />
          Tạo ứng dụng
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Đang tải ứng dụng...</p>
        </div>
      ) : apps.length === 0 ? (
        <Card className="text-center py-12">
          <FiPackage size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Chưa có ứng dụng nào</h3>
          <p className="text-gray-400 mb-6">Tạo ứng dụng đầu tiên để bắt đầu</p>
          <Button onClick={() => setShowCreateModal(true)}>Tạo ứng dụng</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Card
              key={app.appId || app._id}
              hover
              onClick={() => handleAppClick(app)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {app.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    ID: {app.appId}
                  </p>
                </div>
                <FiPackage className="text-gray-600" size={24} />
              </div>
              {app.description && (
                <p className="text-sm text-gray-500 mb-3">{app.description}</p>
              )}
              {app.createdAt && (
                <p className="text-xs text-gray-500">
                  Ngày tạo: {new Date(app.createdAt).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateAppData({ name: '', description: '' });
          setNewAppCredentials(null);
        }}
        title={newAppCredentials ? 'Tạo ứng dụng thành công!' : 'Tạo ứng dụng mới'}
      >
        {newAppCredentials ? (
          <div className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-4">
                ⚠️ Lưu lại thông tin này. Bạn sẽ không thể xem lại API key lần nữa!
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    App ID
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newAppCredentials.appId}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newAppCredentials.appId)}
                    >
                      Sao chép
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newAppCredentials.apiKey}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newAppCredentials.apiKey)}
                    >
                      Sao chép
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAppCredentials(null);
                  setCreateAppData({ name: '', description: '' });
                }}
              >
                Đóng
              </Button>
              <Button
                onClick={() => {
                  handleAppClick({ appId: newAppCredentials.appId });
                }}
              >
                Đi tới ứng dụng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateApp} className="space-y-4">
            <Input
              label="Tên ứng dụng"
              value={createAppData.name}
              onChange={(e) => setCreateAppData({ ...createAppData, name: e.target.value })}
              placeholder="my-awesome-app"
              required
              autoFocus
            />
            <Input
              label="Mô tả (tùy chọn)"
              value={createAppData.description}
              onChange={(e) => setCreateAppData({ ...createAppData, description: e.target.value })}
              placeholder="Mô tả ngắn về ứng dụng của bạn"
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Đang tạo...' : 'Tạo ứng dụng'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default Dashboard;

