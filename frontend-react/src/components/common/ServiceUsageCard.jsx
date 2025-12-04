import { FiDatabase, FiActivity } from 'react-icons/fi';
import Card from '../common/Card';

const ServiceUsageCard = ({ title, icon: Icon, usage, loading, compact = false }) => {
    const { totalCollections = 0, totalDocuments = 0, usedBytes = 0 } = usage || {};
    const quotaBytes = 100 * 1024 * 1024; // 100MB
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
    const quotaMB = 100;
    const percentage = Math.min((usedBytes / quotaBytes) * 100, 100);

    const getProgressColor = () => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    if (compact) {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <Icon className="text-blue-400" size={18} />
                        <span className="text-sm font-medium text-gray-300">{title}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                        {usedMB} / {quotaMB} MB
                    </span>
                </div>

                {loading ? (
                    <div className="text-gray-500 text-xs">Đang tải...</div>
                ) : (
                    <>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                        <div className="text-xs text-gray-400">
                            {totalCollections} collections • {totalDocuments} documents
                        </div>
                        {percentage >= 80 && (
                            <div className="text-xs text-yellow-400 mt-1">
                                ⚠️ {percentage >= 90 ? 'Gần đầy!' : 'Sắp đầy'}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Icon className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <p className="text-sm text-gray-400">
                            {totalCollections} collections • {totalDocuments} documents
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-gray-400 text-sm">Đang tải...</div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Dung lượng sử dụng</span>
                        <span className="text-sm font-semibold text-white">
                            {usedMB} MB / {quotaMB} MB
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>

                    {percentage >= 80 && (
                        <div className="text-xs text-yellow-400 flex items-center space-x-1">
                            <span>⚠️</span>
                            <span>
                                {percentage >= 90
                                    ? 'Dung lượng gần đầy! Hãy xóa bớt dữ liệu.'
                                    : 'Dung lượng sắp đầy.'}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default ServiceUsageCard;
