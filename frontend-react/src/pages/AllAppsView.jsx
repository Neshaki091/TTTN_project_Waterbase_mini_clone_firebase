import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPackage, FiSearch, FiUser, FiTrash2 } from 'react-icons/fi';
import adminService from '../services/admin.service';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';

const AllAppsView = () => {
    const navigate = useNavigate();
    const { isAdmin, updateCurrentApp } = useApp();
    const [apps, setApps] = useState([]);
    const [deletedApps, setDeletedApps] = useState([]);
    const [allApps, setAllApps] = useState([]); // Combined active + deleted
    const [filteredApps, setFilteredApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleted, setShowDeleted] = useState(true); // Toggle to show/hide deleted apps

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadApps();
    }, [isAdmin, navigate]);

    useEffect(() => {
        // Combine active and deleted apps based on toggle
        const combined = showDeleted ? [...apps, ...deletedApps] : apps;
        setAllApps(combined);

        if (searchTerm) {
            const filtered = combined.filter(
                (app) =>
                    app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.appId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredApps(filtered);
        } else {
            setFilteredApps(combined);
        }
    }, [searchTerm, apps, deletedApps, showDeleted]);

    const loadApps = async () => {
        try {
            setLoading(true);
            // Load both active and deleted apps
            const [activeApps, deletedAppsData] = await Promise.all([
                adminService.getAllApps(),
                adminService.getDeletedApps()
            ]);
            setApps(activeApps);
            setDeletedApps(deletedAppsData);
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể tải danh sách ứng dụng';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleAppClick = (app) => {
        const appId = app.appId;
        updateCurrentApp({ id: appId, ...app });
        navigate(`/app/${appId}`);
    };

    const handleDelete = async (app) => {
        const isDeleted = app.status === 'deleted';
        const confirmMessage = isDeleted
            ? `Bạn có chắc chắn muốn XÓA VĨNH VIỄN "${app.name}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`
            : `Bạn có chắc chắn muốn xóa "${app.name}"?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            if (isDeleted) {
                await adminService.permanentlyDeleteApp(app.appId);
                toast.success('Đã xóa vĩnh viễn ứng dụng khỏi database');
            } else {
                await adminService.deleteApp(app.appId);
                toast.success('Đã xóa ứng dụng thành công');
            }
            loadApps();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xóa ứng dụng');
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Tất cả ứng dụng</h1>
                <p className="text-gray-400">Xem tất cả ứng dụng trên nền tảng</p>
            </div>

            {/* Search and Filter */}
            <Card className="p-4 mb-6">
                <div className="space-y-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên ứng dụng, ID hoặc owner..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="showDeleted"
                            checked={showDeleted}
                            onChange={(e) => setShowDeleted(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showDeleted" className="text-sm text-gray-400 cursor-pointer">
                            Hiển thị app đã xóa ({deletedApps.length})
                        </label>
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">Đang tải ứng dụng...</p>
                </div>
            ) : filteredApps.length === 0 ? (
                <Card className="text-center py-12">
                    <FiPackage size={48} className="mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Không tìm thấy ứng dụng nào</h3>
                    <p className="text-gray-400">
                        {searchTerm ? 'Thử từ khóa tìm kiếm khác' : 'Chưa có ứng dụng nào trên nền tảng'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredApps.map((app) => (
                        <Card
                            key={app.appId}
                            className="relative"
                        >
                            {/* App Info - No longer clickable */}
                            <div className="mb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-white">
                                                {app.name || 'Ứng dụng chưa đặt tên'}
                                            </h3>
                                            {app.status === 'deleted' && (
                                                <span className="px-2 py-0.5 bg-red-900/30 border border-red-700 text-red-400 rounded text-xs font-medium">
                                                    Đã xóa
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 font-mono">
                                            {app.appId}
                                        </p>
                                    </div>
                                    <FiPackage className="text-gray-600" size={24} />
                                </div>

                                {/* Usage Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50 text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Database</div>
                                        <div className="text-xs font-medium text-blue-400">
                                            {formatBytes(app.stats?.database?.sizeBytes || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50 text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Realtime</div>
                                        <div className="text-xs font-medium text-green-400">
                                            {formatBytes(app.stats?.realtime?.sizeBytes || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50 text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Storage</div>
                                        <div className="text-xs font-medium text-purple-400">
                                            {formatBytes(app.stats?.storage?.sizeBytes || 0)}
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Info Badge */}
                                <div className="mb-3 flex items-center space-x-2">
                                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-900/20 border border-blue-700/50 rounded-lg w-full">
                                        <FiUser size={14} className="text-blue-400 flex-shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs text-blue-400 font-medium truncate">
                                                {app.ownerName || app.ownerEmail || 'Owner không xác định'}
                                            </span>
                                            {app.ownerName && app.ownerEmail && (
                                                <span className="text-xs text-gray-500 truncate">
                                                    {app.ownerEmail}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {app.createdAt && (
                                    <p className="text-xs text-gray-500">
                                        Ngày tạo: {new Date(app.createdAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            {/* Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(app);
                                }}
                                className={`w-full px-4 py-2 border rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${app.status === 'deleted'
                                        ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                        : 'bg-red-900/20 border-red-700 text-red-400 hover:bg-red-900/30'
                                    }`}
                            >
                                <FiTrash2 size={14} />
                                {app.status === 'deleted' ? 'Xóa vĩnh viễn' : 'Xóa ứng dụng'}
                            </button>
                        </Card>
                    ))}
                </div>
            )}

            {/* Summary */}
            {!loading && filteredApps.length > 0 && (
                <Card className="mt-6 p-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                            Hiển thị {filteredApps.length} trong số {allApps.length} ứng dụng
                            {showDeleted && ` (${apps.length} hoạt động, ${deletedApps.length} đã xóa)`}
                        </span>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="text-blue-400 hover:text-blue-300"
                            >
                                Xóa tìm kiếm
                            </button>
                        )}
                    </div>
                </Card>
            )}
        </DashboardLayout>
    );
};

export default AllAppsView;
