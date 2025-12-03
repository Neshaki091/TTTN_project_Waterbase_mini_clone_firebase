import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { FiUsers, FiDatabase, FiActivity, FiHardDrive, FiSettings, FiCode } from 'react-icons/fi';

const CodeBlock = ({ children, title }) => (
    <div className="my-4 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
        {title && (
            <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400 font-mono">
                {title}
            </div>
        )}
        <div className="p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
                <code>{children}</code>
            </pre>
        </div>
    </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg ${active
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
    >
        <Icon size={18} />
        <span>{label}</span>
    </button>
);

const Guide = () => {
    const [activeTab, setActiveTab] = useState('auth');

    const renderContent = () => {
        switch (activeTab) {
            case 'auth':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <FiUsers className="mr-3" /> Authentication (Xác thực)
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Quản lý người dùng, đăng ký, đăng nhập và phiên làm việc.
                            </p>

                            <h3 className="text-xl font-semibold text-white mb-3">1. Đăng ký User mới</h3>
                            <p className="text-gray-400 mb-2">Tạo tài khoản người dùng mới cho ứng dụng của bạn.</p>
                            <CodeBlock>
                                {`try {
    const result = await waterbase.auth.registerUser({
        email: 'user@example.com',
        password: 'password123',
        username: 'Nguyen Van A' // Tùy chọn
    });
    console.log('Đăng ký thành công:', result.user);
} catch (error) {
    console.error('Lỗi đăng ký:', error.message);
}`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">2. Đăng nhập</h3>
                            <p className="text-gray-400 mb-2">Xác thực người dùng và lấy token phiên làm việc.</p>
                            <CodeBlock>
                                {`try {
    const result = await waterbase.auth.loginUser('user@example.com', 'password123');
    console.log('Đăng nhập thành công:', result.user);
    // Token được tự động lưu trong SDK
} catch (error) {
    console.error('Lỗi đăng nhập:', error.message);
}`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">3. Lấy User hiện tại</h3>
                            <p className="text-gray-400 mb-2">Kiểm tra trạng thái đăng nhập và lấy thông tin user.</p>
                            <CodeBlock>
                                {`const currentUser = waterbase.auth.getCurrentUser();
if (currentUser) {
    console.log('User đang online:', currentUser.email);
} else {
    console.log('Chưa đăng nhập');
}`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">4. Đăng xuất</h3>
                            <CodeBlock>
                                {`waterbase.auth.logoutUser();`}
                            </CodeBlock>
                        </div>
                    </div>
                );

            case 'waterdb':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <FiDatabase className="mr-3" /> WaterDB (Cơ sở dữ liệu)
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Lưu trữ dữ liệu bền vững, hỗ trợ truy vấn phức tạp. Thích hợp cho thông tin user, bài viết, cài đặt.
                            </p>

                            <h3 className="text-xl font-semibold text-white mb-3">1. Thêm dữ liệu (Create)</h3>
                            <CodeBlock>
                                {`// Thêm document mới vào collection 'products'
try {
    const product = await waterbase.db.collection('products').add({
        name: 'iPhone 15',
        price: 999,
        category: 'electronics',
        inStock: true
    });
    console.log('Đã thêm sản phẩm:', product._id);
} catch (error) {
    console.error('Lỗi:', error);
}`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">2. Lấy dữ liệu (Read)</h3>
                            <CodeBlock>
                                {`// Lấy tất cả sản phẩm
const snapshot = await waterbase.db.collection('products').get();
console.log('Danh sách sản phẩm:', snapshot);

// Lấy 1 sản phẩm theo ID
const doc = await waterbase.db.collection('products').doc('product_id_123').get();
console.log('Chi tiết sản phẩm:', doc);`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">3. Cập nhật (Update)</h3>
                            <CodeBlock>
                                {`// Cập nhật giá sản phẩm
await waterbase.db.collection('products').doc('product_id_123').update({
    price: 899,
    inStock: false
});`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">4. Xóa (Delete)</h3>
                            <CodeBlock>
                                {`await waterbase.db.collection('products').doc('product_id_123').delete();`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">5. Truy vấn (Query)</h3>
                            <CodeBlock>
                                {`// Tìm sản phẩm điện tử có giá > 500
const expensiveElectronics = await waterbase.db.collection('products')
    .where('category', '==', 'electronics')
    .where('price', '>', 500)
    .orderBy('price', 'desc')
    .limit(10)
    .get();`}
                            </CodeBlock>
                        </div>
                    </div>
                );

            case 'rtwaterdb':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <FiActivity className="mr-3" /> RTWaterDB (Realtime)
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Cơ sở dữ liệu thời gian thực tốc độ cao. Thích hợp cho Chat, Thông báo, Trạng thái Online, Game.
                            </p>

                            <h3 className="text-xl font-semibold text-white mb-3">1. Gửi dữ liệu</h3>
                            <CodeBlock>
                                {`// Gửi tin nhắn chat
await waterbase.rtdb.collection('messages').add({
    text: 'Xin chào!',
    senderId: 'user_123',
    timestamp: Date.now()
});`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">2. Lắng nghe thay đổi (Subscribe)</h3>
                            <p className="text-gray-400 mb-2">Nhận dữ liệu ngay lập tức khi có thay đổi từ bất kỳ client nào.</p>
                            <CodeBlock>
                                {`// Lắng nghe collection 'messages'
const unsubscribe = waterbase.realtime.subscribe('messages', (event) => {
    if (event.type === 'created') {
        console.log('📩 Tin nhắn mới:', event.data);
        // Cập nhật UI: thêm tin nhắn vào danh sách
    } 
    else if (event.type === 'updated') {
        console.log('✏️ Tin nhắn đã sửa:', event.data);
    } 
    else if (event.type === 'deleted') {
        console.log('🗑️ Tin nhắn đã xóa:', event.data);
    }
});

// Ngừng lắng nghe khi component unmount
// unsubscribe();`}
                            </CodeBlock>
                        </div>
                    </div>
                );

            case 'storage':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <FiHardDrive className="mr-3" /> Storage (Lưu trữ)
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Lưu trữ file ảnh, video, tài liệu.
                            </p>

                            <h3 className="text-xl font-semibold text-white mb-3">1. Upload File</h3>
                            <CodeBlock>
                                {`const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const result = await waterbase.storage.upload(file, {
            folder: 'avatars', // Thư mục (tùy chọn)
            public: true       // File công khai
        });
        console.log('Upload xong! File ID:', result.fileId);
    } catch (error) {
        console.error('Lỗi upload:', error);
    }
};`}
                            </CodeBlock>

                            <h3 className="text-xl font-semibold text-white mt-8 mb-3">2. Lấy URL Download</h3>
                            <CodeBlock>
                                {`// Lấy link ảnh để hiển thị
const imageUrl = waterbase.storage.getDownloadUrl('file_id_123');
// <img src={imageUrl} />`}
                            </CodeBlock>
                        </div>
                    </div>
                );

            case 'rules':
                return (
                    <div className="space-y-8 animate-fadeIn">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <FiSettings className="mr-3" /> Rules (Phân quyền)
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Cấu hình bảo mật và quyền truy cập cho Database và Storage.
                            </p>

                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                                <FiSettings size={48} className="mx-auto text-gray-600 mb-4" />
                                <h3 className="text-xl font-medium text-gray-300 mb-2">
                                    Hướng dẫn cấu hình Rules (UI)
                                </h3>
                                <p className="text-gray-500">
                                    Hình ảnh hướng dẫn giao diện cấu hình Rules sẽ được cập nhật sau.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Hướng Dẫn Sử Dụng SDK</h1>
                    <p className="text-gray-400">Tài liệu chi tiết tích hợp Waterbase vào ứng dụng của bạn.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-8">
                            <div className="space-y-2">
                                <TabButton
                                    active={activeTab === 'auth'}
                                    onClick={() => setActiveTab('auth')}
                                    icon={FiUsers}
                                    label="Authentication"
                                />
                                <TabButton
                                    active={activeTab === 'waterdb'}
                                    onClick={() => setActiveTab('waterdb')}
                                    icon={FiDatabase}
                                    label="WaterDB"
                                />
                                <TabButton
                                    active={activeTab === 'rtwaterdb'}
                                    onClick={() => setActiveTab('rtwaterdb')}
                                    icon={FiActivity}
                                    label="RTWaterDB"
                                />
                                <TabButton
                                    active={activeTab === 'storage'}
                                    onClick={() => setActiveTab('storage')}
                                    icon={FiHardDrive}
                                    label="Storage"
                                />
                                <TabButton
                                    active={activeTab === 'rules'}
                                    onClick={() => setActiveTab('rules')}
                                    icon={FiSettings}
                                    label="Rules"
                                />
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-700">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                    Cài đặt nhanh
                                </h4>
                                <CodeBlock title="Terminal">
                                    npm install waterbase-sdk
                                </CodeBlock>
                            </div>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <Card className="min-h-[600px]">
                            {renderContent()}
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Guide;
