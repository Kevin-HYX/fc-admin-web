import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useToast } from '../components/Toast';

export default function AuthView() {
    const [tokens, setTokens] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [newToken, setNewToken] = useState('');
    const [formData, setFormData] = useState({ name: '', scopes: '*', expires: 2592000 });
    const [isGenerating, setIsGenerating] = useState(false);
    const showToast = useToast();

    const loadTokens = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi('/admin/tokens');
            setTokens(data.tokens || []);
        } catch (err) {
            showToast('error', '加载失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTokens();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            const payload = {
                name: formData.name,
                scopes: formData.scopes.split(',').map(s => s.trim()).filter(s => s),
                expires_in: parseInt(formData.expires)
            };
            const res = await fetchApi('/admin/tokens', { method: 'POST', body: JSON.stringify(payload) });
            setNewToken(res.token);
            setShowNewModal(false);
            setShowResultModal(true);
            setFormData({ name: '', scopes: '*', expires: 2592000 });
            loadTokens();
            showToast('success', 'Token 生成成功');
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevoke = async (tokenId) => {
        if (!window.confirm('确定要吊销此 Token 吗？此操作立即生效且不可恢复。')) return;
        try {
            await fetchApi(`/admin/tokens/${tokenId}`, { method: 'DELETE' });
            showToast('success', '已成功吊销');
            loadTokens();
        } catch (err) {
            showToast('error', '吊销失败: ' + err.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(newToken);
        showToast('success', '已复制到剪贴板');
    };

    return (
        <section className="view-section">
            <div className="action-bar">
                <button className="btn primary-btn" onClick={() => setShowNewModal(true)}><i className="fa-solid fa-plus"></i> 生成新 Token</button>
                <button className="btn secondary-btn" onClick={loadTokens}><i className="fa-solid fa-rotate-right"></i> 刷新</button>
            </div>
            <div className="card table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>用途名称</th>
                            <th>Token ID</th>
                            <th>权限 (Scopes)</th>
                            <th>状态</th>
                            <th>过期时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{textAlign:'center'}}><i className="fa-solid fa-spinner fa-spin"></i> 加载中...</td></tr>
                        ) : tokens.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign:'center', color:'#94a3b8'}}>暂无数据</td></tr>
                        ) : (
                            tokens.map(t => {
                                const expDate = new Date(t.expires_at);
                                const isExpired = t.status === 'active' && expDate < new Date();
                                const statusClass = isExpired ? 'revoked' : (t.status === 'active' ? 'active' : 'revoked');
                                const statusText = isExpired ? '已过期' : (t.status === 'active' ? '生效中' : '已吊销');
                                
                                return (
                                    <tr key={t.token_id}>
                                        <td><strong>{t.name}</strong></td>
                                        <td style={{fontFamily:'monospace', color:'#94a3b8'}}>{t.token_id.split('-')[1] || t.token_id}...</td>
                                        <td>{t.scopes.map(s => <span key={s} className="badge scope">{s}</span>)}</td>
                                        <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                                        <td style={{fontSize:'13px', color:'#94a3b8'}}>{expDate.toLocaleString()}</td>
                                        <td>
                                            {(t.status === 'active' && !isExpired) && (
                                                <button className="btn danger-btn" onClick={() => handleRevoke(t.token_id)}>
                                                    <i className="fa-solid fa-ban"></i> 吊销
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

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
                                <label>权限范围 (逗号分隔，如 tts,avatar 或 * 表示全部)</label>
                                <input type="text" value={formData.scopes} onChange={e => setFormData({...formData, scopes: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>有效期 (秒)</label>
                                <input type="number" value={formData.expires} onChange={e => setFormData({...formData, expires: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn primary-btn full-width" disabled={isGenerating}>
                                {isGenerating ? <><i className="fa-solid fa-spinner fa-spin"></i> 生成中...</> : '生成'}
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
                        <h3>Token 生成成功</h3>
                        <button className="close-btn" type="button" onClick={() => setShowResultModal(false)}><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="modal-body">
                        <div className="alert warning-alert">
                            <i className="fa-solid fa-triangle-exclamation"></i> 
                            请立即复制并妥善保管此 Token，关闭弹窗后将无法再次查看！
                        </div>
                        <div className="form-group">
                            <label>JWT Token</label>
                            <textarea readOnly rows="5" value={newToken} />
                        </div>
                        <button className="btn primary-btn full-width" onClick={handleCopy}>复制 Token</button>
                    </div>
                </div>
            </div>
            )}
        </section>
    );
}
