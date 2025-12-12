import { Link, useNavigate } from 'react-router-dom';
import { FiShield, FiChevronDown, FiUser, FiLock, FiLogOut } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';
import WaterDropLogo from '../common/WaterDropLogo';

const Header = () => {
  const { currentUser, logout, isAdmin } = useApp();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserDisplayName = () => {
    if (currentUser?.profile?.username) return currentUser.profile.username;
    if (currentUser?.profile?.name) return currentUser.profile.name;
    if (currentUser?.profile?.email) return currentUser.profile.email;
    if (currentUser?.email) return currentUser.email;
    return 'User';
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <Link to={isAdmin ? '/admin' : '/'} className="flex items-center space-x-3">
              <WaterDropLogo size={28} className="flex-shrink-0" />
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-blue-500">Waterbase</span>
                <span className="text-sm text-gray-400">Console</span>
              </div>
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
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span className="text-sm text-gray-300">{getUserDisplayName()}</span>
                  <FiChevronDown
                    className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    size={16}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-xs text-gray-400">Đăng nhập với</p>
                      <p className="text-sm text-white font-medium truncate">
                        {currentUser.profile?.email || currentUser.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <FiUser size={16} />
                        <span>Xem thông tin</span>
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/change-password');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <FiLock size={16} />
                        <span>Đổi mật khẩu</span>
                      </button>

                      <div className="border-t border-gray-700 my-1"></div>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                      >
                        <FiLogOut size={16} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

