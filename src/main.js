const { app, BrowserWindow, clipboard, ipcMain, nativeImage, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');
const { KeyVaultManagementClient } = require('@azure/arm-keyvault');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const execFileAsync = promisify(execFile);
const appName = 'Azure Secret Manager';
const appIconPath = path.join(__dirname, 'assets', 'retro-key.png');
const keyVaultTimeoutMs = 15_000;

app.setName(appName);

let mainWindow;
let activeVaultUrl = '';
let activeClient = null;
let activeCredential = null;

function createWindow() {
  const appIcon = nativeImage.createFromPath(appIconPath);
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: appName,
    icon: appIcon,
    backgroundColor: '#101418',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      shell.openExternal(validateExternalUrl(url));
    } catch {
      // Block non-Azure external URLs from renderer-created windows.
    }
    return { action: 'deny' };
  });
}

function normalizeVaultUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('Vault URL is required.');
  }

  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.protocol !== 'https:') {
    throw new Error('Vault URL must use HTTPS.');
  }
  if (!url.hostname.endsWith('.vault.azure.net')) {
    throw new Error('Vault URL must be an Azure Key Vault URL ending in .vault.azure.net.');
  }

  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function validateExternalUrl(input) {
  const url = new URL(String(input || '').trim());
  const isVaultUrl = url.protocol === 'https:' && url.hostname.endsWith('.vault.azure.net');
  const isPortalUrl = url.protocol === 'https:' && url.hostname === 'portal.azure.com';
  if (!isVaultUrl && !isPortalUrl) {
    throw new Error('Only Azure Portal and Key Vault URLs can be opened.');
  }
  return url.toString();
}

function getCredential() {
  if (!activeCredential) {
    activeCredential = new DefaultAzureCredential();
  }
  return activeCredential;
}

function resetAzureClients() {
  activeCredential = null;
  activeClient = null;
  activeVaultUrl = '';
}

function getClient(vaultUrl) {
  const normalizedVaultUrl = normalizeVaultUrl(vaultUrl);
  if (activeClient && activeVaultUrl === normalizedVaultUrl) {
    return activeClient;
  }

  activeVaultUrl = normalizedVaultUrl;
  activeClient = new SecretClient(normalizedVaultUrl, getCredential());
  return activeClient;
}

async function withKeyVaultTimeout(operation, run) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), keyVaultTimeoutMs);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw new Error(`${operation} timed out after ${keyVaultTimeoutMs / 1000} seconds. Check Key Vault network access, firewall rules, or private endpoint connectivity.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchManagementJson(url) {
  const token = await getCredential().getToken('https://management.azure.com/.default');
  if (!token?.token) {
    throw new Error('Could not acquire Azure management token.');
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token.token}`,
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Azure management request failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

async function listSubscriptions() {
  const subscriptions = [];
  let nextUrl = 'https://management.azure.com/subscriptions?api-version=2020-01-01';

  while (nextUrl) {
    const page = await fetchManagementJson(nextUrl);
    subscriptions.push(...(page.value || []));
    nextUrl = page.nextLink || '';
  }

  return subscriptions
    .filter((subscription) => subscription.subscriptionId)
    .map((subscription) => ({
      subscriptionId: subscription.subscriptionId,
      displayName: subscription.displayName || subscription.subscriptionId,
      state: subscription.state || ''
    }));
}

function resourceGroupFromId(id = '') {
  const match = id.match(/\/resourceGroups\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function toVaultSummary(vault, subscription) {
  return {
    name: vault.name || '',
    vaultUrl: normalizeVaultUrl(vault.properties?.vaultUri || ''),
    location: vault.location || '',
    resourceGroup: resourceGroupFromId(vault.id),
    subscriptionId: subscription.subscriptionId,
    subscriptionName: subscription.displayName,
    tags: vault.tags || {},
    id: vault.id || ''
  };
}

async function listKeyVaults() {
  const subscriptions = await listSubscriptions();
  const vaults = [];
  const warnings = [];

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      const client = new KeyVaultManagementClient(getCredential(), subscription.subscriptionId);
      for await (const vault of client.vaults.listBySubscription()) {
        if (!vault.properties?.vaultUri) continue;
        vaults.push(toVaultSummary(vault, subscription));
      }
    } catch (error) {
      warnings.push({
        subscriptionId: subscription.subscriptionId,
        subscriptionName: subscription.displayName,
        message: error.message || 'Failed to list Key Vaults for subscription.'
      });
    }
  }));

  vaults.sort((left, right) => {
    return left.name.localeCompare(right.name) || left.subscriptionName.localeCompare(right.subscriptionName);
  });

  return { vaults, warnings };
}

async function runAz(args) {
  try {
    const { stdout } = await execFileAsync('az', args, { maxBuffer: 10 * 1024 * 1024, timeout: 60_000 });
    return stdout.trim() ? JSON.parse(stdout) : null;
  } catch (error) {
    const details = error.stderr || error.stdout || error.message;
    throw new Error(`Azure CLI failed: ${details}`);
  }
}

async function getAzureAccount() {
  const activeAccount = await runAz(['account', 'show', '--output', 'json']).catch(() => null);

  return {
    active: activeAccount ? {
      userName: activeAccount.user?.name || '',
      userType: activeAccount.user?.type || '',
      tenantId: activeAccount.tenantId || '',
      subscriptionId: activeAccount.id || '',
      subscriptionName: activeAccount.name || '',
      environmentName: activeAccount.environmentName || ''
    } : null
  };
}

async function loginAzure() {
  await runAz(['login', '--output', 'json']);
  resetAzureClients();
  return getAzureAccount();
}

async function logoutAzure() {
  await runAz(['logout', '--output', 'json']);
  resetAzureClients();
  return getAzureAccount();
}

function toSecretSummary(secretProperties) {
  return {
    name: secretProperties.name,
    version: secretProperties.version || versionFromId(secretProperties.id),
    enabled: secretProperties.enabled !== false,
    contentType: secretProperties.contentType || '',
    createdOn: secretProperties.createdOn ? secretProperties.createdOn.toISOString() : '',
    updatedOn: secretProperties.updatedOn ? secretProperties.updatedOn.toISOString() : '',
    expiresOn: secretProperties.expiresOn ? secretProperties.expiresOn.toISOString() : '',
    notBefore: secretProperties.notBefore ? secretProperties.notBefore.toISOString() : '',
    tags: secretProperties.tags || {},
    id: secretProperties.id || '',
    vaultUrl: activeVaultUrl
  };
}

function versionFromId(id = '') {
  const match = String(id).match(/\/secrets\/[^/]+\/([^/]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function matchesSearch(secret, query) {
  if (!query) return true;
  const haystack = [
    secret.name,
    secret.contentType,
    ...Object.entries(secret.tags || {}).flatMap(([key, value]) => [key, value])
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

async function listSecrets({ vaultUrl, query = '', includeDisabled = true }) {
  return withKeyVaultTimeout('Loading secrets from Key Vault', async (abortSignal) => {
    const client = getClient(vaultUrl);
    const secrets = [];

    for await (const properties of client.listPropertiesOfSecrets({ abortSignal })) {
      const summary = toSecretSummary(properties);
      if (!includeDisabled && !summary.enabled) continue;
      if (!matchesSearch(summary, query)) continue;
      secrets.push(summary);
    }

    secrets.sort((left, right) => {
      const leftTime = left.updatedOn || left.createdOn || '';
      const rightTime = right.updatedOn || right.createdOn || '';
      return rightTime.localeCompare(leftTime) || left.name.localeCompare(right.name);
    });

    return secrets;
  });
}

async function listSecretVersions({ vaultUrl, name }) {
  validateSecretName(name);

  return withKeyVaultTimeout('Loading secret versions from Key Vault', async (abortSignal) => {
    const client = getClient(vaultUrl);
    const versions = [];
    for await (const properties of client.listPropertiesOfSecretVersions(name, { abortSignal })) {
      versions.push(toSecretSummary(properties));
    }

    versions.sort((left, right) => {
      const leftTime = left.updatedOn || left.createdOn || '';
      const rightTime = right.updatedOn || right.createdOn || '';
      return rightTime.localeCompare(leftTime) || right.version.localeCompare(left.version);
    });

    return versions;
  });
}

async function getSecretValue({ vaultUrl, name, version = '' }) {
  if (!name || typeof name !== 'string') {
    throw new Error('Secret name is required.');
  }

  return withKeyVaultTimeout('Reading secret from Key Vault', async (abortSignal) => {
    const client = getClient(vaultUrl);
    const secret = version ? await client.getSecret(name, { version, abortSignal }) : await client.getSecret(name, { abortSignal });
    return {
      name: secret.name,
      value: secret.value || '',
      properties: toSecretSummary(secret.properties)
    };
  });
}

function validateSecretName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Secret name is required.');
  }
  if (!/^[0-9A-Za-z-]{1,127}$/.test(name)) {
    throw new Error('Secret name must be 1-127 characters and only contain letters, numbers, and hyphens.');
  }
}

function parseOptionalDate(value, label) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

async function saveSecret({ vaultUrl, name, value, contentType = '', tags = {}, expiresOn = '' }) {
  validateSecretName(name);
  if (typeof value !== 'string') {
    throw new Error('Secret value is required.');
  }
  if (tags && (typeof tags !== 'object' || Array.isArray(tags))) {
    throw new Error('Tags must be an object.');
  }

  return withKeyVaultTimeout('Saving secret to Key Vault', async (abortSignal) => {
    const client = getClient(vaultUrl);
    const secret = await client.setSecret(name, value, {
      abortSignal,
      contentType: contentType || undefined,
      expiresOn: parseOptionalDate(expiresOn, 'Expiration date'),
      tags: tags || undefined
    });

    return {
      name: secret.name,
      properties: toSecretSummary(secret.properties)
    };
  });
}

function isSecretNotFound(error) {
  return error?.statusCode === 404 || error?.code === 'SecretNotFound' || error?.code === 'ResourceNotFound';
}

async function secretExists(client, name, abortSignal) {
  try {
    await client.getSecret(name, { abortSignal });
    return true;
  } catch (error) {
    if (isSecretNotFound(error)) return false;
    throw error;
  }
}

async function migrateSecret({ sourceVaultUrl, destinationVaultUrl, sourceName, destinationName, value, version = '', expiresOn = '' }) {
  validateSecretName(sourceName);
  validateSecretName(destinationName);
  const normalizedSourceVaultUrl = normalizeVaultUrl(sourceVaultUrl);
  const normalizedDestinationVaultUrl = normalizeVaultUrl(destinationVaultUrl);
  if (normalizedSourceVaultUrl === normalizedDestinationVaultUrl && sourceName === destinationName) {
    throw new Error('Recreating in the same Key Vault requires a new secret name.');
  }
  if (value !== undefined && typeof value !== 'string') {
    throw new Error('Secret value override must be a string.');
  }

  return withKeyVaultTimeout('Recreating secret in Key Vault', async (abortSignal) => {
    const sourceClient = getClient(normalizedSourceVaultUrl);
    const sourceSecret = version
      ? await sourceClient.getSecret(sourceName, { version, abortSignal })
      : await sourceClient.getSecret(sourceName, { abortSignal });
    const destinationClient = getClient(normalizedDestinationVaultUrl);
    if (await secretExists(destinationClient, destinationName, abortSignal)) {
      throw new Error(`Secret ${destinationName} already exists in the destination Key Vault.`);
    }

    const properties = sourceSecret.properties || {};
    const destinationExpiresOn = expiresOn ? parseOptionalDate(expiresOn, 'Expiration date') : properties.expiresOn;
    const migratedSecret = await destinationClient.setSecret(
      destinationName,
      value === undefined ? (sourceSecret.value || '') : value,
      {
        abortSignal,
        contentType: properties.contentType || undefined,
        enabled: properties.enabled,
        expiresOn: destinationExpiresOn,
        notBefore: properties.notBefore,
        tags: properties.tags || undefined
      }
    );

    return {
      name: migratedSecret.name,
      vaultUrl: normalizedDestinationVaultUrl
    };
  });
}

async function deleteSecret({ vaultUrl, name }) {
  validateSecretName(name);
  return withKeyVaultTimeout('Deleting secret from Key Vault', async (abortSignal) => {
    const client = getClient(vaultUrl);
    const poller = await client.beginDeleteSecret(name, { abortSignal });
    const deletedSecret = await poller.pollUntilDone({ abortSignal });

    return {
      name: deletedSecret.name,
      recoveryId: deletedSecret.recoveryId || '',
      deletedOn: deletedSecret.deletedOn ? deletedSecret.deletedOn.toISOString() : '',
      scheduledPurgeDate: deletedSecret.scheduledPurgeDate ? deletedSecret.scheduledPurgeDate.toISOString() : ''
    };
  });
}

ipcMain.handle('vault:list-secrets', async (_event, payload) => listSecrets(payload || {}));
ipcMain.handle('vault:list-vaults', async () => listKeyVaults());
ipcMain.handle('vault:list-secret-versions', async (_event, payload) => listSecretVersions(payload || {}));
ipcMain.handle('vault:get-secret-value', async (_event, payload) => getSecretValue(payload || {}));
ipcMain.handle('vault:save-secret', async (_event, payload) => saveSecret(payload || {}));
ipcMain.handle('vault:migrate-secret', async (_event, payload) => migrateSecret(payload || {}));
ipcMain.handle('vault:delete-secret', async (_event, payload) => deleteSecret(payload || {}));
ipcMain.handle('azure:get-account', async () => getAzureAccount());
ipcMain.handle('azure:login', async () => loginAzure());
ipcMain.handle('azure:logout', async () => logoutAzure());
ipcMain.handle('shell:open-url', async (_event, url) => {
  await shell.openExternal(validateExternalUrl(url));
  return true;
});
ipcMain.handle('clipboard:write-text', async (_event, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});

app.whenReady().then(() => {
  const appIcon = nativeImage.createFromPath(appIconPath);
  app.setName(appName);
  if (app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
