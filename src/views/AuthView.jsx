import React, { useState, useMemo } from 'react';
import { fetchApi } from '../utils/api';
import { useToast } from '../components/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

// Scopes fetched from API
export default function AuthView() {
    const showToast = useToast();
    const queryClient = useQueryClient();

    const [showActiveOnly, setShowActiveOnly] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [revokeConfirmTokenId, setRevokeConfirmTokenId] = useState(null);
    const [newToken, setNewToken] = useState('');
    const [newWorkspace, setNewWorkspace] = useState('');
    
    // New Token form state
    const [formData, setFormData] = useState({ name: '', workspace: '', expires: 30 });
    const [selectedScopes, setSelectedScopes] = useState(['*']);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['tokens'],
        queryFn: () => fetchApi('/admin/tokens'),
    });

    const { data: scopesData } = useQuery({
        queryKey: ['scopes'],
        queryFn: () => fetchApi('/admin/scopes'),
    });

    const { data: workspacesData, isLoading: isWorkspacesLoading } = useQuery({
        queryKey: ['workspaces'],
        queryFn: () => fetchApi('/admin/workspaces'),
    });

    const availableScopes = scopesData?.scopes || [];
    const workspaces = workspacesData?.workspaces || [];

    const createMutation = useMutation({
        mutationFn: (payload) => fetchApi('/admin/tokens', { method: 'POST', body: JSON.stringify(payload) }),
        onSuccess: (res) => {
            setNewToken(res.token);
            setShowNewModal(false);
            setShowResultModal(true);
            setFormData({ name: '', workspace: '', expires: 30 });
            setSelectedScopes(['*']);
            showToast('success', 'Token 生成成功');
            queryClient.invalidateQueries({ queryKey: ['tokens'] });
        },
        onError: (err) => {
            showToast('error', err.message);
        }
    });

    const revokeMutation = useMutation({
        mutationFn: (tokenId) => fetchApi(`/admin/tokens/${tokenId}`, { method: 'DELETE' }),
        onSuccess: () => {
            showToast('success', '已成功吊销');
            setRevokeConfirmTokenId(null);
            queryClient.invalidateQueries({ queryKey: ['tokens'] });
        },
        onError: (err) => {
            showToast('error', '吊销失败: ' + err.message);
            setRevokeConfirmTokenId(null);
        }
    });

    const createWorkspaceMutation = useMutation({
        mutationFn: (workspace) => fetchApi('/admin/workspaces', {
            method: 'POST',
            body: JSON.stringify({ workspace })
        }),
        onSuccess: (res) => {
            setNewWorkspace('');
            setFormData(prev => ({...prev, workspace: res.workspace}));
            showToast('success', 'Workspace 创建成功');
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        },
        onError: (err) => {
            showToast('error', err.message);
        }
    });

    const deleteWorkspaceMutation = useMutation({
        mutationFn: (workspace) => fetchApi(`/admin/workspaces/${workspace}`, { method: 'DELETE' }),
        onSuccess: () => {
            showToast('success', 'Workspace 已删除');
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            queryClient.invalidateQueries({ queryKey: ['tokens'] });
        },
        onError: (err) => {
            showToast('error', err.message);
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (selectedScopes.length === 0) {
            showToast('error', '请至少选择一个权限范围');
            return;
        }
        if (!formData.workspace) {
            showToast('error', '请选择 Workspace');
            return;
        }
        if (!workspaces.some(item => item.workspace === formData.workspace)) {
            showToast('error', '请选择已存在的 Workspace，或先创建 Workspace');
            return;
        }
        createMutation.mutate({
            name: formData.name,
            workspace: formData.workspace,
            scopes: selectedScopes,
            expires_in: parseInt(formData.expires) * 86400
        });
    };

    const handleCreateWorkspace = (e) => {
        e.preventDefault();
        createWorkspaceMutation.mutate(newWorkspace);
    };

    const handleDeleteWorkspace = (workspace) => {
        if (!window.confirm(`确定删除 Workspace「${workspace}」吗？该操作会删除 ${workspace}/ 下所有业务对象，且不可恢复。`)) {
            return;
        }
        deleteWorkspaceMutation.mutate(workspace);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(newToken);
        showToast('success', '已复制到剪贴板');
    };

    const toggleScope = (scopeId) => {
        let newScopes = [...selectedScopes];

        if (newScopes.includes(scopeId)) {
            // Toggling OFF
            newScopes = newScopes.filter(s => s !== scopeId);
            if (scopeId === '*') {
                newScopes = [];
            } else if (scopeId.endsWith(':*')) {
                const prefix = scopeId.split(':')[0];
                newScopes = newScopes.filter(s => !s.startsWith(prefix + ':'));
            }
        } else {
            // Toggling ON
            if (scopeId === '*') {
                newScopes = ['*'];
            } else {
                newScopes = newScopes.filter(s => s !== '*');
                if (scopeId.endsWith(':*')) {
                    const prefix = scopeId.split(':')[0];
                    newScopes = newScopes.filter(s => !s.startsWith(prefix + ':'));
                }
                newScopes.push(scopeId);
            }
        }
        setSelectedScopes(newScopes);
    };

    const tokens = data?.tokens || [];
    
    const filteredTokens = useMemo(() => {
        if (!showActiveOnly) return tokens;
        return tokens.filter(t => {
            const expDate = new Date(t.expires_at);
            const isExpired = expDate < new Date();
            return t.status === 'active' && !isExpired;
        });
    }, [tokens, showActiveOnly]);

    const columns = useMemo(() => [
        {
            header: '用途名称',
            accessorKey: 'name',
            cell: info => <strong>{info.getValue()}</strong>
        },
        {
            header: 'Token ID',
            accessorKey: 'token_id',
            cell: info => <span style={{fontFamily:'monospace', color:'#94a3b8'}}>{info.getValue().split('-')[1] || info.getValue()}...</span>
        },
        {
            header: 'Workspace',
            accessorKey: 'workspace',
            cell: info => <span className="badge scope">{info.getValue() || '-'}</span>
        },
        {
            header: '权限范围',
            accessorKey: 'scopes',
            cell: info => {
                let scopes = info.getValue() || [];
                // 仅为了展示时更精简：覆盖大类时隐藏小类
                if (scopes.includes('*')) {
                    scopes = ['*'];
                } else {
                    const parentPrefixes = scopes.filter(s => s.endsWith(':*')).map(s => s.split(':')[0]);
                    scopes = scopes.filter(s => {
                        if (s.endsWith(':*')) return true;
                        const parts = s.split(':');
                        if (parts.length > 1 && parentPrefixes.includes(parts[0])) {
                            return false; // hide child
                        }
                        return true;
                    });
                }
                
                return scopes.map(s => {
                    const scopeDef = availableScopes.find(def => def.id === s);
                    return (
                        <span key={s} className="badge scope" title={scopeDef ? scopeDef.name : '未知权限'}>
                            {scopeDef ? scopeDef.name : s}
                        </span>
                    );
                });
            }
        },
        {
            header: '状态',
            id: 'status',
            cell: ({ row }) => {
                const t = row.original;
                const expDate = new Date(t.expires_at);
                const isExpired = t.status === 'active' && expDate < new Date();
                const statusClass = isExpired ? 'revoked' : (t.status === 'active' ? 'active' : 'revoked');
                const statusText = isExpired ? '已过期' : (t.status === 'active' ? '生效中' : '已吊销');
                return <span className={`badge ${statusClass}`}>{statusText}</span>;
            }
        },
        {
            header: '过期时间',
            accessorKey: 'expires_at',
            cell: info => <span style={{fontSize:'13px', color:'#94a3b8'}}>{new Date(info.getValue()).toLocaleString()}</span>
        },
        {
            header: '操作',
            id: 'actions',
            cell: ({ row }) => {
                const t = row.original;
                const expDate = new Date(t.expires_at);
                const isExpired = t.status === 'active' && expDate < new Date();
                if (t.status === 'active' && !isExpired) {
                    return (
                        <button className="btn danger-btn" onClick={() => setRevokeConfirmTokenId(t.token_id)}>
                            <i className="fa-solid fa-ban"></i> 吊销
                        </button>
                    );
                }
                return null;
            }
        }
    ], [availableScopes]);

    const table = useReactTable({
        data: filteredTokens,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <section className="view-section">
            <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn primary-btn" onClick={() => setShowNewModal(true)}>
                        <i className="fa-solid fa-plus"></i> 生成新 Token
                    </button>
                    <button className="btn secondary-btn" onClick={() => queryClient.invalidateQueries({ queryKey: ['tokens'] })} disabled={isLoading || createMutation.isPending || revokeMutation.isPending}>
                        <i className={`fa-solid fa-rotate-right ${isLoading ? 'fa-spin' : ''}`}></i> 刷新
                    </button>
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <input 
                            type="checkbox" 
                            checked={showActiveOnly} 
                            onChange={(e) => setShowActiveOnly(e.target.checked)} 
                            style={{ cursor: 'pointer', width: 'auto', margin: 0 }}
                        />
                        只显示生效中的密钥
                    </label>
                </div>
            </div>

            {isError && (
                <div className="alert warning-alert" style={{ marginBottom: '20px' }}>
                    <i className="fa-solid fa-circle-exclamation"></i> 加载失败: {error?.message}
                </div>
            )}

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="modal-header" style={{ padding: 0, marginBottom: '16px' }}>
                    <h3>Workspace 管理</h3>
                    <button className="btn secondary-btn" onClick={() => queryClient.invalidateQueries({ queryKey: ['workspaces'] })} disabled={isWorkspacesLoading}>
                        <i className={`fa-solid fa-rotate-right ${isWorkspacesLoading ? 'fa-spin' : ''}`}></i> 刷新
                    </button>
                </div>
                <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <input
                        type="text"
                        value={newWorkspace}
                        onChange={e => setNewWorkspace(e.target.value)}
                        placeholder="例如 brand_a"
                        required
                        pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
                        title="1-64 位，仅允许字母、数字、下划线或短横线"
                    />
                    <button className="btn primary-btn" type="submit" disabled={createWorkspaceMutation.isPending}>
                        {createWorkspaceMutation.isPending ? <><i className="fa-solid fa-spinner fa-spin"></i> 创建中...</> : <><i className="fa-solid fa-folder-plus"></i> 新增</>}
                    </button>
                </form>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {workspaces.length === 0 ? (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>暂无 Workspace，请先创建后再签发 Token。</span>
                    ) : workspaces.map(item => (
                        <span key={item.workspace} className="badge scope" title={item.prefix} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-folder"></i>
                            {item.workspace}
                            <span style={{ color: '#94a3b8' }}>{item.object_count || 0}</span>
                            <button
                                type="button"
                                className="close-btn"
                                style={{ fontSize: '12px', width: '20px', height: '20px' }}
                                onClick={() => handleDeleteWorkspace(item.workspace)}
                                disabled={deleteWorkspaceMutation.isPending}
                                title="删除 Workspace"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            <div className="card table-card">
                <table className="data-table">
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={columns.length} style={{textAlign:'center', padding: '32px'}}><i className="fa-solid fa-spinner fa-spin"></i> 加载中...</td></tr>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <tr><td colSpan={columns.length} style={{textAlign:'center', padding: '32px', color:'#94a3b8'}}>暂无数据</td></tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Revoke Confirm Modal */}
            {revokeConfirmTokenId && (
            <div className="modal-overlay">
                <div className="modal card" style={{ maxWidth: '400px' }}>
                    <div className="modal-header">
                        <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> 吊销确认
                        </h3>
                        <button className="close-btn" type="button" onClick={() => setRevokeConfirmTokenId(null)}><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="modal-body">
                        <p style={{ marginBottom: '24px', lineHeight: '1.6' }}>确定要吊销此 Token 吗？此操作将立即生效，所有使用该 Token 的请求将被拒绝，且不可恢复。</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn secondary-btn" onClick={() => setRevokeConfirmTokenId(null)} disabled={revokeMutation.isPending}>取消</button>
                            <button className="btn danger-btn" onClick={() => revokeMutation.mutate(revokeConfirmTokenId)} disabled={revokeMutation.isPending}>
                                {revokeMutation.isPending ? <><i className="fa-solid fa-spinner fa-spin"></i> 吊销中...</> : '确认吊销'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* New Token Modal */}
            {showNewModal && (
            <div className="modal-overlay">
                <div className="modal card">
                    <div className="modal-header">
                        <h3>生成新 Token</h3>
                        <button className="close-btn" type="button" onClick={() => setShowNewModal(false)}><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>用途名称 (如：前端服务)</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>

                            <div className="form-group">
                                <label>Workspace</label>
                                <select
                                    value={formData.workspace}
                                    onChange={e => setFormData({...formData, workspace: e.target.value})}
                                    required
                                >
                                    <option value="" disabled>请选择 Workspace</option>
                                    {workspaces.map(item => (
                                        <option key={item.workspace} value={item.workspace}>{item.workspace}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label style={{ marginBottom: '12px' }}>权限范围</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    {availableScopes.map(scope => {
                                        const isParent = scope.id === '*' || scope.id.endsWith(':*') || scope.id === 'proxy:admin';
                                        
                                        // 检查是否被父级权限覆盖（覆盖则默认勾选且禁用）
                                        const isCoveredByParent = () => {
                                            if (scope.id === '*') return false;
                                            if (selectedScopes.includes('*')) return true;
                                            
                                            const parts = scope.id.split(':');
                                            if (parts.length > 1 && parts[1] !== '*') {
                                                const parentId = `${parts[0]}:*`;
                                                if (selectedScopes.includes(parentId)) return true;
                                            }
                                            return false;
                                        };
                                        
                                        const covered = isCoveredByParent();
                                        const checked = covered || selectedScopes.includes(scope.id);

                                        return (
                                            <label key={scope.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: covered ? 'not-allowed' : 'pointer', marginLeft: isParent ? '0px' : '24px', opacity: covered ? 0.7 : 1 }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={checked}
                                                    disabled={covered}
                                                    onChange={() => toggleScope(scope.id)}
                                                    style={{ width: 'auto', cursor: covered ? 'not-allowed' : 'pointer' }}
                                                />
                                                <span style={{ color: checked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                    {scope.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>有效期 (天) - 默认 30 天</label>
                                <input type="number" value={formData.expires} onChange={e => setFormData({...formData, expires: e.target.value})} required min="1" />
                            </div>
                            <button type="submit" className="btn primary-btn full-width" disabled={createMutation.isPending}>
                                {createMutation.isPending ? <><i className="fa-solid fa-spinner fa-spin"></i> 生成中...</> : '生成'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            )}

            {/* Token Result Modal */}
            {showResultModal && (
            <div className="modal-overlay">
                <div className="modal card">
                    <div className="modal-header">
                        <h3 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-circle-check"></i> 生成成功
                        </h3>
                        <button className="close-btn" type="button" onClick={() => setShowResultModal(false)}><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert warning-alert">
                            <i className="fa-solid fa-triangle-exclamation"></i> 
                            请立即复制并妥善保管此 Token，关闭弹窗后将无法再次查看！
                        </div>
                        <div className="form-group">
                            <label>JWT Token</label>
                            <textarea readOnly rows="5" value={newToken} style={{ resize: 'none' }} />
                        </div>
                        <button className="btn primary-btn full-width" onClick={handleCopy}>
                            <i className="fa-solid fa-copy"></i> 复制 Token
                        </button>
                    </div>
                </div>
            </div>
            )}
        </section>
    );
}
