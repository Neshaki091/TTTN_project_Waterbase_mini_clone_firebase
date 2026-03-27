import Header from './Header';
import AIPanel from './AIPanel';
import { useAI } from '../../context/AIContext';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  const { isAIPanelOpen, toggleAIPanel } = useAI();

  return (
    <div className="h-screen bg-gray-950 flex flex-col relative overflow-hidden">
      <Header onToggleAI={toggleAIPanel} isAIOpen={isAIPanelOpen} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 custom-scrollbar flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-grow">
            <Outlet />
          </div>
          
          <footer className="py-6 border-t border-gray-800 bg-gray-900/50 mt-12 flex-shrink-0">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">
                Thiết Kế và phát triển bởi Huỳnh Công Luyện, sinh viên năm 4 tại UTH. đây là sản phẩm nghiên cứu học tập của cá nhân không nhằm mục đích cạnh tranh hoặc kiếm tiền
              </p>
              <p className="text-gray-600 text-xs italic">
                Vay mượn ý tưởng từ firebase
              </p>
            </div>
          </footer>
        </main>

        {/* AI Panel as a side area */}
        <AIPanel />
      </div>
    </div>
  );
};

export default DashboardLayout;


