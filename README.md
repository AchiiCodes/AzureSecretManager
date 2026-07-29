# Azure Secret Manager

Electron desktop app for browsing and searching Azure Key Vault secrets.

## Features

- Search secret names, content types, and tags.
- Search Key Vaults by name, URL, resource group, subscription, location, and tags.
- Automatically discover Key Vaults across accessible Azure subscriptions.
- Switch between automatic Key Vault discovery and manual vault URL mode.
- Refresh Key Vault list and selected vault secrets independently.
- Add new secrets and update existing secrets by creating new Key Vault secret versions.
- Delete secrets after confirmation.
- Browse secret metadata without loading values.
- Reveal values only on demand.
- Copy values through Electron clipboard API.
- Authenticate with Azure `DefaultAzureCredential` from your local machine.

## Prerequisites

- Node.js 20 or newer recommended.
- Azure CLI installed for login and account display.
- Azure management-plane access to list subscriptions and Key Vault resources, such as Reader on target subscriptions/resource groups.
- Data-plane access to selected Azure Key Vault with `secrets/list`, `secrets/get`, `secrets/set`, and `secrets/delete` permissions.
- One working Azure credential source supported by `DefaultAzureCredential`.

Common local setup:

```bash
az login
```

App also includes `Login`/`Change account` and `Refresh` controls at top.

## Run

```bash
npm install
npm start
```

On launch, app checks Azure CLI login first. After login, it fetches accessible Key Vaults and selects first vault. Switch to `Manual` mode to paste a vault URL like:

```text
https://my-vault.vault.azure.net
```

## Safety Notes

- Secret values are not loaded during search/listing.
- Values are requested only when you click `Reveal value` or `Copy value`.
- Updating a secret creates a new Key Vault secret version.
- Deleting a secret requires confirmation and uses Key Vault delete behavior. If soft-delete is enabled, recovery may still be possible until purge.
- Secret values are not persisted by app.
- Vault URL is stored in renderer `localStorage` for convenience.
- Key Vault metadata is fetched through Azure Resource Manager; secret metadata/values are fetched from selected vault data-plane endpoint.

## Troubleshooting

- `Vault URL must be an Azure Key Vault URL ending in .vault.azure.net.`: use full public Azure Key Vault URL.
- `Azure CLI failed`: install Azure CLI or run `az login` from terminal once.
- `CredentialUnavailableError`: use app login, run `az login`, set environment credentials, or sign in through another `DefaultAzureCredential` source.
- No Key Vaults in dropdown: your identity may lack Reader access to subscriptions/resource groups, or no subscriptions are visible to current credential.
- `Forbidden` while loading secrets: your identity needs Key Vault secret list/get permissions via RBAC or access policy.
- `Forbidden` while saving secrets: your identity needs Key Vault secret set permission.
- `Forbidden` while deleting secrets: your identity needs Key Vault secret delete permission.
