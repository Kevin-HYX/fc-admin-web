import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'auth', icon: 'fa-key', label: '密钥管理' },
        { id: 'proxy', icon: 'fa-network-wired', label: '代理配置' },
        { id: 'settings', icon: 'fa-gear', label: '系统设置' },
    ];

    return (
        <nav className="sidebar">
            <div className="logo">
                <i className="fa-solid fa-cloud-bolt"></i>
                <span>FC Admin</span>
            </div>
            <ul className="nav-links">
                {navItems.map((item) => (
                    <li 
                        key={item.id} 
                        className={activeTab === item.id ? 'active' : ''}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <i className={`fa-solid ${item.icon}`}></i> {item.label}
                    </li>
                ))}
            </ul>
        </nav>
    );
}
