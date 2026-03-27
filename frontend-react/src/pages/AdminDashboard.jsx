import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUsers, FiPackage, FiDatabase, FiHardDrive, FiTrendingUp, FiCpu, FiActivity, FiActivity as FiStatus, FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCcw } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import adminService from '../services/admin.service';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import API_ENDPOINTS from '../config/api.config';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isAdmin, loading: appLoading } = useApp();
    const [activeTab, setActiveTab] = useState('system'); // 'system' or 'owners'
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOwners: 0,
        newOwnersThisMonth: 0,
        totalApps: 0,
        newAppsThisMonth: 0,
        totalDbStorage: 0,
        totalRtStorage: 0,
        totalFileStorage: 0,
        ownerBreakdown: [],
        trendsData: []
    });

    const [systemStatus, setSystemStatus] = useState(null);
    const [systemLoading, setSystemLoading] = useState(true);

    useEffect(() => {
        if (appLoading) return;
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadDashboardStats();
        loadSystemStatus();
        
        // Refresh system status every 30 seconds
        const timer = setInterval(() => loadSystemStatus(true), 30000);
        return () => clearInterval(timer);
    }, [isAdmin, navigate, appLoading]);

    const loadSystemStatus = async (isSilent = false) => {
        try {
            if (!isSilent) setSystemLoading(true);
            const response = await fetch(API_ENDPOINTS.AI.ADMIN + '/system/status');
            if (response.ok) {
                const data = await response.json();
                setSystemStatus(data);
            }
        } catch (error) {
            console.error('Failed to load system status', error);
        } finally {
            if (!isSilent) setSystemLoading(false);
        }
    };

    const loadDashboardStats = async () => {
        try {
            setLoading(true);
            const data = await adminService.getDashboardStats();
            setStats(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể tải thống kê bảng điều khiển');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <>
                <div className="text-center py-12">
                    <p className="text-gray-400">Đang tải bảng điều khiển...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Bảng điều khiển Admin</h1>
                <p className="text-gray-400">Phân tích và quản lý toàn hệ thống</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'system'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    Tổng quan hệ thống
                </button>
                <button
                    onClick={() => setActiveTab('owners')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'owners'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-gray-300'
                        }`}
                >
                    Chi tiết theo Owner
                </button>
            </div>

            {/* System Overview Tab */}
            {activeTab === 'system' && (
                <div className="space-y-6">
                    {/* Infrastructure & Hardware Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6 border-t-2 border-blue-500 bg-gray-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-gray-400 text-sm font-medium uppercase tracking-wider">CPU</h4>
                                <FiCpu className="text-blue-400" size={20} />
                            </div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-white">
                                    {systemLoading ? '...' : `${systemStatus?.cpu_percent}%`}
                                </span>
                            </div>
                            <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                                <div 
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" 
                                    style={{ width: `${systemStatus?.cpu_percent || 0}%` }}
                                ></div>
                            </div>
                        </Card>

                        <Card className="p-6 border-t-2 border-green-500 bg-gray-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-gray-400 text-sm font-medium uppercase tracking-wider">RAM</h4>
                                <FiActivity className="text-green-400" size={20} />
                            </div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-white">
                                    {systemLoading ? '...' : `${systemStatus?.ram_percent}%`}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {systemStatus ? `(${systemStatus.ram_used_gb}G/${systemStatus.ram_total_gb}G)` : ''}
                                </span>
                            </div>
                            <div className="mt-2 w-full bg-gray-800 rounded-full h-1.5">
                                <div 
                                    className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" 
                                    style={{ width: `${systemStatus?.ram_percent || 0}%` }}
                                ></div>
                            </div>
                        </Card>

                        <Card className="p-6 border-t-2 border-orange-500 bg-gray-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Disk</h4>
                                <FiHardDrive className="text-orange-400" size={20} />
                            </div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-white">
                                    {systemLoading ? '...' : `${systemStatus?.disk_percent}%`}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {systemStatus ? `${systemStatus.disk_used_gb}G sử dụng` : ''}
                                </span>
                            </div>
                        </Card>

                        <Card className="p-6 border-t-2 border-red-500 bg-gray-900/40">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Temp</h4>
                                <span className="text-red-400 font-bold">°C</span>
                            </div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-white">
                                    {systemLoading ? '...' : systemStatus?.temperature}
                                </span>
                                <span className="text-gray-500 text-xs">Coretemp</span>
                            </div>
                        </Card>
                    </div>

                    {/* Microservices Health */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 p-6 bg-gray-900/40 border-gray-800">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                <FiStatus className="mr-2 text-blue-400" />
                                Trạng thái dịch vụ (Microservices)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {!systemStatus ? (
                                    <p className="text-gray-500 text-xs italic col-span-full">Đang kết nối agent giám sát...</p>
                                ) : (
                                    systemStatus.services?.map(service => (
                                        <div key={service.name} className="flex items-center space-x-2 p-2 rounded bg-gray-800/50 border border-gray-700">
                                            {service.status === 'online' ? (
                                                <FiCheckCircle className="text-green-500 flex-shrink-0" size={14} />
                                            ) : (
                                                <FiXCircle className="text-red-500 flex-shrink-0" size={14} />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-200 truncate">{service.name}</p>
                                                <p className={`text-[10px] uppercase ${service.status === 'online' ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                                    {service.status === 'online' ? 'Online' : 'Offline'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* AI Embedding & Knowledge Status */}
                        <Card className="p-6 bg-gray-900/40 border-gray-800 flex flex-col">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <FiDatabase className="mr-2 text-purple-400" />
                                    Knowledge Vault
                                </div>
                                {systemStatus?.embedding_status?.running && (
                                    <div className="flex items-center text-[10px] text-purple-400 font-bold animate-pulse">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5"></div>
                                        PROCESSING
                                    </div>
                                )}
                            </h3>
                            
                            <div className="flex-1 space-y-4">
                                <div className="p-3 rounded bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-gray-400 mb-1">Trạng thái Embedding:</p>
                                    <p className="text-xs font-medium text-white">
                                        {systemStatus?.embedding_status?.running 
                                            ? systemStatus.embedding_status.progress 
                                            : (systemStatus?.embedding_status?.last_result || 'Sẵn sàng')}
                                    </p>
                                    {systemStatus?.embedding_status?.running && (
                                        <div className="mt-2 w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                                            <div className="bg-purple-500 h-full w-2/3 animate-[shimmer_2s_infinite] origin-left"></div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={async () => {
                                        try {
                                            const resp = await fetch(API_ENDPOINTS.AI.ADMIN + '/reload', { method: 'POST' });
                                            if (resp.ok) toast.success('Đã bắt đầu nạp lại dữ liệu!');
                                            loadSystemStatus();
                                        } catch (e) {
                                            toast.error('Không thể bắt đầu reload');
                                        }
                                    }}
                                    disabled={systemStatus?.embedding_status?.running}
                                    className={`w-full py-2 rounded text-xs font-medium flex items-center justify-center transition-all ${
                                        systemStatus?.embedding_status?.running
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                    }`}
                                >
                                    <FiRefreshCcw className={`mr-2 ${systemStatus?.embedding_status?.running ? 'animate-spin' : ''}`} size={12} />
                                    Reload Knowledge
                                </button>
                            </div>
                        </Card>
                    </div>

                    <div className="border-b border-gray-800 my-4"></div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <FiUsers className="text-blue-400" size={32} />
                                <span className="text-xs text-green-400 font-medium">
                                    +{stats.newOwnersThisMonth} tháng này
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">{stats.totalOwners}</h3>
                            <p className="text-gray-400 text-sm">Tổng số Owner</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <FiPackage className="text-green-400" size={32} />
                                <span className="text-xs text-green-400 font-medium">
                                    +{stats.newAppsThisMonth} tháng này
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">{stats.totalApps}</h3>
                            <p className="text-gray-400 text-sm">Tổng số ứng dụng</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <FiDatabase className="text-blue-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">
                                {formatBytes(stats.totalDbStorage)}
                            </h3>
                            <p className="text-gray-400 text-sm">WaterDB</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <FiDatabase className="text-green-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">
                                {formatBytes(stats.totalRtStorage)}
                            </h3>
                            <p className="text-gray-400 text-sm">RTWaterDB</p>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <FiHardDrive className="text-orange-400" size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1">
                                {formatBytes(stats.totalFileStorage)}
                            </h3>
                            <p className="text-gray-400 text-sm">Storage</p>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Growth Trends */}
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <FiTrendingUp className="mr-2" />
                                Xu hướng tăng trưởng (6 tháng qua)
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stats.trendsData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="month" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                        labelStyle={{ color: '#F3F4F6' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="owners" stroke="#3B82F6" name="Owners" />
                                    <Line type="monotone" dataKey="apps" stroke="#10B981" name="Apps" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Storage Distribution */}
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Phân bố lưu trữ</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'WaterDB', value: stats.totalDbStorage },
                                            { name: 'RTWaterDB', value: stats.totalRtStorage },
                                            { name: 'Storage', value: stats.totalFileStorage }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {[0, 1, 2].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value, entry) => (
                                            <span style={{ color: '#F3F4F6' }}>
                                                {value}: {formatBytes(entry.payload.value)}
                                            </span>
                                        )}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                        formatter={(value) => formatBytes(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card
                            hover
                            onClick={() => navigate('/admin/owners')}
                            className="p-6 cursor-pointer"
                        >
                            <FiUsers className="text-blue-400 mb-4" size={32} />
                            <h3 className="text-lg font-semibold text-white mb-2">Quản lý Owner</h3>
                            <p className="text-gray-400 text-sm">
                                Xem, tạo, khóa/mở khóa và quản lý các owner
                            </p>
                        </Card>

                        <Card
                            hover
                            onClick={() => navigate('/admin/apps')}
                            className="p-6 cursor-pointer"
                        >
                            <FiPackage className="text-green-400 mb-4" size={32} />
                            <h3 className="text-lg font-semibold text-white mb-2">Tất cả ứng dụng</h3>
                            <p className="text-gray-400 text-sm">
                                Xem và quản lý tất cả ứng dụng, kiểm tra sử dụng dịch vụ, xóa nếu cần
                            </p>
                        </Card>
                    </div>
                </div>
            )}

            {/* Deleted Apps Tab */}
            {activeTab === 'deleted' && (
                <div className="space-y-6">
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center">
                                    <FiTrash2 className="mr-2" />
                                    Danh sách App đã xóa ({deletedApps.length})
                                </h3>
                            </div>

                            {deletedAppsLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-400">Đang tải...</p>
                                </div>
                            ) : deletedApps.length === 0 ? (
                                <div className="text-center py-8">
                                    <FiTrash2 className="mx-auto text-gray-600 mb-3" size={48} />
                                    <p className="text-gray-400">Không có app nào đã bị xóa</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-700">
                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">Tên App</th>
                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">App ID</th>
                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">Owner</th>
                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">Ngày xóa</th>
                                                <th className="text-left py-3 px-4 text-gray-400 font-medium">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedApps.map((app) => (
                                                <tr key={app.appId} className="border-b border-gray-700 hover:bg-gray-800/50">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="text-white font-medium">{app.name}</p>
                                                            <p className="text-xs text-gray-500">{app.description || 'Không có mô tả'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{app.appId}</code>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="text-gray-300">{app.ownerEmail || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-500">{app.ownerName || '-'}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-400 text-sm">
                                                        {formatDate(app.updatedAt)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button
                                                            onClick={() => handlePermanentDelete(app.appId, app.name)}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                                                        >
                                                            <FiTrash2 size={14} />
                                                            Xóa vĩnh viễn
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Per Owner Breakdown Tab */}
            {activeTab === 'owners' && (
                <div className="space-y-6">
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Owner</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Ứng dụng</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">WaterDB</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">RTWaterDB</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Storage</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Dịch vụ đã dùng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.ownerBreakdown.map((owner) => (
                                        <tr key={owner._id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="text-white font-medium">{owner.email}</p>
                                                    <p className="text-xs text-gray-500">{owner.username || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-300">{owner.appCount}</td>
                                            <td className="py-3 px-4">
                                                <span className="text-blue-400 font-medium">{formatBytes(owner.dbStorage)}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-green-400 font-medium">{formatBytes(owner.rtStorage || 0)}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-purple-400 font-medium">{formatBytes(owner.fileStorage)}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {owner.servicesUsed.database && (
                                                        <span className="px-2 py-1 bg-blue-900/30 border border-blue-700 text-blue-400 rounded text-xs">
                                                            WaterDB
                                                        </span>
                                                    )}
                                                    {owner.servicesUsed.realtime && (
                                                        <span className="px-2 py-1 bg-green-900/30 border border-green-700 text-green-400 rounded text-xs">
                                                            RTWaterDB
                                                        </span>
                                                    )}
                                                    {owner.servicesUsed.storage && (
                                                        <span className="px-2 py-1 bg-purple-900/30 border border-purple-700 text-purple-400 rounded text-xs">
                                                            Storage
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
};

export default AdminDashboard;
