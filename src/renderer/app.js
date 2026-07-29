const themeNames = new Set(['dark', 'light', 'ocean', 'grape', 'ember', 'forest']);
const storedTheme = localStorage.getItem('azureSecretsViewer:theme');

const state = {
  account: null,
  vaults: [],
  vaultWarnings: [],
  allSecrets: [],
  secrets: [],
  secretVersions: [],
  selectedName: '',
  selectedVersion: '',
  selectedVaultUrl: '',
  selectedMigrationVaultUrl: '',
  revealedValue: '',
  emptyListMessage: 'Fetching Key Vaults...',
  vaultMode: localStorage.getItem('azureSecretsViewer:vaultMode') || 'automatic',
  theme: themeNames.has(storedTheme) ? storedTheme : 'dark',
  secretSort: localStorage.getItem('azureSecretsViewer:secretSort') || 'updatedOn',
  secretSortDirection: localStorage.getItem('azureSecretsViewer:secretSortDirection') || 'desc',
  editingSecret: false,
  migratingSecret: false,
  loadingVaults: false,
  loadingVersions: false,
  loading: false
};

const elements = {
  accountUser: document.querySelector('#accountUser'),
  accountMeta: document.querySelector('#accountMeta'),
  profileButton: document.querySelector('#profileButton'),
  profileAvatar: document.querySelector('#profileAvatar'),
  profileAvatarLarge: document.querySelector('#profileAvatarLarge'),
  profileDropdown: document.querySelector('#profileDropdown'),
  profileName: document.querySelector('#profileName'),
  profileEmail: document.querySelector('#profileEmail'),
  profileTenant: document.querySelector('#profileTenant'),
  profileSubscription: document.querySelector('#profileSubscription'),
  themeSwatches: document.querySelector('#themeSwatches'),
  appVersion: document.querySelector('#appVersion'),
  loginAzure: document.querySelector('#loginAzure'),
  refreshAccount: document.querySelector('#refreshAccount'),
  logoutAzure: document.querySelector('#logoutAzure'),
  automaticMode: document.querySelector('#automaticMode'),
  manualMode: document.querySelector('#manualMode'),
  automaticVaultControls: document.querySelector('#automaticVaultControls'),
  manualVaultControls: document.querySelector('#manualVaultControls'),
  vaultComboboxButton: document.querySelector('#vaultComboboxButton'),
  vaultComboboxPanel: document.querySelector('#vaultComboboxPanel'),
  selectedVaultLabel: document.querySelector('#selectedVaultLabel'),
  selectedVaultMeta: document.querySelector('#selectedVaultMeta'),
  vaultSearch: document.querySelector('#vaultSearch'),
  vaultOptions: document.querySelector('#vaultOptions'),
  vaultUrl: document.querySelector('#vaultUrl'),
  search: document.querySelector('#search'),
  secretSort: document.querySelector('#secretSort'),
  secretSortDirection: document.querySelector('#secretSortDirection'),
  includeDisabled: document.querySelector('#includeDisabled'),
  refreshVaults: document.querySelector('#refreshVaults'),
  loadSecrets: document.querySelector('#loadSecrets'),
  status: document.querySelector('#status'),
  count: document.querySelector('#count'),
  secretList: document.querySelector('#secretList'),
  emptyDetails: document.querySelector('#emptyDetails'),
  emptyDetailsMessage: document.querySelector('#emptyDetailsMessage'),
  secretDetails: document.querySelector('#secretDetails'),
  secretName: document.querySelector('#secretName'),
  copySecretName: document.querySelector('#copySecretName'),
  secretState: document.querySelector('#secretState'),
  migrateSecret: document.querySelector('#migrateSecret'),
  openSecret: document.querySelector('#openSecret'),
  versionPanel: document.querySelector('#versionPanel'),
  secretVersion: document.querySelector('#secretVersion'),
  versionCount: document.querySelector('#versionCount'),
  revealSecret: document.querySelector('#revealSecret'),
  hideSecret: document.querySelector('#hideSecret'),
  copySecret: document.querySelector('#copySecret'),
  deleteSecret: document.querySelector('#deleteSecret'),
  secretValue: document.querySelector('#secretValue'),
  valueState: document.querySelector('#valueState'),
  metadata: document.querySelector('#metadata'),
  tags: document.querySelector('#tags'),
  newSecretEmpty: document.querySelector('#newSecretEmpty'),
  newSecret: document.querySelector('#newSecret'),
  editSecret: document.querySelector('#editSecret'),
  migrateForm: document.querySelector('#migrateForm'),
  migrateFormTitle: document.querySelector('#migrateFormTitle'),
  cancelMigrateForm: document.querySelector('#cancelMigrateForm'),
  migrateVaultCombobox: document.querySelector('#migrateVaultCombobox'),
  migrateVaultButton: document.querySelector('#migrateVaultButton'),
  selectedMigrateVaultLabel: document.querySelector('#selectedMigrateVaultLabel'),
  selectedMigrateVaultMeta: document.querySelector('#selectedMigrateVaultMeta'),
  migrateVaultPanel: document.querySelector('#migrateVaultPanel'),
  migrateVaultSearch: document.querySelector('#migrateVaultSearch'),
  migrateVaultOptions: document.querySelector('#migrateVaultOptions'),
  migrateSameVaultWarning: document.querySelector('#migrateSameVaultWarning'),
  migrateRenameToggle: document.querySelector('#migrateRenameToggle'),
  migrateNameField: document.querySelector('#migrateNameField'),
  migrateSecretName: document.querySelector('#migrateSecretName'),
  migrateValueToggle: document.querySelector('#migrateValueToggle'),
  migrateValueField: document.querySelector('#migrateValueField'),
  migrateSecretValue: document.querySelector('#migrateSecretValue'),
  migrateExpiresOn: document.querySelector('#migrateExpiresOn'),
  submitMigrateSecret: document.querySelector('#submitMigrateSecret'),
  secretForm: document.querySelector('#secretForm'),
  secretFormTitle: document.querySelector('#secretFormTitle'),
  cancelSecretForm: document.querySelector('#cancelSecretForm'),
  secretFormName: document.querySelector('#secretFormName'),
  secretFormValue: document.querySelector('#secretFormValue'),
  secretFormContentType: document.querySelector('#secretFormContentType'),
  secretFormExpiresOn: document.querySelector('#secretFormExpiresOn'),
  secretFormTags: document.querySelector('#secretFormTags'),
  saveSecret: document.querySelector('#saveSecret')
};

function formatDate(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function datetimeLocalToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Expiration date must be valid.');
  }
  return date.toISOString();
}

function accountInitials(value) {
  if (!value) return '?';
  const name = value.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.colorScheme = state.theme === 'light' ? 'light' : 'dark';
  elements.themeSwatches.querySelectorAll('.theme-swatch').forEach((button) => {
    const active = button.dataset.theme === state.theme;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  localStorage.setItem('azureSecretsViewer:theme', state.theme);
}

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`.trim();
}

function selectedSecret() {
  return state.allSecrets.find((secret) => secret.name === state.selectedName);
}

function selectedSecretVersion() {
  return state.secretVersions.find((version) => version.version === state.selectedVersion);
}

function shortVersion(version) {
  return version ? version.slice(0, 8) : 'latest';
}

function skeletonBlock(className = '') {
  const block = document.createElement('span');
  block.className = `skeleton ${className}`.trim();
  return block;
}

function skeletonRows(count) {
  const fragment = document.createDocumentFragment();
  Array.from({ length: count }).forEach((_, index) => {
    const row = document.createElement('div');
    row.className = 'secret-row skeleton-row';
    row.append(
      skeletonBlock(index % 3 === 0 ? 'w-70' : 'w-55'),
      skeletonBlock(index % 2 === 0 ? 'w-85' : 'w-65'),
      skeletonBlock(index % 3 === 1 ? 'w-45' : 'w-35')
    );
    fragment.append(row);
  });
  return fragment;
}

function secretPortalUrl(secret) {
  const vault = state.vaults.find((entry) => entry.vaultUrl === secret.vaultUrl);
  if (!vault?.id) {
    throw new Error('Azure Portal link requires a Key Vault selected from automatic discovery.');
  }

  const tenantId = state.account?.active?.tenantId || '';
  const tenantScope = tenantId ? `#@${tenantId}/resource` : '#/resource';
  return `https://portal.azure.com/${tenantScope}${vault.id}/secrets/${encodeURIComponent(secret.name)}/overview`;
}

function currentVaultUrl() {
  return state.vaultMode === 'manual' ? elements.vaultUrl.value.trim() : state.selectedVaultUrl;
}

function comparableVaultUrl(vaultUrl) {
  return String(vaultUrl || '').trim().replace(/\/+$/, '').toLowerCase();
}

function destinationVaults(query = '') {
  return state.vaults.filter((vault) => vaultMatchesQuery(vault, query));
}

function isCurrentMigrationVault() {
  return comparableVaultUrl(state.selectedMigrationVaultUrl) === comparableVaultUrl(currentVaultUrl());
}

function secretMatchesQuery(secret, query) {
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

function applySearchFilter(loadVersions = true) {
  const previousSelectedName = state.selectedName;
  const query = elements.search.value.trim();
  state.secrets = state.allSecrets.filter((secret) => secretMatchesQuery(secret, query));
  state.secrets.sort(compareSecrets);
  if (!state.secrets.some((secret) => secret.name === state.selectedName)) {
    state.selectedName = state.secrets[0]?.name || '';
    state.revealedValue = '';
  }
  if (previousSelectedName !== state.selectedName) {
    state.secretVersions = [];
    state.selectedVersion = '';
  }
  render();
  if (loadVersions && previousSelectedName !== state.selectedName) loadSelectedSecretVersions();
}

function saveVaultUrl() {
  localStorage.setItem('azureSecretsViewer:vaultUrl', currentVaultUrl());
}

function compareSecrets(left, right) {
  const field = state.secretSort === 'createdOn' ? 'createdOn' : 'updatedOn';
  const leftTime = left[field] || left.updatedOn || left.createdOn || '';
  const rightTime = right[field] || right.updatedOn || right.createdOn || '';
  const timeOrder = state.secretSortDirection === 'asc'
    ? leftTime.localeCompare(rightTime)
    : rightTime.localeCompare(leftTime);
  return timeOrder || left.name.localeCompare(right.name);
}

function renderAccount() {
  const active = state.account?.active;
  if (!active) {
    elements.accountUser.textContent = 'Not logged in';
    elements.accountMeta.textContent = 'Click to login';
    elements.profileAvatar.textContent = '?';
    elements.profileAvatarLarge.textContent = '?';
    elements.profileName.textContent = 'Not logged in';
    elements.profileEmail.textContent = 'No Azure account connected';
    elements.profileTenant.textContent = 'Unknown';
    elements.profileSubscription.textContent = 'Unknown';
    elements.loginAzure.textContent = 'Login';
    elements.loginAzure.disabled = false;
    elements.logoutAzure.disabled = true;
    elements.logoutAzure.classList.add('hidden');
  } else {
    const userName = active.userName || 'Azure account';
    const initials = accountInitials(userName);
    elements.accountUser.textContent = userName;
    elements.accountMeta.textContent = active.subscriptionName || 'Azure CLI profile';
    elements.profileAvatar.textContent = initials;
    elements.profileAvatarLarge.textContent = initials;
    elements.profileName.textContent = active.userType ? `${active.userType} account` : 'Azure account';
    elements.profileEmail.textContent = userName;
    elements.profileTenant.textContent = active.tenantId || 'Unknown';
    elements.profileSubscription.textContent = active.subscriptionName || active.subscriptionId || 'Unknown';
    elements.loginAzure.textContent = 'Change account';
    elements.loginAzure.disabled = false;
    elements.logoutAzure.disabled = false;
    elements.logoutAzure.classList.remove('hidden');
  }
}

function setProfileMenu(open) {
  elements.profileDropdown.classList.toggle('hidden', !open);
  elements.profileButton.setAttribute('aria-expanded', String(open));
}

function vaultMeta(vault) {
  return [vault.resourceGroup, vault.subscriptionName, vault.location].filter(Boolean).join(' / ');
}

function appendVaultMetaChips(parent, vault) {
  const chips = [
    ['group', vault.resourceGroup],
    ['subscription', vault.subscriptionName],
    ['region', vault.location]
  ];

  chips.forEach(([type, value]) => {
    if (!value) return;
    const chip = document.createElement('span');
    chip.className = `vault-meta-chip ${type}`;
    chip.textContent = value;
    parent.append(chip);
  });
}

function vaultMatchesQuery(vault, query) {
  if (!query) return true;
  const haystack = [
    vault.name,
    vault.vaultUrl,
    vault.resourceGroup,
    vault.subscriptionName,
    vault.subscriptionId,
    vault.location,
    ...Object.entries(vault.tags || {}).flatMap(([key, value]) => [key, value])
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function filteredVaults() {
  return state.vaults.filter((vault) => vaultMatchesQuery(vault, elements.vaultSearch.value.trim()));
}

function setVaultComboboxOpen(open) {
  elements.vaultComboboxPanel.classList.toggle('hidden', !open);
  elements.vaultComboboxButton.setAttribute('aria-expanded', String(open));
  if (open) {
    elements.vaultSearch.focus();
    elements.vaultSearch.select();
  }
}

function vaultWarningSuffix() {
  if (state.vaultWarnings.length === 0) return '';
  return ` ${state.vaultWarnings.length} subscription warning${state.vaultWarnings.length === 1 ? '' : 's'}.`;
}

function renderVaultOptions(preferredUrl = '') {
  const selectedUrl = preferredUrl || currentVaultUrl();
  const vaults = filteredVaults();
  const fragment = document.createDocumentFragment();
  const selected = state.vaults.find((vault) => vault.vaultUrl === selectedUrl);

  if (selected) {
    elements.selectedVaultLabel.textContent = selected.name || selected.vaultUrl;
    elements.selectedVaultMeta.classList.remove('placeholder', 'hidden');
    elements.selectedVaultMeta.replaceChildren();
    if (vaultMeta(selected)) {
      appendVaultMetaChips(elements.selectedVaultMeta, selected);
    } else {
      elements.selectedVaultMeta.textContent = selected.vaultUrl;
    }
  } else {
    elements.selectedVaultLabel.textContent = state.loadingVaults ? 'Fetching Key Vaults...' : 'Search or select Key Vault';
    elements.selectedVaultMeta.classList.add('placeholder');
    elements.selectedVaultMeta.classList.toggle('hidden', state.loadingVaults);
    elements.selectedVaultMeta.textContent = 'Search by name, resource group, subscription, URL, or tag';
  }

  if (vaults.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'vault-option empty';
    empty.textContent = state.loadingVaults ? 'Fetching Key Vaults...' : 'No matching Key Vaults';
    fragment.append(empty);
  } else {
    vaults.forEach((vault) => {
      const option = document.createElement('button');
      option.className = `vault-option ${vault.vaultUrl === selectedUrl ? 'selected' : ''}`;
      option.type = 'button';
      option.dataset.vaultUrl = vault.vaultUrl;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(vault.vaultUrl === selectedUrl));

      const name = document.createElement('strong');
      name.textContent = vault.name || vault.vaultUrl;
      const meta = document.createElement('span');
      meta.className = 'vault-option-meta';
      if (vaultMeta(vault)) {
        appendVaultMetaChips(meta, vault);
      } else {
        meta.textContent = vault.vaultUrl;
      }

      option.append(name, meta);
      fragment.append(option);
    });
  }

  elements.vaultOptions.replaceChildren(fragment);
}

function renderVaultMode() {
  const isManual = state.vaultMode === 'manual';
  elements.automaticMode.classList.toggle('active', !isManual);
  elements.manualMode.classList.toggle('active', isManual);
  elements.automaticVaultControls.classList.toggle('hidden', isManual);
  elements.manualVaultControls.classList.toggle('hidden', !isManual);
  elements.refreshVaults.classList.toggle('hidden', isManual);
  localStorage.setItem('azureSecretsViewer:vaultMode', state.vaultMode);
}

function clearSecrets(message = 'Select a Key Vault to load secrets.') {
  state.allSecrets = [];
  state.secrets = [];
  state.secretVersions = [];
  state.selectedName = '';
  state.selectedVersion = '';
  state.revealedValue = '';
  state.emptyListMessage = message;
  render();
}

function renderList() {
  elements.count.textContent = String(state.secrets.length);
  elements.secretList.classList.toggle('loading', state.loading);
  elements.secretList.classList.toggle('empty', !state.loading && state.secrets.length === 0);

  if (state.loading) {
    elements.secretList.replaceChildren(skeletonRows(7));
    return;
  }

  if (state.secrets.length === 0) {
    elements.secretList.textContent = state.emptyListMessage;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.secrets.forEach((secret) => {
    const button = document.createElement('button');
    button.className = `secret-row ${secret.name === state.selectedName ? 'selected' : ''}`;
    button.type = 'button';
    button.dataset.name = secret.name;

    const title = document.createElement('strong');
    title.textContent = secret.name;
    const meta = document.createElement('span');
    meta.textContent = `${secret.enabled ? 'Enabled' : 'Disabled'} · Updated ${formatDate(secret.updatedOn)}`;
    const tags = document.createElement('small');
    tags.textContent = Object.keys(secret.tags || {}).slice(0, 3).join(' · ') || secret.contentType || 'No tags';

    button.append(title, meta, tags);
    fragment.append(button);
  });

  elements.secretList.replaceChildren(fragment);
}

function renderDetails() {
  const secret = selectedSecret();
  const detailsUnavailable = state.loadingVaults || state.loading;
  const version = detailsUnavailable ? null : (selectedSecretVersion() || secret);
  elements.emptyDetails.classList.toggle('hidden', (Boolean(secret) && !detailsUnavailable) || state.editingSecret || state.migratingSecret);
  elements.secretDetails.classList.toggle('hidden', !secret || detailsUnavailable || state.editingSecret || state.migratingSecret);
  elements.secretForm.classList.toggle('hidden', !state.editingSecret);
  elements.migrateForm.classList.toggle('hidden', !state.migratingSecret);
  elements.secretDetails.classList.toggle('loading-versions', state.loadingVersions);
  elements.versionPanel.classList.toggle('loading', state.loadingVersions);

  if (state.loadingVaults) {
    elements.emptyDetailsMessage.textContent = 'Loading Key Vaults...';
  } else if (state.loading) {
    elements.emptyDetailsMessage.textContent = 'Loading secrets...';
  } else {
    elements.emptyDetailsMessage.textContent = 'Select a secret or create a new one.';
  }

  if (!secret || !version || detailsUnavailable) return;

  elements.secretName.textContent = secret.name;
  elements.secretState.textContent = version.enabled ? 'Enabled' : 'Disabled';
  elements.secretState.className = `pill ${version.enabled ? 'enabled' : 'disabled'}`;
  elements.secretValue.textContent = state.revealedValue ? state.revealedValue : '••••••••••••••••';
  elements.valueState.textContent = state.revealedValue ? 'Revealed' : 'Hidden';
  elements.revealSecret.classList.toggle('hidden', Boolean(state.revealedValue));
  elements.hideSecret.classList.toggle('hidden', !state.revealedValue);

  const versionFragment = document.createDocumentFragment();
  if (state.loadingVersions) {
    const option = document.createElement('option');
    option.value = state.selectedVersion || secret.version || '';
    option.textContent = 'Loading versions...';
    versionFragment.append(option);
  } else if (state.secretVersions.length > 0) {
    state.secretVersions.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = entry.version;
      option.textContent = `${index === 0 ? 'Latest' : `Version ${state.secretVersions.length - index}`} · ${shortVersion(entry.version)} · ${formatDate(entry.updatedOn || entry.createdOn)}`;
      versionFragment.append(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = secret.version || '';
    option.textContent = secret.version ? `Latest · ${shortVersion(secret.version)}` : 'Latest';
    versionFragment.append(option);
  }

  elements.secretVersion.replaceChildren(versionFragment);
  elements.secretVersion.value = state.selectedVersion || secret.version || '';
  elements.secretVersion.disabled = state.loadingVersions || state.secretVersions.length <= 1;
  elements.versionCount.textContent = state.loadingVersions
    ? 'Loading version history...'
    : `${state.secretVersions.length || 1} version${(state.secretVersions.length || 1) === 1 ? '' : 's'} available`;

  const metadata = [
    { label: 'Version', value: version.version || 'Latest' },
    { label: 'Content type', value: version.contentType || 'None' },
    { label: 'Created', value: formatDate(version.createdOn) },
    { label: 'Updated', value: formatDate(version.updatedOn) },
    { label: 'Expires', value: formatDate(version.expiresOn) },
    { label: 'Not before', value: formatDate(version.notBefore) }
  ];

  const metadataFragment = document.createDocumentFragment();
  metadata.forEach(({ label, value }) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    metadataFragment.append(term, description);
  });
  elements.metadata.replaceChildren(metadataFragment);

  const tagEntries = Object.entries(secret.tags || {});
  if (tagEntries.length === 0) {
    elements.tags.textContent = 'No tags';
  } else {
    const tagFragment = document.createDocumentFragment();
    tagEntries.forEach(([key, value]) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `${key}: ${value}`;
      tagFragment.append(tag);
    });
    elements.tags.replaceChildren(tagFragment);
  }
}

function render() {
  renderList();
  renderDetails();
  renderInteractionState();
}

function renderInteractionState() {
  const vaultBusy = state.loadingVaults;
  const secretsBusy = state.loading;
  const versionsBusy = state.loadingVersions;
  const hasVault = Boolean(currentVaultUrl());
  const hasSecrets = state.allSecrets.length > 0;
  const hasSecret = Boolean(selectedSecret());
  const detailControlsDisabled = !hasSecret || secretsBusy || versionsBusy;

  elements.automaticVaultControls.classList.toggle('loading', vaultBusy);
  elements.secretDetails.setAttribute('aria-busy', String(secretsBusy || versionsBusy));
  elements.secretList.setAttribute('aria-busy', String(secretsBusy));
  elements.versionPanel.setAttribute('aria-busy', String(versionsBusy));

  elements.automaticMode.disabled = vaultBusy || secretsBusy;
  elements.manualMode.disabled = vaultBusy || secretsBusy;
  elements.vaultComboboxButton.disabled = vaultBusy;
  elements.vaultSearch.disabled = vaultBusy;
  elements.refreshVaults.disabled = vaultBusy;
  elements.vaultUrl.disabled = secretsBusy;
  elements.loadSecrets.disabled = secretsBusy || vaultBusy || !hasVault;

  elements.search.disabled = secretsBusy || !hasSecrets;
  elements.secretSort.disabled = secretsBusy || !hasSecrets;
  elements.secretSortDirection.disabled = secretsBusy || !hasSecrets;
  elements.includeDisabled.disabled = secretsBusy || !hasVault;

  elements.newSecret.disabled = vaultBusy || secretsBusy || !hasVault;
  elements.newSecretEmpty.disabled = vaultBusy || secretsBusy || !hasVault;
  elements.migrateSecret.disabled = detailControlsDisabled || vaultBusy;
  elements.copySecretName.disabled = detailControlsDisabled;
  elements.openSecret.disabled = detailControlsDisabled;
  elements.revealSecret.disabled = detailControlsDisabled;
  elements.hideSecret.disabled = detailControlsDisabled;
  elements.copySecret.disabled = detailControlsDisabled;
  elements.editSecret.disabled = detailControlsDisabled;
  elements.deleteSecret.disabled = detailControlsDisabled;
}

async function loadSecrets() {
  const vaultUrl = currentVaultUrl();
  if (!vaultUrl) {
    setStatus('Select a Key Vault or enter a vault URL.', 'error');
    elements.vaultUrl.focus();
    return;
  }

  state.loading = true;
  state.revealedValue = '';
  state.emptyListMessage = 'No secrets match current filters.';
  if (state.vaultMode === 'manual') elements.vaultUrl.value = vaultUrl;
  renderVaultOptions(vaultUrl);
  setStatus('Loading secret metadata...', 'loading');
  elements.loadSecrets.disabled = true;
  render();

  try {
    saveVaultUrl();
    state.allSecrets = await window.azureSecrets.listSecrets({
      vaultUrl,
      query: '',
      includeDisabled: elements.includeDisabled.checked
    });
    applySearchFilter(false);
    await loadSelectedSecretVersions();
    const statusType = state.vaultWarnings.length > 0 ? 'loading' : 'success';
    setStatus(`Loaded ${state.secrets.length} of ${state.allSecrets.length} secret${state.allSecrets.length === 1 ? '' : 's'}.${vaultWarningSuffix()}`, statusType);
  } catch (error) {
    state.allSecrets = [];
    state.secrets = [];
    state.secretVersions = [];
    state.selectedName = '';
    state.selectedVersion = '';
    state.emptyListMessage = 'No secrets loaded.';
    setStatus(error.message || 'Failed to load secrets.', 'error');
  } finally {
    state.loading = false;
    elements.loadSecrets.disabled = false;
    render();
  }
}

async function loadSelectedSecretVersions() {
  const secret = selectedSecret();
  const vaultUrl = currentVaultUrl();
  if (!secret || !vaultUrl) {
    state.secretVersions = [];
    state.selectedVersion = '';
    renderDetails();
    return;
  }

  const expectedName = secret.name;
  state.loadingVersions = true;
  state.revealedValue = '';
  render();

  try {
    const versions = await window.azureSecrets.listSecretVersions({ vaultUrl, name: expectedName });
    if (state.selectedName !== expectedName) return;
    state.secretVersions = versions || [];
    state.selectedVersion = state.secretVersions[0]?.version || secret.version || '';
  } catch (error) {
    if (state.selectedName !== expectedName) return;
    state.secretVersions = [];
    state.selectedVersion = secret.version || '';
    setStatus(error.message || 'Failed to load secret versions.', 'error');
  } finally {
    if (state.selectedName === expectedName) {
      state.loadingVersions = false;
      render();
    }
  }
}

async function loadVaults({ refreshSecrets = true } = {}) {
  const preferredUrl = currentVaultUrl() || localStorage.getItem('azureSecretsViewer:vaultUrl') || '';
  if (state.vaultMode === 'manual') {
    if (refreshSecrets) await loadSecrets();
    return;
  }
  state.loadingVaults = true;
  state.allSecrets = [];
  state.secrets = [];
  state.secretVersions = [];
  state.selectedName = '';
  state.selectedVersion = '';
  state.revealedValue = '';
  state.emptyListMessage = 'Fetching Key Vaults...';
  elements.refreshVaults.disabled = true;
  renderVaultOptions(preferredUrl);
  render();
  setStatus('Fetching Key Vaults across subscriptions...', 'loading');

  try {
    const result = await window.azureSecrets.listVaults();
    state.vaults = result.vaults || [];
    state.vaultWarnings = result.warnings || [];

    const selectedUrl = state.vaults.some((vault) => vault.vaultUrl === preferredUrl)
      ? preferredUrl
      : (filteredVaults()[0]?.vaultUrl || state.vaults[0]?.vaultUrl || '');

    state.selectedVaultUrl = selectedUrl;
    renderVaultOptions(selectedUrl);
    if (selectedUrl) saveVaultUrl();

    setStatus(`Found ${state.vaults.length} Key Vault${state.vaults.length === 1 ? '' : 's'}.${vaultWarningSuffix()}`, state.vaultWarnings.length > 0 ? 'loading' : 'success');

    if (selectedUrl && refreshSecrets) {
      await loadSecrets();
    } else if (!selectedUrl) {
      clearSecrets('No Key Vaults found. Enter a vault URL manually if needed.');
    }
  } catch (error) {
    state.vaults = [];
    state.vaultWarnings = [];
    renderVaultOptions(preferredUrl);
    setStatus(error.message || 'Failed to fetch Key Vaults.', 'error');
    if (!preferredUrl) clearSecrets('Could not fetch Key Vaults. Enter a vault URL manually if needed.');
  } finally {
    state.loadingVaults = false;
    elements.refreshVaults.disabled = false;
    renderVaultOptions(currentVaultUrl());
    render();
  }
}

async function loadAccount({ refreshVaults = false } = {}) {
  setStatus('Checking Azure login...', 'loading');
  try {
    state.account = await window.azureSecrets.getAccount();
    renderAccount();
    if (state.account.active) {
      setStatus(`Logged in as ${state.account.active.userName || 'Azure account'}.`, 'success');
      if (refreshVaults) await loadVaults();
    } else {
      setStatus('Not logged in. Click Login / change account.', 'error');
    }
  } catch (error) {
    state.account = null;
    renderAccount();
    setStatus(error.message || 'Failed to check Azure login.', 'error');
  }
}

async function loginAzure() {
  elements.loginAzure.disabled = true;
  setStatus('Starting Azure login...', 'loading');
  try {
    state.account = await window.azureSecrets.login();
    renderAccount();
    setProfileMenu(false);
    await loadVaults();
  } catch (error) {
    setStatus(error.message || 'Azure login failed.', 'error');
  } finally {
    elements.loginAzure.disabled = false;
  }
}

async function logoutAzure() {
  elements.logoutAzure.disabled = true;
  elements.loginAzure.disabled = true;
  setStatus('Logging out of Azure...', 'loading');
  try {
    state.account = await window.azureSecrets.logout();
    state.vaults = [];
    state.vaultWarnings = [];
    renderAccount();
    renderVaultOptions('');
    clearSecrets('Login required before loading vaults.');
    setProfileMenu(false);
    setStatus('Logged out of Azure.', 'success');
  } catch (error) {
    setStatus(error.message || 'Azure logout failed.', 'error');
  } finally {
    elements.loginAzure.disabled = false;
    renderAccount();
  }
}

async function revealSelectedSecret({ copyOnly = false } = {}) {
  const secret = selectedSecret();
  if (!secret) return;

  setStatus(copyOnly ? 'Copying secret value...' : 'Loading secret value...', 'loading');
  try {
    const result = await window.azureSecrets.getSecretValue({
      vaultUrl: currentVaultUrl(),
      name: secret.name,
      version: state.selectedVersion || secret.version || ''
    });

    if (copyOnly) {
      await window.azureSecrets.copyText(result.value);
      setStatus(`Copied value for ${secret.name}.`, 'success');
    } else {
      state.revealedValue = result.value;
      setStatus(`Revealed value for ${secret.name}.`, 'success');
      renderDetails();
    }
  } catch (error) {
    setStatus(error.message || 'Failed to read secret value.', 'error');
  }
}

async function deleteSelectedSecret() {
  const secret = selectedSecret();
  const vaultUrl = currentVaultUrl();
  if (!secret || !vaultUrl) return;

  const confirmed = window.confirm(
    `Delete secret "${secret.name}" from this Key Vault?\n\nThis removes the secret and all versions from active use. If soft-delete is enabled, recovery may still be possible until purge.`
  );
  if (!confirmed) return;

  elements.deleteSecret.disabled = true;
  setStatus(`Deleting ${secret.name}...`, 'loading');
  try {
    await window.azureSecrets.deleteSecret({ vaultUrl, name: secret.name });
    state.selectedName = '';
    state.selectedVersion = '';
    state.secretVersions = [];
    state.revealedValue = '';
    await loadSecrets();
    setStatus(`Deleted secret ${secret.name}.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to delete secret.', 'error');
  } finally {
    elements.deleteSecret.disabled = false;
  }
}

function renderMigrateVaultOptions() {
  const query = elements.migrateVaultSearch.value.trim();
  const vaults = destinationVaults(query);
  const selected = state.vaults.find((vault) => vault.vaultUrl === state.selectedMigrationVaultUrl);
  const fragment = document.createDocumentFragment();

  if (selected) {
    elements.selectedMigrateVaultLabel.textContent = selected.name || selected.vaultUrl;
    elements.selectedMigrateVaultMeta.classList.remove('placeholder', 'hidden');
    elements.selectedMigrateVaultMeta.replaceChildren();
    if (vaultMeta(selected)) {
      appendVaultMetaChips(elements.selectedMigrateVaultMeta, selected);
    } else {
      elements.selectedMigrateVaultMeta.textContent = selected.vaultUrl;
    }
    if (comparableVaultUrl(selected.vaultUrl) === comparableVaultUrl(currentVaultUrl())) {
      const chip = document.createElement('span');
      chip.className = 'vault-meta-chip current';
      chip.textContent = 'current vault';
      elements.selectedMigrateVaultMeta.append(chip);
    }
  } else {
    elements.selectedMigrateVaultLabel.textContent = 'Select destination Key Vault';
    elements.selectedMigrateVaultMeta.classList.add('placeholder');
    elements.selectedMigrateVaultMeta.classList.remove('hidden');
    elements.selectedMigrateVaultMeta.textContent = 'Search by name, resource group, subscription, URL, or tag';
  }

  if (vaults.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'vault-option empty';
    empty.textContent = query ? 'No matching destination Key Vaults' : 'No discovered Key Vaults';
    fragment.append(empty);
  } else {
    vaults.forEach((vault) => {
      const isCurrent = comparableVaultUrl(vault.vaultUrl) === comparableVaultUrl(currentVaultUrl());
      const option = document.createElement('button');
      option.className = `vault-option ${vault.vaultUrl === state.selectedMigrationVaultUrl ? 'selected' : ''}`;
      option.type = 'button';
      option.dataset.vaultUrl = vault.vaultUrl;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(vault.vaultUrl === state.selectedMigrationVaultUrl));

      const name = document.createElement('strong');
      name.textContent = vault.name || vault.vaultUrl;
      const meta = document.createElement('span');
      meta.className = 'vault-option-meta';
      if (vaultMeta(vault)) {
        appendVaultMetaChips(meta, vault);
      } else {
        meta.textContent = vault.vaultUrl;
      }
      if (isCurrent) {
        const chip = document.createElement('span');
        chip.className = 'vault-meta-chip current';
        chip.textContent = 'current vault';
        meta.append(chip);
      }

      option.append(name, meta);
      fragment.append(option);
    });
  }

  elements.migrateVaultOptions.replaceChildren(fragment);
  elements.submitMigrateSecret.disabled = !state.selectedMigrationVaultUrl;
}

function setMigrateVaultComboboxOpen(open) {
  elements.migrateVaultPanel.classList.toggle('hidden', !open);
  elements.migrateVaultButton.setAttribute('aria-expanded', String(open));
  if (open) {
    elements.migrateVaultSearch.focus();
    elements.migrateVaultSearch.select();
  }
}

function selectMigrationVault(vaultUrl) {
  state.selectedMigrationVaultUrl = vaultUrl;
  setMigrateVaultComboboxOpen(false);
  renderMigrateFieldToggles();
  renderMigrateVaultOptions();
}

function renderMigrateFieldToggles() {
  const sameVault = isCurrentMigrationVault();
  if (sameVault) elements.migrateRenameToggle.checked = true;
  const rename = elements.migrateRenameToggle.checked;
  const changeValue = elements.migrateValueToggle.checked;
  elements.migrateSameVaultWarning.classList.toggle('hidden', !sameVault);
  elements.migrateNameField.classList.toggle('hidden', !rename);
  elements.migrateValueField.classList.toggle('hidden', !changeValue);
  elements.migrateRenameToggle.disabled = sameVault;
  elements.migrateSecretName.disabled = !rename;
  elements.migrateSecretName.required = rename;
  elements.migrateSecretValue.disabled = !changeValue;
}

function startMigrateForm() {
  const secret = selectedSecret();
  if (!secret) return;

  state.editingSecret = false;
  state.migratingSecret = true;
  state.selectedMigrationVaultUrl = destinationVaults()[0]?.vaultUrl || '';
  const version = selectedSecretVersion() || secret;
  elements.migrateFormTitle.textContent = `Recreate ${secret.name}`;
  elements.migrateSecretName.value = secret.name;
  elements.migrateSecretValue.value = '';
  elements.migrateExpiresOn.value = toDatetimeLocalValue(version.expiresOn);
  elements.migrateRenameToggle.checked = false;
  elements.migrateValueToggle.checked = false;
  elements.migrateVaultSearch.value = '';
  renderMigrateFieldToggles();
  renderMigrateVaultOptions();
  renderDetails();
  elements.migrateVaultButton.focus();

  if (destinationVaults().length === 0) {
    setStatus('Load or discover a Key Vault before recreating this secret.', 'error');
  }
}

function closeMigrateForm() {
  state.migratingSecret = false;
  state.selectedMigrationVaultUrl = '';
  setMigrateVaultComboboxOpen(false);
  elements.migrateForm.reset();
  renderMigrateFieldToggles();
  renderDetails();
}

async function migrateSelectedSecret(event) {
  event.preventDefault();
  const secret = selectedSecret();
  const sourceVaultUrl = currentVaultUrl();
  const destinationVaultUrl = state.selectedMigrationVaultUrl;
  if (!secret || !sourceVaultUrl || !destinationVaultUrl) {
    setStatus('Select a source secret and destination Key Vault before recreating.', 'error');
    return;
  }

  elements.submitMigrateSecret.disabled = true;
  setStatus(`Recreating ${secret.name}...`, 'loading');
  try {
    const valueOverride = elements.migrateSecretValue.value;
    const destinationName = elements.migrateRenameToggle.checked
      ? elements.migrateSecretName.value.trim()
      : secret.name;
    if (isCurrentMigrationVault() && destinationName === secret.name) {
      setStatus('Same Key Vault selected. Enter a new secret name before recreating.', 'error');
      elements.migrateSecretName.focus();
      return;
    }
    await window.azureSecrets.migrateSecret({
      sourceVaultUrl,
      destinationVaultUrl,
      sourceName: secret.name,
      destinationName,
      version: state.selectedVersion || secret.version || '',
      expiresOn: datetimeLocalToIso(elements.migrateExpiresOn.value),
      ...(elements.migrateValueToggle.checked ? { value: valueOverride } : {})
    });
    closeMigrateForm();
    if (state.vaultMode === 'manual') {
      elements.vaultUrl.value = destinationVaultUrl;
    } else {
      state.selectedVaultUrl = destinationVaultUrl;
    }
    saveVaultUrl();
    renderVaultOptions(destinationVaultUrl);
    elements.search.value = '';
    await loadSecrets();
    state.selectedName = destinationName;
    state.selectedVersion = '';
    state.secretVersions = [];
    state.revealedValue = '';
    render();
    await loadSelectedSecretVersions();
    setStatus(`Recreated secret ${destinationName} in destination Key Vault.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to recreate secret.', 'error');
  } finally {
    elements.submitMigrateSecret.disabled = false;
  }
}

function startSecretForm(mode) {
  const secret = selectedSecret();
  state.editingSecret = true;
  state.migratingSecret = false;
  elements.secretFormTitle.textContent = mode === 'update' ? 'Update secret' : 'Add secret';
  elements.secretFormName.value = mode === 'update' && secret ? secret.name : '';
  elements.secretFormName.readOnly = mode === 'update';
  elements.secretFormValue.value = mode === 'update' ? state.revealedValue : '';
  elements.secretFormValue.placeholder = mode === 'update' ? 'Enter new value (creates a new secret version)' : 'secret value';
  elements.secretFormContentType.value = mode === 'update' && secret ? secret.contentType : '';
  elements.secretFormExpiresOn.value = mode === 'update' && secret ? toDatetimeLocalValue(secret.expiresOn) : '';
  elements.secretFormTags.value = mode === 'update' && secret && Object.keys(secret.tags || {}).length > 0
    ? JSON.stringify(secret.tags, null, 2)
    : '';
  renderDetails();
  elements.secretFormName.focus();
}

function closeSecretForm() {
  state.editingSecret = false;
  elements.secretForm.reset();
  elements.secretFormName.readOnly = false;
  renderDetails();
}

function parseTags() {
  const raw = elements.secretFormTags.value.trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tags JSON must be an object.');
  }
  return parsed;
}

async function saveSecret(event) {
  event.preventDefault();
  const vaultUrl = currentVaultUrl();
  if (!vaultUrl) {
    setStatus('Select a Key Vault before saving a secret.', 'error');
    return;
  }

  elements.saveSecret.disabled = true;
  setStatus('Saving secret...', 'loading');
  try {
    const name = elements.secretFormName.value.trim();
    await window.azureSecrets.saveSecret({
      vaultUrl,
      name,
      value: elements.secretFormValue.value,
      contentType: elements.secretFormContentType.value.trim(),
      expiresOn: datetimeLocalToIso(elements.secretFormExpiresOn.value),
      tags: parseTags()
    });
    closeSecretForm();
    elements.search.value = '';
    await loadSecrets();
    state.selectedName = name;
    state.selectedVersion = '';
    state.secretVersions = [];
    state.revealedValue = '';
    render();
    await loadSelectedSecretVersions();
    setStatus(`Saved secret ${name}.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to save secret.', 'error');
  } finally {
    elements.saveSecret.disabled = false;
  }
}

function setVaultMode(mode) {
  state.vaultMode = mode;
  renderVaultMode();
  clearSecrets(mode === 'manual' ? 'Enter a vault URL, then refresh secrets.' : 'Select a Key Vault to load secrets.');
  if (mode === 'automatic') {
    renderVaultOptions(currentVaultUrl());
    if (currentVaultUrl()) loadSecrets();
  }
}

function selectVault(vaultUrl) {
  state.selectedVaultUrl = vaultUrl;
  saveVaultUrl();
  setVaultComboboxOpen(false);
  renderVaultOptions(vaultUrl);
  loadSecrets();
}

elements.loginAzure.addEventListener('click', loginAzure);
elements.refreshAccount.addEventListener('click', () => loadAccount({ refreshVaults: true }));
elements.logoutAzure.addEventListener('click', logoutAzure);
elements.profileButton.addEventListener('click', () => {
  setProfileMenu(elements.profileDropdown.classList.contains('hidden'));
});
elements.themeSwatches.addEventListener('click', (event) => {
  const swatch = event.target.closest('.theme-swatch[data-theme]');
  if (!swatch) return;
  state.theme = swatch.dataset.theme;
  applyTheme();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.profile-menu')) setProfileMenu(false);
  if (!event.target.closest('#automaticVaultControls .vault-combobox')) setVaultComboboxOpen(false);
  if (!event.target.closest('#migrateVaultCombobox')) setMigrateVaultComboboxOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setProfileMenu(false);
    setVaultComboboxOpen(false);
    setMigrateVaultComboboxOpen(false);
  }
});
elements.automaticMode.addEventListener('click', () => setVaultMode('automatic'));
elements.manualMode.addEventListener('click', () => setVaultMode('manual'));
elements.refreshVaults.addEventListener('click', () => loadVaults());
elements.loadSecrets.addEventListener('click', loadSecrets);
elements.vaultComboboxButton.addEventListener('click', () => {
  const isOpen = !elements.vaultComboboxPanel.classList.contains('hidden');
  setVaultComboboxOpen(!isOpen);
});
elements.vaultSearch.addEventListener('input', () => renderVaultOptions(currentVaultUrl()));
elements.vaultSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const firstOption = elements.vaultOptions.querySelector('.vault-option[data-vault-url]');
    if (firstOption) selectVault(firstOption.dataset.vaultUrl);
  }
});
elements.vaultOptions.addEventListener('click', (event) => {
  const option = event.target.closest('.vault-option[data-vault-url]');
  if (!option) return;
  selectVault(option.dataset.vaultUrl);
});
elements.vaultUrl.addEventListener('input', () => {
  renderVaultOptions(elements.vaultUrl.value.trim());
});
elements.vaultUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadSecrets();
});
elements.search.addEventListener('input', () => applySearchFilter());
elements.search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadSecrets();
});
elements.secretSort.addEventListener('change', () => {
  state.secretSort = elements.secretSort.value;
  localStorage.setItem('azureSecretsViewer:secretSort', state.secretSort);
  applySearchFilter();
});
elements.secretSortDirection.addEventListener('change', () => {
  state.secretSortDirection = elements.secretSortDirection.value;
  localStorage.setItem('azureSecretsViewer:secretSortDirection', state.secretSortDirection);
  applySearchFilter();
});
elements.includeDisabled.addEventListener('change', () => {
  if (currentVaultUrl()) loadSecrets();
});
elements.secretList.addEventListener('click', (event) => {
  const row = event.target.closest('.secret-row');
  if (!row) return;
  state.selectedName = row.dataset.name;
  state.selectedVersion = '';
  state.secretVersions = [];
  state.revealedValue = '';
  render();
  loadSelectedSecretVersions();
});
elements.secretVersion.addEventListener('change', () => {
  state.selectedVersion = elements.secretVersion.value;
  state.revealedValue = '';
  renderDetails();
});
elements.openSecret.addEventListener('click', async () => {
  const secret = selectedSecret();
  if (!secret) return;
  try {
    await window.azureSecrets.openUrl(secretPortalUrl(secret));
    setStatus('Opened secret in Azure Portal.', 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to open Azure Portal.', 'error');
  }
});
elements.revealSecret.addEventListener('click', () => revealSelectedSecret());
elements.hideSecret.addEventListener('click', () => {
  state.revealedValue = '';
  renderDetails();
  setStatus('Secret value hidden.', 'success');
});
elements.copySecret.addEventListener('click', () => revealSelectedSecret({ copyOnly: true }));
elements.copySecretName.addEventListener('click', async () => {
  const secret = selectedSecret();
  if (!secret) return;
  try {
    await window.azureSecrets.copyText(secret.name);
    setStatus(`Copied name for ${secret.name}.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Failed to copy secret name.', 'error');
  }
});
elements.deleteSecret.addEventListener('click', deleteSelectedSecret);
elements.newSecretEmpty.addEventListener('click', () => startSecretForm('add'));
elements.newSecret.addEventListener('click', () => startSecretForm('add'));
elements.migrateSecret.addEventListener('click', startMigrateForm);
elements.migrateVaultButton.addEventListener('click', () => {
  const isOpen = !elements.migrateVaultPanel.classList.contains('hidden');
  setMigrateVaultComboboxOpen(!isOpen);
});
elements.migrateVaultSearch.addEventListener('input', renderMigrateVaultOptions);
elements.migrateVaultSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const firstOption = elements.migrateVaultOptions.querySelector('.vault-option[data-vault-url]');
    if (firstOption) selectMigrationVault(firstOption.dataset.vaultUrl);
  }
});
elements.migrateVaultOptions.addEventListener('click', (event) => {
  const option = event.target.closest('.vault-option[data-vault-url]');
  if (!option) return;
  selectMigrationVault(option.dataset.vaultUrl);
});
elements.migrateRenameToggle.addEventListener('change', () => {
  renderMigrateFieldToggles();
  if (elements.migrateRenameToggle.checked) elements.migrateSecretName.focus();
});
elements.migrateValueToggle.addEventListener('change', () => {
  renderMigrateFieldToggles();
  if (elements.migrateValueToggle.checked) elements.migrateSecretValue.focus();
});
elements.cancelMigrateForm.addEventListener('click', closeMigrateForm);
elements.migrateForm.addEventListener('submit', migrateSelectedSecret);
elements.editSecret.addEventListener('click', () => startSecretForm('update'));
elements.cancelSecretForm.addEventListener('click', closeSecretForm);
elements.secretForm.addEventListener('submit', saveSecret);

elements.vaultUrl.value = localStorage.getItem('azureSecretsViewer:vaultUrl') || '';
state.selectedVaultUrl = localStorage.getItem('azureSecretsViewer:vaultUrl') || '';
elements.appVersion.textContent = `v${window.azureSecrets.version || '0.1.0'}`;
elements.secretSort.value = state.secretSort;
elements.secretSortDirection.value = state.secretSortDirection;
applyTheme();
renderAccount();
renderVaultMode();
renderVaultOptions(elements.vaultUrl.value);
renderMigrateFieldToggles();
render();
loadAccount({ refreshVaults: true });
