import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import ruleService from '../../services/rule.service';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

const RuleEngineTab = ({ appId }) => {
  const [rules, setRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);

  // Common actions that can be used
  const commonActions = [
    'create',
    'read',
    'update',
    'delete',
    'list',
    'query',
  ];

  useEffect(() => {
    loadRules();
  }, [appId]);

  const loadRules = async () => {
    // Load rules for common roles
    const roles = ['user', 'admin', 'editor'];
    const rulesData = {};

    for (const role of roles) {
      try {
        const rule = await ruleService.getRule(appId, role);
        if (rule && rule.actions) {
          rulesData[role] = rule.actions;
        }
      } catch (error) {
        // Rule might not exist yet, that's okay
        if (error.response?.status !== 404) {
          console.error(`Error loading rule for ${role}:`, error);
        }
      }
    }

    setRules(rulesData);
    setLoading(false);
  };

  const handleAddRole = () => {
    if (!newRole.trim()) {
      toast.error('Tên vai trò là bắt buộc');
      return;
    }

    if (rules[newRole]) {
      toast.error('Vai trò đã tồn tại');
      return;
    }

    setRules({ ...rules, [newRole]: [] });
    setNewRole('');
    setShowAddRole(false);
  };

  const handleRemoveRole = (role) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${role}"?`)) {
      return;
    }

    const newRules = { ...rules };
    delete newRules[role];
    setRules(newRules);
  };

  const toggleAction = (role, action) => {
    const roleActions = rules[role] || [];
    const newActions = roleActions.includes(action)
      ? roleActions.filter((a) => a !== action)
      : [...roleActions, action];

    setRules({ ...rules, [role]: newActions });
  };

  const handleAddCustomAction = (role, actionName) => {
    if (!actionName.trim()) {
      return;
    }

    const roleActions = rules[role] || [];
    if (!roleActions.includes(actionName)) {
      setRules({ ...rules, [role]: [...roleActions, actionName] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each role's rules
      for (const [role, actions] of Object.entries(rules)) {
        try {
          await ruleService.updateRule({
            appId,
            role,
            actions,
          });
        } catch (error) {
          // If update fails, try create
          if (error.response?.status === 404) {
            await ruleService.createRule({
              appId,
              role,
              actions,
            });
          } else {
            throw error;
          }
        }
      }

      toast.success('Đã lưu quy tắc thành công!');
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể lưu quy tắc';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Đang tải quy tắc...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Kiểm soát truy cập dựa trên vai trò (RBAC)</h2>
          <p className="text-gray-400 text-sm">
            Cấu hình quyền cho các vai trò người dùng khác nhau
          </p>
        </div>
        <div className="flex space-x-2">
          {showAddRole ? (
            <div className="flex items-center space-x-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Tên vai trò"
                className="w-40"
                onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
              />
              <Button size="sm" onClick={handleAddRole}>
                Thêm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddRole(false);
                  setNewRole('');
                }}
              >
                Hủy
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowAddRole(true)}>
                <FiPlus className="inline mr-2" size={16} />
                Thêm vai trò
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <FiSave className="inline mr-2" size={16} />
                {saving ? 'Đang lưu...' : 'Lưu quy tắc'}
              </Button>
            </>
          )}
        </div>
      </div>

      {Object.keys(rules).length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400 mb-4">Chưa có vai trò nào được cấu hình</p>
          <Button onClick={() => setShowAddRole(true)}>Thêm vai trò đầu tiên của bạn</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(rules).map(([role, actions]) => (
            <Card key={role}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white capitalize">{role}</h3>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleRemoveRole(role)}
                >
                  <FiTrash2 size={16} />
                </Button>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-sm text-gray-400">Hành động chung</label>
                <div className="flex flex-wrap gap-2">
                  {commonActions.map((action) => (
                    <label
                      key={action}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={actions.includes(action)}
                        onChange={() => toggleAction(role, action)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300 capitalize">{action}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Hành động tùy chỉnh</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {actions
                    .filter((a) => !commonActions.includes(a))
                    .map((action) => (
                      <span
                        key={action}
                        className="inline-flex items-center px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {action}
                        <button
                          onClick={() => {
                            const newActions = actions.filter((a) => a !== action);
                            setRules({ ...rules, [role]: newActions });
                          }}
                          className="ml-2 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
                <Input
                  placeholder="Thêm hành động tùy chỉnh"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomAction(role, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RuleEngineTab;


