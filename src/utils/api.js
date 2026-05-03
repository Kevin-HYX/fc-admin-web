export const getConfig = () => ({
    apiUrl: localStorage.getItem('fc_core_api_url') || 'http://127.0.0.1:8000',
    masterKey: localStorage.getItem('fc_master_key') || ''
});

export const setConfig = (apiUrl, masterKey) => {
    localStorage.setItem('fc_core_api_url', apiUrl);
    localStorage.setItem('fc_master_key', masterKey);
};

export const fetchApi = async (path, options = {}) => {
    const { apiUrl, masterKey } = getConfig();
    if (!masterKey) throw new Error('Master Key is missing');
    
    const url = `${apiUrl.replace(/\/$/, '')}${path}`;
    const headers = {
        'x-master-key': masterKey,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message || 'API Error');
    return data.body;
};
