import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiToggleLeft,
  FiToggleRight,
  FiPlus,
  FiTrash2,
  FiSave,
  FiRefreshCw,
  FiDatabase,
  FiFileText,
  FiX
} from 'react-icons/fi';
import databaseService from '../../services/database.service';
import realtimeService from '../../services/realtime.service';
import appService from '../../services/app.service';
import Button from '../common/Button';
import Input from '../common/Input';
import ServiceUsageCard from '../common/ServiceUsageCard';

const DataPlaygroundTab = ({ appId }) => {
  // --- State ---
  // Usage Stats
  const [waterdbUsage, setWaterdbUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Simulation
  const [simulateUser, setSimulateUser] = useState(false);
  const [userToken, setUserToken] = useState('');

  // Data Navigation
  const [collections, setCollections] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [documentData, setDocumentData] = useState(''); // Stringified JSON for editing

  // UI State
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false); // Creating new doc
  const [isCreatingCol, setIsCreatingCol] = useState(false); // Creating new collection
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newDocId, setNewDocId] = useState(''); // Optional ID for new doc

  // --- Effects ---

  // 1. Init App ID
  useEffect(() => {
    if (appId) {
      localStorage.setItem('currentAppId', appId);
      loadUsageStats();
    }
  }, [appId]);

  // Load usage stats
  const loadUsageStats = async () => {
    try {
      setUsageLoading(true);
      const data = await appService.getWaterDBUsage(appId);
      setWaterdbUsage(data);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setUsageLoading(false);
    }
  };

  // 2. Handle Simulation Token
  useEffect(() => {
    if (simulateUser && userToken) {
      localStorage.setItem('simulationUserToken', userToken);
    } else {
      localStorage.removeItem('simulationUserToken');
    }
  }, [simulateUser, userToken]);

  // 3. Fetch Collections on Mount
  useEffect(() => {
    if (appId) {
      fetchCollections();
    }
  }, [appId]);

  // 4. Realtime Connection
  useEffect(() => {
    if (appId) {
      realtimeService.connect(appId);

      const handleEvent = (event) => {
        console.log('Realtime Event:', event);

        // If a new collection is created (by adding first doc), refresh collections list
        if (event.type === 'create') {
          // We might want to refresh collections list occasionally or check if it's a new collection
          // For simplicity, let's just refresh collections if we are not currently creating one
          if (!collections.includes(event.collection)) {
            fetchCollections();
          }
        }

        if (event.collection === selectedCollection) {
          if (event.type === 'create' || event.type === 'delete') {
            fetchDocuments(selectedCollection);
            toast.info(`Tài liệu đã được ${event.type === 'create' ? 'tạo' : 'xóa'} trong ${event.collection}`);
          }

          if (event.type === 'update' && event.documentId === selectedDocumentId) {
            toast.info('Tài liệu này đã được cập nhật từ bên ngoài.');
          }
        }
      };

      realtimeService.onEvent(handleEvent);

      return () => {
        realtimeService.offEvent(handleEvent);
        realtimeService.disconnect();
      };
    }
  }, [appId, selectedCollection, selectedDocumentId, collections]);

  // 5. Subscribe to Collection
  useEffect(() => {
    if (selectedCollection) {
      realtimeService.subscribe(selectedCollection);
      return () => {
        realtimeService.unsubscribe(selectedCollection);
      };
    }
  }, [selectedCollection]);

  // --- Actions ---

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const response = await databaseService.getCollections();
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
    await fetchDocuments(colName);
  };

  const fetchDocuments = async (colName) => {
    setLoadingDocuments(true);
    try {
      const response = await databaseService.getCollection(colName);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents', error);
      // Don't show error if it's just empty/new collection
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
    // Reset other selections
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
    // "Create" the collection locally by selecting it. 
    // It will be truly created in backend when the first document is added.
    const name = newCollectionName.trim();
    setSelectedCollection(name);
    setIsCreatingCol(false);
    setDocuments([]); // Empty initially

    // Auto-start creating a document for this new collection
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
        // Create
        if (newDocId.trim()) {
          await databaseService.updateDocument(selectedCollection, newDocId.trim(), parsedData);
        } else {
          await databaseService.createDocument(selectedCollection, parsedData);
        }
        toast.success('Đã tạo tài liệu');

        // If this was a new collection, add it to the list if not present
        if (!collections.includes(selectedCollection)) {
          setCollections([...collections, selectedCollection]);
        }

        setIsCreatingDoc(false);
        setNewDocId('');
      } else {
        // Update
        if (!selectedDocumentId) return;
        await databaseService.updateDocument(selectedCollection, selectedDocumentId, parsedData);
        toast.success('Đã cập nhật tài liệu');
      }

      // Refresh documents
      await fetchDocuments(selectedCollection);

      if (!isCreatingDoc) {
        // If updating, keep selection
      } else {
        // If created, reset selection
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
      await databaseService.deleteDocument(selectedCollection, selectedDocumentId);
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

  // --- Render Helpers ---

  return (
    <div className="space-y-4 h-[calc(100vh-200px)] flex flex-col">
      {/* Header & Simulation Toggle */}
      <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-800 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Data Playground</h2>
          <p className="text-gray-400 text-sm">Quản lý dữ liệu của bạn theo thời gian thực</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Simulation Toggle */}
          <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
            <span className="text-sm text-gray-300">Mô phỏng người dùng</span>
            <button
              onClick={() => setSimulateUser(!simulateUser)}
              className="text-xl text-gray-400 hover:text-white transition-colors focus:outline-none"
            >
              {simulateUser ? <FiToggleRight className="text-blue-500" /> : <FiToggleLeft />}
            </button>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <ServiceUsageCard
        title="WaterDB Storage"
        icon={FiDatabase}
        usage={waterdbUsage}
        loading={usageLoading}
        compact={true}
      />

      {/* Simulation Token Input (Conditional) */}
      {simulateUser && (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shrink-0 animate-fade-in">
          <Input
            label="Token người dùng cuối (Bearer)"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            placeholder="Nhập JWT token để mô phỏng quy tắc người dùng cụ thể..."
            className="mb-0"
          />
        </div>
      )}

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

          {/* New Collection Input */}
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

export default DataPlaygroundTab;
