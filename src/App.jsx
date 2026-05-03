import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SettingsView from './views/SettingsView';
import AuthView from './views/AuthView';
import ProxyView from './views/ProxyView';
import { ToastProvider, useToast } from './components/Toast';
import { getConfig, fetchApi } from './utils/api';
import './index.css';

function AppContent() {
    const [activeTab, setActiveTab] = useState('settings');
    const [isConnected, setIsConnected] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        const verifyConnection = async () => {
            const conf = getConfig();
            if (conf.masterKey && conf.apiUrl) {
                try {
                    await fetchApi('/admin/tokens');
                    setIsConnected(true);
                    setActiveTab('auth');
                } catch (e) {
                    setIsConnected(false);
                    setActiveTab('settings');
                    showToast('error', '自动连接失败，请检查配置');
                }
            } else {
                setActiveTab('settings');
            }
        };
        verifyConnection();
    }, []);

    const handleConnected = () => {
        setIsConnected(true);
        setActiveTab('auth');
    };

    const handleTabChange = (tabId) => {
        if (tabId !== 'settings' && !isConnected) {
            showToast('error', '请先配置连接信息并保存');
            return;
        }
        setActiveTab(tabId);
    };

    const titles = {
        'auth': '密钥管理',
        'proxy': '代理配置',
        'settings': '系统设置'
    };

    return (
        <div className="app-container">
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
            <main className="main-content">
                <header className="top-header">
                    <h1>{titles[activeTab]}</h1>
                    <div className="header-status">
                        {isConnected ? (
                            <span className="status-badge connected"><i className="fa-solid fa-check-circle"></i> 已连接</span>
                        ) : (
                            <span className="status-badge disconnected"><i className="fa-solid fa-circle-exclamation"></i> 未连接</span>
                        )}
                    </div>
                </header>

                {activeTab === 'settings' && <SettingsView onConnected={handleConnected} />}
                {activeTab === 'auth' && isConnected && <AuthView />}
                {activeTab === 'proxy' && isConnected && <ProxyView />}
            </main>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
