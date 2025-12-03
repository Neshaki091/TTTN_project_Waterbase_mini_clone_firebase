import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUpload, FiFile, FiTrash2, FiDownload, FiFolder, FiImage } from 'react-icons/fi';
import storageService from '../../services/storage.service';
import Card from '../common/Card';
import Button from '../common/Button';

const StorageTab = ({ appId }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadFiles();
        loadStats();
    }, [appId]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const data = await storageService.listFiles(appId);
            setFiles(data.files || data || []);
        } catch (error) {
            console.error('Failed to load files:', error);
            toast.error('Không thể tải danh sách tệp');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await storageService.getStorageStats(appId);
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 10MB for demo)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Kích thước tệp phải nhỏ hơn 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Vui lòng chọn một tệp');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            await storageService.uploadFile(appId, selectedFile, (progress) => {
                setUploadProgress(progress);
            });

            toast.success('Tải lên tệp thành công!');
            setSelectedFile(null);
            setUploadProgress(0);
            await loadFiles();
            await loadStats();
        } catch (error) {
            console.error('Upload error:', error);
            const message = error.response?.data?.message || 'Tải lên tệp thất bại';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa tệp này?')) {
            return;
        }

        try {
            await storageService.deleteFile(fileId);
            toast.success('Xóa tệp thành công!');
            await loadFiles();
            await loadStats();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Xóa tệp thất bại');
        }
    };

    const handleDownload = async (file) => {
        try {
            const blob = await storageService.downloadFile(file.id || file._id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename || file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Đã bắt đầu tải xuống!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Tải xuống tệp thất bại');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Kích thước tệp phải nhỏ hơn 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
            return FiImage;
        }
        return FiFile;
    };

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <Card>
                <h2 className="text-xl font-semibold text-white mb-4">Tải lên tệp</h2>
                <div className="space-y-4">
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors"
                    >
                        <FiUpload className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-400 mb-2">
                            {selectedFile ? selectedFile.name : 'Kéo & thả tệp hoặc nhấp để duyệt'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">Kích thước tệp tối đa: 10MB</p>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                            disabled={uploading}
                        />
                        <label htmlFor="file-upload">
                            <Button as="span" variant="outline" disabled={uploading}>
                                Chọn tệp
                            </Button>
                        </label>
                    </div>

                    {selectedFile && (
                        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <FiFile className="text-gray-400" />
                                    <div>
                                        <p className="text-white font-medium">{selectedFile.name}</p>
                                        <p className="text-sm text-gray-400">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        onClick={() => setSelectedFile(null)}
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading}
                                    >
                                        Hủy
                                    </Button>
                                    <Button onClick={handleUpload} disabled={uploading} size="sm">
                                        {uploading ? `Đang tải lên ${uploadProgress}%` : 'Tải lên'}
                                    </Button>
                                </div>
                            </div>

                            {uploading && (
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Files List */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Tệp tin</h2>
                    <Button onClick={loadFiles} variant="outline" size="sm" disabled={loading}>
                        {loading ? 'Đang tải...' : 'Làm mới'}
                    </Button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400">Đang tải tệp...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center py-12">
                        <FiFolder className="mx-auto text-gray-600 mb-4" size={48} />
                        <p className="text-gray-400 mb-2">Chưa có tệp nào</p>
                        <p className="text-sm text-gray-500">Tải lên tệp đầu tiên để bắt đầu</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => {
                            const FileIcon = getFileIcon(file.filename || file.name);
                            const fileId = file.id || file._id;
                            return (
                                <div
                                    key={fileId}
                                    className="flex items-center justify-between bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <FileIcon className="text-gray-400" size={24} />
                                        <div>
                                            <p className="text-white font-medium">{file.filename || file.name}</p>
                                            <p className="text-sm text-gray-400">
                                                {formatFileSize(file.size)} •{' '}
                                                {new Date(file.uploadedAt || file.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleDownload(file)}
                                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                            title="Tải xuống"
                                        >
                                            <FiDownload size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(fileId)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Xóa"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Storage Info */}
            <Card>
                <h3 className="text-lg font-semibold text-white mb-3">Thông tin lưu trữ</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Tổng số tệp:</span>
                        <span className="text-white font-medium">{files.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Tổng dung lượng:</span>
                        <span className="text-white font-medium">
                            {formatFileSize(
                                stats?.totalSize || files.reduce((acc, f) => acc + (f.size || 0), 0)
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Giới hạn lưu trữ:</span>
                        <span className="text-white font-medium">1 GB</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                        <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                                width: `${Math.min(
                                    ((stats?.totalSize || 0) / (1024 * 1024 * 1024)) * 100,
                                    100
                                )}%`,
                            }}
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default StorageTab;
