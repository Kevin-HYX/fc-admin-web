import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useToast } from '../components/Toast';

export default function ProxyView() {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewModal, setShowNewModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const showToast = useToast();

    const initialForm = {
        service_id: '', name: '', base_url: '', auth_type: 'header', 
        auth_header: 'Authorization', auth_prefix: 'Bearer ', auth_value: ''
    };
    const [formData, setFormData] = useState(initialForm);

    const loadServices = async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi('/admin/services');
            setServices(data.services || []);
        } catch (err) {
            showToast('error', '加载失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await fetchApi('/admin/services', { method: 'POST', body: JSON.stringify(formData) });
            setShowNewModal(false);
            setFormData(initialForm);
            loadServices();
            showToast('success', '服务配置已保存');
        } catch (err) {
            showToast('error', err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (serviceId) => {
        if (!window.confirm(`确定要删除服务 [${serviceId}] 吗？使用该服务的请求将立刻失败。`)) return;
        try {
            await fetchApi(`/admin/services/${serviceId}`, { method: 'DELETE' });
            showToast('success', '已成功删除');
            loadServices();
        } catch (err) {
            showToast('error', '删除失败: ' + err.message);
        }
    };

    return (
        <section className="view-section">
            <div className="action-bar">
                <button className="btn primary-btn" onClick={() => setShowNewModal(true)}><i className="fa-solid fa-plus"></i> 添加代理服务</button>
                <button className="btn secondary-btn" onClick={loadServices}><i className="fa-solid fa-rotate-right"></i> 刷新</button>
            </div>
            <div className="card table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>服务 ID</th>
                            <th>名称</th>
                            <th>后端地址 (Base URL)</th>
                            <th>鉴权方式</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" style={{textAlign:'center'}}><i className="fa-solid fa-spinner fa-spin"></i> 加载中...</td></tr>
                        ) : services.length === 0 ? (
                            <tr><td colSpan="5" style={{textAlign:'center', color:'#94a3b8'}}>暂无配置的服务</td></tr>
                        ) : (
                            services.map(s => (
                                <tr key={s.service_id}>
                                    <td style={{fontFamily:'monospace', color:'#3b82f6'}}>{s.service_id}</td>
                                    <td><strong>{s.name}</strong></td>
                                    <td style={{fontSize:'13px', color:'#94a3b8'}}>{s.base_url}</td>
                                    <td><span className="badge scope">{s.auth_type}</span></td>
                                    <td>
                                        <button className="btn danger-btn" onClick={() => handleDelete(s.service_id)}>
                                            <i className="fa-solid fa-trash"></i> 删除
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showNewModal && (
            <div className="modal-overlay">
                <div className="modal card">
                    <div className="modal-header">
                        <h3>添加代理服务</h3>
                        <button className="close-btn" type="button" onClick={() => setShowNewModal(false)}><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Service ID (仅限字母数字，如 dashscope)</label>
                                <input type="text" value={formData.service_id} onChange={e => setFormData({...formData, service_id: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>服务名称 (如 阿里云百炼)</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Base URL (后端真实地址前缀)</label>
                                <input type="url" value={formData.base_url} onChange={e => setFormData({...formData, base_url: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>鉴权类型 (header 或 query)</label>
                                <select value={formData.auth_type} onChange={e => setFormData({...formData, auth_type: e.target.value})}>
                                    <option value="header">Header</option>
                                    <option value="query">Query Parameter</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Header 键名 (如 Authorization)</label>
                                <input type="text" value={formData.auth_header} onChange={e => setFormData({...formData, auth_header: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>前缀 (如 Bearer)</label>
                                <input type="text" value={formData.auth_prefix} onChange={e => setFormData({...formData, auth_prefix: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>真实秘钥值 (API Key)</label>
                                <input type="password" value={formData.auth_value} onChange={e => setFormData({...formData, auth_value: e.target.value})} required />
                            </div>
                            <button type="submit" className="btn primary-btn full-width" disabled={isSaving}>
                                {isSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> 保存中...</> : '保存服务'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            )}
        </section>
    );
}
