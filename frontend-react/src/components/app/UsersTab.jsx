import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUsers, FiSearch, FiRefreshCw, FiEye, FiLock, FiUnlock, FiTrash2 } from 'react-icons/fi';
import userService from '../../services/user.service';
import Modal from '../common/Modal';
import Button from '../common/Button';

const UsersTab = ({ appId }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        loadUsers();
    }, [appId]);

    useEffect(() => {
        // Filter users based on search term
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (user) =>
                        user.email?.toLowerCase().includes(term) ||
                        user.username?.toLowerCase().includes(term)
                )
            );
        }
    }, [searchTerm, users]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers(appId);
            setUsers(data);
            setFilteredUsers(data);
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể tải danh sách người dùng';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (user) => {
        setSelectedUser(user);
        setShowDetailsModal(true);
    };

    const handleToggleStatus = (user) => {
        setSelectedUser(user);
        setConfirmAction({
            type: 'toggle',
            message: user.isActive
                ? `Bạn có chắc muốn khóa tài khoản "${user.email}"?`
                : `Bạn có chắc muốn mở khóa tài khoản "${user.email}"?`,
            action: async () => {
                try {
                    await userService.toggleUserStatus(user._id, !user.isActive, appId);
                    toast.success(
                        user.isActive ? 'Đã khóa người dùng' : 'Đã mở khóa người dùng'
                    );
                    loadUsers();
                } catch (error) {
                    const message = error.response?.data?.message || 'Không thể cập nhật trạng thái';
                    toast.error(message);
                }
            },
        });
        setShowConfirmModal(true);
    };

    const handleDelete = (user) => {
        setSelectedUser(user);
        setConfirmAction({
            type: 'delete',
            message: `Bạn có chắc muốn xóa người dùng "${user.email}"? Hành động này không thể hoàn tác!`,
            action: async () => {
                try {
                    await userService.deleteUser(user._id, appId);
                    toast.success('Đã xóa người dùng');
                    loadUsers();
                } catch (error) {
                    const message = error.response?.data?.message || 'Không thể xóa người dùng';
                    toast.error(message);
                }
            },
        });
        setShowConfirmModal(true);
    };

    const executeConfirmAction = async () => {
        setShowConfirmModal(false);
        if (confirmAction?.action) {
            await confirmAction.action();
        }
        setConfirmAction(null);
        setSelectedUser(null);
    };

    const activeUsersCount = users.filter((u) => u.isActive).length;

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Đang tải danh sách người dùng...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FiUsers />
                        Người dùng
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Tổng: {users.length} | Hoạt động: {activeUsersCount} | Bị khóa:{' '}
                        {users.length - activeUsersCount}
                    </p>
                </div>
                <Button onClick={loadUsers} className="flex items-center gap-2">
                    <FiRefreshCw />
                    Làm mới
                </Button>
            </div>

            {/* Search Bar */}
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

            {/* Users Table */}
            {filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                    <FiUsers className="mx-auto text-gray-600 mb-4" size={48} />
                    <p className="text-gray-400">
                        {searchTerm ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full bg-gray-800 rounded-lg overflow-hidden">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Username
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredUsers.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-750 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {user.username || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isActive
                                                    ? 'bg-green-900 text-green-300'
                                                    : 'bg-red-900 text-red-300'
                                                }`}
                                        >
                                            {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {user.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewDetails(user)}
                                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <FiEye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`transition-colors ${user.isActive
                                                        ? 'text-yellow-400 hover:text-yellow-300'
                                                        : 'text-green-400 hover:text-green-300'
                                                    }`}
                                                title={user.isActive ? 'Khóa' : 'Mở khóa'}
                                            >
                                                {user.isActive ? <FiLock size={18} /> : <FiUnlock size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="Xóa"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* User Details Modal */}
            {showDetailsModal && selectedUser && (
                <Modal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedUser(null);
                    }}
                    title="Chi tiết người dùng"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                User ID
                            </label>
                            <p className="text-white font-mono text-sm bg-gray-800 p-2 rounded">
                                {selectedUser._id}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                            <p className="text-white">{selectedUser.email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Username
                            </label>
                            <p className="text-white">{selectedUser.username || '-'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                App ID
                            </label>
                            <p className="text-white font-mono text-sm">{selectedUser.appId}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Trạng thái
                            </label>
                            <span
                                className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${selectedUser.isActive
                                        ? 'bg-green-900 text-green-300'
                                        : 'bg-red-900 text-red-300'
                                    }`}
                            >
                                {selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}
                            </span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Ngày tạo
                            </label>
                            <p className="text-white">
                                {selectedUser.createdAt
                                    ? new Date(selectedUser.createdAt).toLocaleString('vi-VN')
                                    : '-'}
                            </p>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && confirmAction && (
                <Modal
                    isOpen={showConfirmModal}
                    onClose={() => {
                        setShowConfirmModal(false);
                        setConfirmAction(null);
                        setSelectedUser(null);
                    }}
                    title="Xác nhận"
                >
                    <div className="space-y-4">
                        <p className="text-gray-300">{confirmAction.message}</p>
                        <div className="flex justify-end gap-3">
                            <Button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setConfirmAction(null);
                                    setSelectedUser(null);
                                }}
                                className="bg-gray-700 hover:bg-gray-600"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={executeConfirmAction}
                                className={
                                    confirmAction.type === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }
                            >
                                Xác nhận
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UsersTab;
