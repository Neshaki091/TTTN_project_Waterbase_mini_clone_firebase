import Header from './Header';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {children}
      </main>
      <footer className="py-6 border-t border-gray-800 bg-gray-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm mb-2">
            Thiết Kế và phát triển bởi Huỳnh Công Luyện, sinh viên năm 4 tại UTH. đây là sản phẩm nghiên cứu học tập của cá nhân không nhằm mục đích cạnh tranh hoặc kiếm tiền
          </p>
          <p className="text-gray-600 text-xs italic">
            Vay mượn ý tưởng từ firebase
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;


