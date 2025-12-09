import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/auth.service';
import { useApp } from '../context/AppContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import WaterDropLogo from '../components/common/WaterDropLogo';

const Login = () => {
  const navigate = useNavigate();
  const { updateCurrentUser } = useApp();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.loginOwner(formData);
      const user = response.owner || response;
      updateCurrentUser(user);
      toast.success('Đăng nhập thành công!');

      if (user.role === 'admin' || user.role === 'adminWaterbase') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.registerOwner({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
      });
      updateCurrentUser(response.owner || response);
      toast.success('Đăng ký thành công!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng ký thất bại';
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
          <h1 className="text-3xl font-bold text-white mb-2">Waterbase Console</h1>
          <p className="text-gray-400">Quản lý ứng dụng của bạn</p>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 p-8">
          <div className="flex mb-6 border-b border-gray-700">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${!isRegister
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 text-center font-medium transition-colors ${isRegister
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              Đăng ký
            </button>
          </div>

          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="owner@example.com"
              />
              <Input
                label="Mật khẩu"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Tên đăng nhập"
                type="text"
                value={registerData.username}
                onChange={(e) =>
                  setRegisterData({ ...registerData, username: e.target.value })
                }
                required
                placeholder="johndoe"
              />
              <Input
                label="Email"
                type="email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData({ ...registerData, email: e.target.value })
                }
                required
                placeholder="owner@example.com"
              />
              <Input
                label="Mật khẩu"
                type="password"
                value={registerData.password}
                onChange={(e) =>
                  setRegisterData({ ...registerData, password: e.target.value })
                }
                required
                placeholder="••••••••"
              />
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({ ...registerData, confirmPassword: e.target.value })
                }
                required
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;


