import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
    FiActivity,
    FiPlus,
    FiTrash2,
    FiSave,
    FiRefreshCw,
    FiDatabase,
    FiFileText,
    FiCircle,
    FiCheckCircle
} from 'react-icons/fi';
import rtwaterdbService from '../../services/rtwaterdb.service';
import appService from '../../services/app.service';
import useRealtime from '../../hooks/useRealtime';
import Button from '../common/Button';
import Input from '../common/Input';
import ServiceUsageCard from '../common/ServiceUsageCard';

const RealtimeDataPlaygroundTab = ({ appId }) => {
    // --- State ---
    // Usage Stats
    const [rtWaterdbUsage, setRtWaterdbUsage] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);

    const [collections, setCollections] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState(null);
    const [documentData, setDocumentData] = useState('');

    // UI State
    const [loadingCollections, setLoadingCollections] = useState(false);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isCreatingDoc, setIsCreatingDoc] = useState(false);
    const [isCreatingCol, setIsCreatingCol] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newDocId, setNewDocId] = useState('');

    // Realtime hook
    const { events, isConnected, error: realtimeError, clearEvents } = useRealtime(appId, selectedCollection);

    // --- Effects ---

    useEffect(() => {
        if (appId) {
            localStorage.setItem('currentAppId', appId);
            fetchCollections();
            loadUsageStats();
        }
    }, [appId]);

    // Load usage stats
    const loadUsageStats = async () => {
        try {
            setUsageLoading(true);
            const data = await appService.getRTWaterDBUsage(appId);
            setRtWaterdbUsage(data);
        } catch (error) {
            console.error('Failed to load RTWaterDB usage stats:', error);
        } finally {
            setUsageLoading(false);
        }
    };

    // Handle realtime events
    useEffect(() => {
        if (events.length === 0) return;

        const latestEvent = events[events.length - 1];
        console.log('🔴 Realtime Event:', latestEvent);

        // If event is for current collection
        if (latestEvent.collection === selectedCollection) {
            if (latestEvent.type === 'create') {
                toast.success(`📝 Tài liệu mới được tạo: ${latestEvent.documentId}`, {
                    autoClose: 2000,
                    position: 'bottom-right'
                });
                fetchDocuments(selectedCollection);
            } else if (latestEvent.type === 'update') {
                toast.info(`✏️ Tài liệu đã được cập nhật: ${latestEvent.documentId}`, {
                    autoClose: 2000,
                    position: 'bottom-right'
                });

                // If currently viewing this document, refresh it
                if (latestEvent.documentId === selectedDocumentId) {
                    fetchDocuments(selectedCollection);
                }
            } else if (latestEvent.type === 'delete') {
                toast.warning(`🗑️ Tài liệu đã bị xóa: ${latestEvent.documentId}`, {
                    autoClose: 2000,
                    position: 'bottom-right'
                });

                // If currently viewing deleted document, clear selection
                if (latestEvent.documentId === selectedDocumentId) {
                    setSelectedDocumentId(null);
                    setDocumentData('');
                }
                fetchDocuments(selectedCollection);
            }
        }

        // Check if new collection was created
        if (latestEvent.type === 'create' && !collections.includes(latestEvent.collection)) {
            fetchCollections();
        }
    }, [events, selectedCollection, selectedDocumentId, collections]);

    // --- Actions ---

    const fetchCollections = async () => {
        setLoadingCollections(true);
        try {
            const response = await rtwaterdbService.getCollections();
            setCollections(response.collections || []);
        } catch (error) {
            console.error('Failed to fetch collections', error);
            toast.error('Không thể tải danh sách bộ sưu tập');
        } finally {
            setLoadingCollections(false);
        }
    };

    const handleSelectCollection = async (colName) => {
        if (selectedCollection === colName) return;
        setSelectedCollection(colName);
        setSelectedDocumentId(null);
        setDocumentData('');
        setIsCreatingDoc(false);
        setIsCreatingCol(false);
        clearEvents(); // Clear old events when switching collections
        await fetchDocuments(colName);
    };

    const fetchDocuments = async (colName) => {
        setLoadingDocuments(true);
        try {
            const response = await rtwaterdbService.getCollection(colName);
            setDocuments(response.documents || []);
        } catch (error) {
            console.error('Failed to fetch documents', error);
            setDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleSelectDocument = (doc) => {
        setSelectedDocumentId(doc._id || doc.id);
        setDocumentData(JSON.stringify(doc, null, 2));
        setIsCreatingDoc(false);
    };

    const handleStartCreateCollection = () => {
        setIsCreatingCol(true);
        setNewCollectionName('');
        setSelectedCollection(null);
        setSelectedDocumentId(null);
        setDocuments([]);
        setDocumentData('');
        setIsCreatingDoc(false);
    };

    const handleConfirmCreateCollection = () => {
        if (!newCollectionName.trim()) {
            toast.error('Tên bộ sưu tập là bắt buộc');
            return;
        }
        const name = newCollectionName.trim();
        setSelectedCollection(name);
        setIsCreatingCol(false);
        setDocuments([]);
        handleStartCreateDoc();
        toast.info(`Bộ sưu tập "${name}" đã sẵn sàng. Thêm một tài liệu để lưu nó.`);
    };

    const handleStartCreateDoc = () => {
        setIsCreatingDoc(true);
        setSelectedDocumentId(null);
        setDocumentData('{\n  \n}');
        setNewDocId('');
    };

    const handleSave = async () => {
        if (!selectedCollection) return;

        try {
            const parsedData = JSON.parse(documentData);
            setSaving(true);

            if (isCreatingDoc) {
                if (newDocId.trim()) {
                    await rtwaterdbService.updateDocument(selectedCollection, newDocId.trim(), parsedData);
                } else {
                    await rtwaterdbService.createDocument(selectedCollection, parsedData);
                }
                toast.success('Đã tạo tài liệu');

                if (!collections.includes(selectedCollection)) {
                    setCollections([...collections, selectedCollection]);
                }

                setIsCreatingDoc(false);
                setNewDocId('');
            } else {
                if (!selectedDocumentId) return;
                await rtwaterdbService.updateDocument(selectedCollection, selectedDocumentId, parsedData);
                toast.success('Đã cập nhật tài liệu');
            }

            await fetchDocuments(selectedCollection);

            if (isCreatingDoc) {
                setSelectedDocumentId(null);
                setDocumentData('');
            }

        } catch (error) {
            console.error('Save failed', error);
            if (error instanceof SyntaxError) {
                toast.error('Định dạng JSON không hợp lệ');
            } else {
                toast.error(error.response?.data?.message || 'Không thể lưu tài liệu');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCollection || !selectedDocumentId) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;

        setSaving(true);
        try {
            await rtwaterdbService.deleteDocument(selectedCollection, selectedDocumentId);
            toast.success('Đã xóa tài liệu');
            setSelectedDocumentId(null);
            setDocumentData('');
            await fetchDocuments(selectedCollection);
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Không thể xóa tài liệu');
        } finally {
            setSaving(false);
        }
    };

    // --- Render ---

    return (
        <div className="space-y-4 h-[calc(100vh-200px)] flex flex-col">
            {/* Header with Realtime Status */}
            <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-800 shrink-0">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center">
                        <FiActivity className="mr-2 text-blue-500" />
                        Realtime Data Playground
                    </h2>
                    <p className="text-gray-400 text-sm">Cập nhật cơ sở dữ liệu trực tiếp với WebSocket</p>
                </div>

                {/* Connection Status */}
                <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${isConnected
                        ? 'bg-green-900/20 border-green-500/30 text-green-400'
                        : 'bg-red-900/20 border-red-500/30 text-red-400'
                        }`}>
                        {isConnected ? (
                            <>
                                <FiCheckCircle className="animate-pulse" />
                                <span className="text-sm font-medium">Đã kết nối</span>
                            </>
                        ) : (
                            <>
                                <FiCircle />
                                <span className="text-sm font-medium">Đã ngắt kết nối</span>
                            </>
                        )}
                    </div>

                    {events.length > 0 && (
                        <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full text-sm">
                            {events.length} sự kiện
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {realtimeError && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
                    ⚠️ Lỗi kết nối Realtime: {realtimeError.message || 'Lỗi không xác định'}
                </div>
            )}

            {/* Usage Stats */}
            <ServiceUsageCard
                title="RTWaterDB Storage"
                icon={FiActivity}
                usage={rtWaterdbUsage}
                loading={usageLoading}
                compact={true}
            />

            {/* Main 3-Column Layout */}
            <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

                {/* Column 1: Collections */}
                <div className="col-span-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                        <h3 className="font-medium text-gray-200 flex items-center">
                            <FiDatabase className="mr-2" /> Bộ sưu tập
                        </h3>
                        <div className="flex space-x-1">
                            <button
                                onClick={handleStartCreateCollection}
                                className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-900/30 rounded"
                                title="Bộ sưu tập mới"
                            >
                                <FiPlus />
                            </button>
                            <button onClick={fetchCollections} className="text-gray-400 hover:text-white p-1">
                                <FiRefreshCw className={loadingCollections ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {isCreatingCol && (
                        <div className="p-2 bg-gray-800 border-b border-gray-700">
                            <Input
                                autoFocus
                                placeholder="Tên bộ sưu tập"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                className="mb-2 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreateCollection()}
                            />
                            <div className="flex justify-end space-x-2">
                                <Button size="sm" variant="outline" onClick={() => setIsCreatingCol(false)} className="!py-1 !px-2 text-xs">Hủy</Button>
                                <Button size="sm" onClick={handleConfirmCreateCollection} className="!py-1 !px-2 text-xs">Tạo</Button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {collections.map((col) => (
                            <button
                                key={col}
                                onClick={() => handleSelectCollection(col)}
                                className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors ${selectedCollection === col
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                    }`}
                            >
                                {col}
                            </button>
                        ))}
                        {collections.length === 0 && !loadingCollections && !isCreatingCol && (
                            <div className="text-center text-gray-500 text-sm py-4">Chưa có bộ sưu tập</div>
                        )}
                    </div>
                </div>

                {/* Column 2: Documents */}
                <div className="col-span-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                        <h3 className="font-medium text-gray-200 flex items-center">
                            <FiFileText className="mr-2" /> Tài liệu
                        </h3>
                        {selectedCollection && (
                            <button
                                onClick={handleStartCreateDoc}
                                className="text-blue-400 hover:text-blue-300 p-1 hover:bg-blue-900/30 rounded"
                                title="Thêm tài liệu"
                            >
                                <FiPlus />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {!selectedCollection ? (
                            <div className="text-center text-gray-500 text-sm py-4">Chọn một bộ sưu tập</div>
                        ) : loadingDocuments ? (
                            <div className="text-center text-gray-500 text-sm py-4">Đang tải...</div>
                        ) : (
                            <>
                                {isCreatingDoc && (
                                    <div className="px-3 py-2 rounded text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 italic">
                                        (Tài liệu mới)
                                    </div>
                                )}
                                {documents.map((doc) => {
                                    const id = doc._id || doc.id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => handleSelectDocument(doc)}
                                            className={`w-full text-left px-3 py-2 rounded text-sm truncate transition-colors font-mono ${selectedDocumentId === id
                                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                                }`}
                                        >
                                            {id}
                                        </button>
                                    );
                                })}
                                {documents.length === 0 && !isCreatingDoc && (
                                    <div className="text-center text-gray-500 text-sm py-4">Chưa có tài liệu</div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Column 3: Data Editor */}
                <div className="col-span-6 bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                        <h3 className="font-medium text-gray-200">Dữ liệu</h3>
                        <div className="flex space-x-2">
                            {(selectedDocumentId || isCreatingDoc) && (
                                <>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDelete}
                                        disabled={saving || isCreatingDoc}
                                        className="!py-1 !px-2"
                                    >
                                        <FiTrash2 />
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="!py-1 !px-3"
                                    >
                                        <FiSave className="mr-1" /> Lưu
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col bg-gray-950">
                        {(selectedDocumentId || isCreatingDoc) ? (
                            <>
                                {isCreatingDoc && (
                                    <div className="p-2 border-b border-gray-800 bg-gray-900/50">
                                        <Input
                                            placeholder="ID tài liệu tùy chỉnh (tùy chọn, để trống để tự động tạo)"
                                            value={newDocId}
                                            onChange={(e) => setNewDocId(e.target.value)}
                                            className="mb-0 text-sm font-mono"
                                        />
                                    </div>
                                )}
                                <textarea
                                    value={documentData}
                                    onChange={(e) => setDocumentData(e.target.value)}
                                    className="flex-1 w-full bg-transparent text-gray-300 font-mono text-sm p-4 focus:outline-none resize-none"
                                    spellCheck="false"
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                                Chọn một tài liệu để xem dữ liệu
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RealtimeDataPlaygroundTab;
