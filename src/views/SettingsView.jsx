import React, { useState, useEffect } from 'react';
import { getConfig, setConfig, fetchApi } from '../utils/api';
import { useToast } from '../components/Toast';

export default function SettingsView({ onConnected }) {
    const [apiUrl, setApiUrl] = useState('');
    const [masterKey, setMasterKey] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        const conf = getConfig();
        setApiUrl(conf.apiUrl);
        setMasterKey(conf.masterKey);
    }, []);

    const handleConnect = async (e) => {
        e.preventDefault();
        setIsConnecting(true);
        try {
            setConfig(apiUrl, masterKey);
            // Verify connection
            await fetchApi('/admin/tokens');
            showToast('success', '系统连接成功');
            onConnected();
        } catch (err) {
            showToast('error', '连接失败: ' + err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <section className="view-section">
            <div className="card settings-card">
                <h2><i className="fa-solid fa-sliders"></i> 连接配置</h2>
                <p className="subtitle">请输入核心 API 地址与管理员密钥以连接系统</p>
                <form onSubmit={handleConnect}>
                    <div className="form-group">
                        <label>统一 API 地址 (默认 http://127.0.0.1:8000)</label>
                        <input 
                            type="text" 
                            value={apiUrl} 
                            onChange={e => setApiUrl(e.target.value)} 
                            placeholder="http://127.0.0.1:8000" 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Master Key (管理员密钥)</label>
                        <input 
                            type="password" 
                            value={masterKey} 
                            onChange={e => setMasterKey(e.target.value)} 
                            placeholder="输入 Master Key" 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn primary-btn" disabled={isConnecting}>
                        {isConnecting ? <><i className="fa-solid fa-spinner fa-spin"></i> 连接中...</> : <><i className="fa-solid fa-link"></i> 连接并保存</>}
                    </button>
                </form>
            </div>
        </section>
    );
}
