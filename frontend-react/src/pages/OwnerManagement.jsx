import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiLock, FiUnlock } from 'react-icons/fi';
import adminService from '../services/admin.service';
import { useApp } from '../context/AppContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

const OwnerManagement = () => {
    const navigate = useNavigate();
    const { isAdmin } = useApp();
    const [owners, setOwners] = useState([]);
    const [filteredOwners, setFilteredOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadOwners();
    }, [isAdmin, navigate]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = owners.filter(
                (owner) =>
                    owner.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    owner.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOwners(filtered);
        } else {
            setFilteredOwners(owners);
        }
    }, [searchTerm, owners]);

    const loadOwners = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAllOwners();
            setOwners(Array.isArray(data) ? data : []);
            setFilteredOwners(Array.isArray(data) ? data : []);
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể tải danh sách owner';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOwner = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error('Email và mật khẩu là bắt buộc');
            return;
        }

        setCreating(true);
        try {
            await adminService.createOwner(formData);
            toast.success('Đã tạo owner thành công!');
            setShowCreateModal(false);
            setFormData({ name: '', email: '', password: '' });
            await loadOwners();
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể tạo owner';
            toast.error(message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteOwner = async () => {
        if (!selectedOwner) return;

        setDeleting(true);
        try {
            await adminService.deleteOwner(selectedOwner._id);
            toast.success('Đã xóa owner thành công!');
            setShowDeleteModal(false);
            setSelectedOwner(null);
            await loadOwners();
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể xóa owner';
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quản lý Owner</h1>
                    <p className="text-gray-400">Quản lý các owner và quyền hạn của họ</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <FiPlus className="inline mr-2" />
                    Tạo Owner
                </Button>
            </div>

            {/* Search */}
            <Card className="p-4 mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo email hoặc username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </Card>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">Đang tải danh sách owner...</p>
                </div>
            ) : filteredOwners.length === 0 ? (
                <Card className="text-center py-12">
                    <h3 className="text-xl font-semibold text-white mb-2">Không tìm thấy owner nào</h3>
                    <p className="text-gray-400 mb-6">
                        {searchTerm ? 'Thử từ khóa tìm kiếm khác' : 'Tạo owner đầu tiên để bắt đầu'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={() => setShowCreateModal(true)}>Tạo Owner</Button>
                    )}
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Username</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Vai trò</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Ứng dụng</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">WaterDB</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">RTWaterDB</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Storage</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Ngày tạo</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOwners.map((owner) => (
                                    <tr key={owner._id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                        <td className="py-3 px-4 text-white">{owner.profile?.email}</td>
                                        <td className="py-3 px-4 text-gray-300">
                                            {owner.profile?.username || '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${owner.role === 'adminWaterbase'
                                                    ? 'bg-red-900/30 border border-red-700 text-red-400'
                                                    : 'bg-blue-900/30 border border-blue-700 text-blue-400'
                                                    }`}
                                            >
                                                {owner.role === 'adminWaterbase' ? 'Admin' : 'Owner'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-300">
                                            {owner.apps?.length || 0}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-blue-400 font-medium text-sm">
                                                {owner.storageStats?.waterdb || '0 B'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-green-400 font-medium text-sm">
                                                {owner.storageStats?.rtwaterdb || '0 B'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-purple-400 font-medium text-sm">
                                                {owner.storageStats?.storage || '0 B'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 text-sm">
                                            {owner.createdAt
                                                ? new Date(owner.createdAt).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end space-x-2">
                                                {/* Lock/Unlock Button */}
                                                <button
                                                    onClick={async () => {
                                                        const action = owner.status === 'suspended' ? 'unlock' : 'lock';
                                                        const actionText = owner.status === 'suspended' ? 'mở khóa' : 'khóa';
                                                        if (window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này?`)) {
                                                            try {
                                                                await adminService.lockOwner(owner._id, action === 'lock');
                                                                toast.success(`Tài khoản đã được ${actionText} thành công`);
                                                                loadOwners();
                                                            } catch (error) {
                                                                toast.error(error.response?.data?.message || `Không thể ${actionText} tài khoản`);
                                                            }
                                                        }
                                                    }}
                                                    className={`p-2 rounded transition-colors ${owner.status === 'suspended'
                                                        ? 'text-green-400 hover:bg-green-900/20'
                                                        : 'text-yellow-400 hover:bg-yellow-900/20'
                                                        }`}
                                                    title={owner.status === 'suspended' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                                    disabled={owner.role === 'adminWaterbase'}
                                                >
                                                    {owner.status === 'suspended' ? <FiUnlock size={16} /> : <FiLock size={16} />}
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedOwner(owner);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                                    title="Xóa owner"
                                                    disabled={owner.role === 'adminWaterbase'}
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create Owner Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', email: '', password: '' });
                }}
                title="Tạo Owner mới"
            >
                <form onSubmit={handleCreateOwner} className="space-y-4">
                    <Input
                        label="Username (tùy chọn)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="johndoe"
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="owner@example.com"
                        required
                    />
                    <Input
                        label="Mật khẩu"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required
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
                            {creating ? 'Đang tạo...' : 'Tạo Owner'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedOwner(null);
                }}
                title="Xóa Owner"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Bạn có chắc chắn muốn xóa owner{' '}
                        <span className="font-semibold text-white">
                            {selectedOwner?.profile?.email}
                        </span>
                        ? Hành động này không thể hoàn tác.
                    </p>
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedOwner(null);
                            }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteOwner}
                            disabled={deleting}
                        >
                            {deleting ? 'Đang xóa...' : 'Xóa Owner'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default OwnerManagement;
