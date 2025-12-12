import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/auth.service';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Mật khẩu mới không khớp');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);

        try {
            await authService.changePassword(formData.currentPassword, formData.newPassword);
            toast.success('Đổi mật khẩu thành công!');

            // Clear form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            // Navigate back to profile after a short delay
            setTimeout(() => navigate('/profile'), 1500);
        } catch (error) {
            const message = error.response?.data?.message || 'Đổi mật khẩu thất bại';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Đổi mật khẩu</h1>
                    <p className="text-gray-400">Cập nhật mật khẩu để bảo mật tài khoản</p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                label="Mật khẩu hiện tại"
                                type="password"
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                required
                                placeholder="••••••••"
                            />

                            <Input
                                label="Mật khẩu mới"
                                type="password"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                required
                                placeholder="••••••••"
                            />

                            <Input
                                label="Xác nhận mật khẩu mới"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                placeholder="••••••••"
                            />

                            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-blue-300 mb-2">Yêu cầu mật khẩu:</h4>
                                <ul className="text-sm text-blue-200 space-y-1">
                                    <li className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>Ít nhất 6 ký tự</span>
                                    </li>
                                    <li className="flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>Nên kết hợp chữ hoa, chữ thường và số</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate('/profile')}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default ChangePassword;
