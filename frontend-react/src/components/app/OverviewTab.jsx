import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiCopy, FiKey, FiRefreshCw } from 'react-icons/fi';
import appService from '../../services/app.service';
import Card from '../common/Card';
import Button from '../common/Button';
import API_ENDPOINTS from '../../config/api.config';

const OverviewTab = ({ app, appId }) => {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAPIKey();
  }, [appId]);

  const loadAPIKey = async () => {
    try {
      const data = await appService.getAppAPIKey(appId);
      setApiKey(data.apiKey || data.key);
    } catch (error) {
      console.error('Failed to load API key:', error);
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

      {/* Integration Guide */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Tích hợp nhanh</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">JavaScript/Node.js</label>
            <pre className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-300 overflow-x-auto">
              {`import axios from 'axios';

const api = axios.create({
  baseURL: '${API_ENDPOINTS.DATABASE.BASE}',
  headers: {
    'x-app-id': '${appId}',
    'Content-Type': 'application/json'
  }
});

// Create document
await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});`}
            </pre>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">cURL</label>
            <pre className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-300 overflow-x-auto">
              {`curl -X POST "${API_ENDPOINTS.DATABASE.BASE}/users" \\
  -H "x-app-id: ${appId}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe", "email": "john@example.com"}'`}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewTab;


