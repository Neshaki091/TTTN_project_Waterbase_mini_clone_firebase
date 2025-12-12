import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApp } from '../context/AppContext';
import authService from '../services/auth.service';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const UserProfile = () => {
    const { currentUser, updateCurrentUser } = useApp();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                username: currentUser.profile?.username || '',
                email: currentUser.profile?.email || currentUser.email || '',
            });
        }
    }, [currentUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authService.updateProfile({
                username: formData.username,
            });

            // Update context with new user data
            updateCurrentUser(response.owner);

            toast.success('Cập nhật thông tin thành công!');
        } catch (error) {
            const message = error.response?.data?.message || 'Cập nhật thất bại';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Thông tin cá nhân</h1>
                    <p className="text-gray-400">Quản lý thông tin tài khoản của bạn</p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-gray-800 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 -mt-2">
                                Email không thể thay đổi
                            </p>

                            <Input
                                label="Tên đăng nhập"
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                placeholder="johndoe"
                            />

                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-white mb-1">Vai trò</h4>
                                        <p className="text-sm text-gray-400">
                                            {currentUser?.role === 'adminWaterbase' ? 'Quản trị viên' : 'Chủ sở hữu'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate('/change-password')}
                            >
                                Đổi mật khẩu
                            </Button>

                            <div className="flex space-x-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/')}
                                >
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default UserProfile;
