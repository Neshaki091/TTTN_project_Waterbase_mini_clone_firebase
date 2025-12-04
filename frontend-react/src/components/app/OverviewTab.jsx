import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCopy, FiKey, FiRefreshCw, FiDatabase, FiActivity } from 'react-icons/fi';
import appService from '../../services/app.service';
import Card from '../common/Card';
import Button from '../common/Button';
import API_ENDPOINTS from '../../config/api.config';

const ServiceUsageCard = ({ title, icon: Icon, usage, loading }) => {
  const { totalCollections = 0, totalDocuments = 0, usedBytes = 0 } = usage || {};
  const quotaBytes = 100 * 1024 * 1024; // 100MB
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const quotaMB = 100;
  const percentage = Math.min((usedBytes / quotaBytes) * 100, 100);

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Icon className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400">
              {totalCollections} collections • {totalDocuments} documents
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Đang tải...</div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Dung lượng sử dụng</span>
            <span className="text-sm font-semibold text-white">
              {usedMB} MB / {quotaMB} MB
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          {percentage >= 80 && (
            <div className="text-xs text-yellow-400 flex items-center space-x-1">
              <span>⚠️</span>
              <span>
                {percentage >= 90
                  ? 'Dung lượng gần đầy! Hãy xóa bớt dữ liệu.'
                  : 'Dung lượng sắp đầy.'}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const OverviewTab = ({ app, appId }) => {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [waterdbUsage, setWaterdbUsage] = useState(null);
  const [rtWaterdbUsage, setRtWaterdbUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    loadAPIKey();
    loadUsageStats();
  }, [appId]);

  const loadAPIKey = async () => {
    try {
      const data = await appService.getAppAPIKey(appId);
      setApiKey(data.apiKey || data.key);
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      setUsageLoading(true);
      const [waterdbData, rtWaterdbData] = await Promise.all([
        appService.getWaterDBUsage(appId),
        appService.getRTWaterDBUsage(appId)
      ]);
      setWaterdbUsage(waterdbData);
      setRtWaterdbUsage(rtWaterdbData);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      toast.error('Không thể tải thống kê sử dụng');
    } finally {
      setUsageLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ tạm!');
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Bạn có chắc chắn muốn tạo lại API key? Key cũ sẽ không còn hoạt động.')) {
      return;
    }

    try {
      setLoading(true);
      const data = await appService.regenerateAPIKey(appId);
      setApiKey(data.apiKey || data.key);
      toast.success('Đã tạo lại API key thành công!');
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể tạo lại API key';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ServiceUsageCard
          title="WaterDB (Database)"
          icon={FiDatabase}
          usage={waterdbUsage}
          loading={usageLoading}
        />
        <ServiceUsageCard
          title="RTWaterDB (Realtime)"
          icon={FiActivity}
          usage={rtWaterdbUsage}
          loading={usageLoading}
        />
      </div>

      {/* App Information */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Thông tin ứng dụng</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">App ID</label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono">
                {appId}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(appId)}
              >
                <FiCopy size={16} />
              </Button>
            </div>
          </div>
          {app.createdAt && (
            <div>
              <label className="text-sm text-gray-400">Ngày tạo</label>
              <p className="text-white mt-1">
                {new Date(app.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* API Key */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">API Key</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerateKey}
            disabled={loading}
          >
            <FiRefreshCw className="inline mr-2" size={16} />
            Tạo lại
          </Button>
        </div>
        {apiKey ? (
          <div className="flex items-center space-x-2">
            <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono break-all">
              {apiKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(apiKey)}
            >
              <FiCopy size={16} />
            </Button>
          </div>
        ) : (
          <p className="text-gray-400">Đang tải API key...</p>
        )}
      </Card>

    </div>
  );
};

export default OverviewTab;
