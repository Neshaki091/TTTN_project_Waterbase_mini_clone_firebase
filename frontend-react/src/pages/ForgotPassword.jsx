import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/auth.service';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import WaterDropLogo from '../components/common/WaterDropLogo';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authService.forgotPassword(email);
            toast.success(response.message || 'Mật khẩu tạm thời đã được gửi đến email của bạn');
            setSubmitted(true);
        } catch (error) {
            const message = error.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <WaterDropLogo size={48} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quên mật khẩu</h1>
                    <p className="text-gray-400">Nhập email để khôi phục tài khoản</p>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-700 p-8">
                    {!submitted ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="owner@example.com"
                            />

                            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                                <p className="text-sm text-blue-300">
                                    💡 Chúng tôi sẽ gửi mật khẩu tạm thời đến email của bạn.
                                    Vui lòng đổi mật khẩu ngay sau khi đăng nhập.
                                </p>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Đang xử lý...' : 'Gửi yêu cầu'}
                            </Button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    ← Quay lại đăng nhập
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-semibold text-white">Email đã được gửi!</h3>

                            <p className="text-gray-400">
                                Vui lòng kiểm tra hộp thư email của bạn. Mật khẩu tạm thời đã được gửi đến <strong className="text-white">{email}</strong>
                            </p>

                            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mt-4">
                                <p className="text-sm text-yellow-300">
                                    ⚠️ Nếu không thấy email, vui lòng kiểm tra thư mục spam hoặc thư rác.
                                </p>
                            </div>

                            <Link to="/login">
                                <Button className="w-full mt-4">
                                    Đăng nhập ngay
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
