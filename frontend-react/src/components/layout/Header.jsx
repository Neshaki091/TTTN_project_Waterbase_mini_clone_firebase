import { Link, useNavigate } from 'react-router-dom';
import { FiShield } from 'react-icons/fi';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';

const Header = () => {
  const { currentUser, logout, isAdmin } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link to={isAdmin ? '/admin' : '/'} className="flex items-center space-x-2">
              <span className="text-xl font-bold text-blue-500">Waterbase</span>
              <span className="text-sm text-gray-400">Console</span>
            </Link>

            <nav className="flex items-center space-x-4 ml-6">
              <Link
                to="/guide"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Hướng dẫn
              </Link>
              <Link
                to="/sdk-download"
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                Tải SDK
              </Link>
            </nav>

            {/* Admin Navigation */}
            {isAdmin && (
              <nav className="flex items-center space-x-4 ml-8">
                <Link
                  to="/admin"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Quản trị
                </Link>
                <Link
                  to="/admin/owners"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Chủ sở hữu
                </Link>
                <Link
                  to="/admin/apps"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Tất cả ứng dụng
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-900/30 border border-red-700 rounded-full">
                <FiShield className="text-red-400" size={14} />
                <span className="text-red-400 text-xs font-medium">Admin</span>
              </div>
            )}
            {currentUser && (
              <>
                <span className="text-sm text-gray-300">
                  {currentUser.profile?.email || currentUser.email || currentUser.username || 'Owner'}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

