import { useState } from 'react';
import { FiTrash2, FiDownload, FiRefreshCw, FiSave, FiX, FiAlertTriangle } from 'react-icons/fi';
import API_ENDPOINTS from '../config/api.config';
import Card from './common/Card';
import Button from './common/Button';
import Input from './common/Input';

const AppSettings = ({ app, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: app.name,
        description: app.description || ''
    });
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('ownerToken');
            const response = await fetch(`${API_ENDPOINTS.APPS.BY_ID(app.appId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                onUpdate(data.app);
                setIsEditing(false);
            } else {
                alert('Cập nhật ứng dụng thất bại');
            }
        } catch (error) {
            console.error('Error updating app:', error);
            alert('Lỗi khi cập nhật ứng dụng');
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('ownerToken');
            const response = await fetch(`${API_ENDPOINTS.APPS.BY_ID(app.appId)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                onDelete(app.appId);
            } else {
                alert('Xóa ứng dụng thất bại');
            }
        } catch (error) {
            console.error('Error deleting app:', error);
            alert('Lỗi khi xóa ứng dụng');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const downloadServiceConfig = async (regenerate = false) => {
        try {
            const token = localStorage.getItem('ownerToken');
            const url = regenerate
                ? `${API_ENDPOINTS.APPS.BY_ID(app.appId)}/service-json/regenerate`
                : `${API_ENDPOINTS.APPS.BY_ID(app.appId)}/service-json`;

            const response = await fetch(url, {
                method: regenerate ? 'POST' : 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                // For regenerate, extract serviceJson from response
                const config = regenerate ? data.serviceJson : data;

                // Download as file
                const blob = new Blob([JSON.stringify(config, null, 2)], {
                    type: 'application/json'
                });
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = 'waterbase-service.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);

                if (regenerate) {
                    alert('Đã tạo lại API Key thành công! Key cũ không còn hiệu lực.');
                    // Refresh app data to show new API key
                    onUpdate({ ...app, apiKey: config.apiKey });
                }
            } else {
                alert('Không thể tải cấu hình dịch vụ');
            }
        } catch (error) {
            console.error('Error downloading service config:', error);
            alert('Lỗi khi tải cấu hình dịch vụ');
        }
    };

    return (
        <div className="space-y-6">
            {/* App Info Section */}
            <Card>
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-semibold text-white">Thông tin ứng dụng</h2>
                    {!isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="primary"
                        >
                            Chỉnh sửa thông tin
                        </Button>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Tên ứng dụng
                        </label>
                        {isEditing ? (
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        ) : (
                            <p className="text-white font-medium">{app.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Mô tả
                        </label>
                        {isEditing ? (
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-300">{app.description || 'Không có mô tả'}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                App ID
                            </label>
                            <code className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono">
                                {app.appId}
                            </code>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                API Key
                            </label>
                            <code className="block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono break-all">
                                {app.apiKey}
                            </code>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleUpdate}>
                                <FiSave className="mr-2" />
                                Lưu thay đổi
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData({ name: app.name, description: app.description || '' });
                                }}
                                variant="outline"
                            >
                                <FiX className="mr-2" />
                                Hủy
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Service Config Section */}
            <Card>
                <h3 className="text-xl font-semibold text-white mb-4">
                    Cấu hình dịch vụ
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                    Tải xuống <code className="bg-gray-900 px-2 py-1 rounded text-gray-300">waterbase-service.json</code> để sử dụng trong dự án của bạn.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={() => downloadServiceConfig(false)}
                        className="bg-green-600 hover:bg-green-700 border-green-600"
                    >
                        <FiDownload className="mr-2" />
                        Tải cấu hình (Giữ API Key cũ)
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirm('Hành động này sẽ tạo API Key mới và vô hiệu hóa Key cũ. Bạn có chắc chắn không?')) {
                                downloadServiceConfig(true);
                            }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 border-orange-600"
                    >
                        <FiRefreshCw className="mr-2" />
                        Tạo mới & Tải xuống (API Key mới)
                    </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-300">
                        <strong>💡 Mẹo:</strong> Đặt file <code>waterbase-service.json</code> vào thư mục gốc dự án của bạn.
                        SDK sẽ tự động tải cấu hình từ file này.
                    </p>
                </div>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-900/50">
                <h3 className="text-xl font-semibold text-red-500 mb-4">
                    Vùng nguy hiểm
                </h3>

                {!showDeleteConfirm ? (
                    <Button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="bg-red-600 hover:bg-red-700 border-red-600"
                    >
                        <FiTrash2 className="mr-2" />
                        Xóa ứng dụng
                    </Button>
                ) : (
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center text-red-400 font-medium">
                            <FiAlertTriangle className="mr-2" />
                            Bạn có chắc chắn muốn xóa ứng dụng này?
                        </div>
                        <p className="text-sm text-red-300">
                            Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến ứng dụng này sẽ bị xóa vĩnh viễn.
                        </p>
                        <div className="flex gap-3 mt-2">
                            <Button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 border-red-600"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Có, Xóa vĩnh viễn'}
                            </Button>
                            <Button
                                onClick={() => setShowDeleteConfirm(false)}
                                variant="outline"
                            >
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AppSettings;
