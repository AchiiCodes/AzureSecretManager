const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('azureSecrets', {
  version: process.env.npm_package_version || '0.1.0',
  getAccount: () => ipcRenderer.invoke('azure:get-account'),
  login: () => ipcRenderer.invoke('azure:login'),
  logout: () => ipcRenderer.invoke('azure:logout'),
  listVaults: () => ipcRenderer.invoke('vault:list-vaults'),
  listSecrets: (payload) => ipcRenderer.invoke('vault:list-secrets', payload),
  listSecretVersions: (payload) => ipcRenderer.invoke('vault:list-secret-versions', payload),
  getSecretValue: (payload) => ipcRenderer.invoke('vault:get-secret-value', payload),
  saveSecret: (payload) => ipcRenderer.invoke('vault:save-secret', payload),
  migrateSecret: (payload) => ipcRenderer.invoke('vault:migrate-secret', payload),
  deleteSecret: (payload) => ipcRenderer.invoke('vault:delete-secret', payload),
  openUrl: (url) => ipcRenderer.invoke('shell:open-url', url),
  copyText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('app:update-downloaded', (_event, info) => callback(info));
  },
  installUpdate: () => ipcRenderer.invoke('app:install-update')
});
