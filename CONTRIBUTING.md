# Contributing to Orbit Community Plugins

Thank you for your interest in building an Orbit plugin! This guide outlines how plugins work, security boundaries, and the submission process.

---

## 1. What a Plugin Can and Cannot Do Today

Orbit uses a strict **least-privilege capability broker**. Plugins execute inside an isolated `<iframe>` with sandbox attributes `allow-scripts` (no `allow-same-origin`, no `allow-top-navigation`, no `allow-popups`, no `allow-modals`).

### Supported Capabilities (Manifest v1)

Currently, community plugins may declare only the following capabilities:

1. **`widget:render`**
   - Allows your plugin to render as a card widget on the Today dashboard.
   - Required for any dashboard widget.

2. **`dashboard:read`**
   - Grants read-only access to user progression metrics.
   - Allowed scopes:
     - `"streak"` — current daily streak count
     - `"level"` — current user level
     - `"xp"` — current XP points and progression
   - Example: `{ "name": "dashboard:read", "scope": ["streak", "level", "xp"], "required": true }`

### What is NOT Available (Strictly Prohibited)

The following APIs and capabilities are **NOT available** to community plugins:
- ❌ **Network Access**: No `fetch()`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or external URLs. Under the runtime Content Security Policy (`connect-src 'none'`), any network call is immediately rejected.
- ❌ **File System Access**: No reading or writing files. (Reserved namespace `fs:*`).
- ❌ **Shell Execution**: No spawning processes or terminal commands. (Reserved namespace `shell:*`).
- ❌ **System Notifications**: Native notifications are not yet exposed. (Reserved namespace `notify:*`).
- ❌ **Data Writing**: Plugins cannot mutate user tasks, habits, goals, or database rows.

---

## 2. Manifest v1 Specification

Every plugin must have a `manifest.json` file in its root directory. This schema matches Orbit's core runtime schema (`lib/plugin-runtime/manifest.ts`):

```json
{
  "manifestVersion": 1,
  "id": "orbit.community.my-plugin",
  "name": "My Plugin Name",
  "version": "1.0.0",
  "description": "Concise summary of what this widget renders.",
  "author": {
    "name": "Your Name or Handle",
    "url": "https://github.com/your-username",
    "email": "you@example.com"
  },
  "trust": "sandboxed",
  "entry": "index.html",
  "capabilities": [
    {
      "name": "widget:render",
      "required": true
    },
    {
      "name": "dashboard:read",
      "scope": ["streak", "level", "xp"],
      "required": true
    }
  ],
  "platforms": ["web", "desktop"],
  "icon": "sparkles"
}
```

### Field Definitions

| Field | Type | Rules |
| :--- | :--- | :--- |
| `manifestVersion` | `number` | Must be exactly `1`. |
| `id` | `string` | Must be reverse-domain style (e.g. `orbit.community.<name>` or `com.<author>.<name>`). **Must match the directory name exactly.** |
| `name` | `string` | Human-readable title displayed in the plugin directory and consent modal. |
| `version` | `string` | Valid SemVer format (e.g. `"1.0.0"`). |
| `description` | `string` | Clear description explaining what information the widget presents. |
| `author` | `object` | `{ "name": string, "url"?: string, "email"?: string }`. |
| `trust` | `string` | Must be `"sandboxed"`. (`"builtin"` is reserved for Orbit internal modules). |
| `entry` | `string` | Must be `"index.html"`. |
| `capabilities` | `array` | Declared capabilities requested by the plugin. |
| `platforms` | `array` | Supported platforms: `["web", "desktop"]`. |
| `icon` | `string` | Optional Lucide icon name (e.g. `"flame"`, `"sparkles"`, `"clock"`, `"target"`). |

---

## 3. The Self-Contained HTML Requirement

Your plugin's UI and logic must reside entirely in a single **`index.html`** file:

- **No external scripts**: `<script src="https://...">` will fail under the sandbox CSP (`script-src 'unsafe-inline'`). All JavaScript must be inline `<script>` tags.
- **No external styles**: `<link rel="stylesheet" href="https://...">` will fail under CSP (`style-src 'unsafe-inline'`). Use inline `<style>` tags.
- **No external images**: `<img src="https://...">` is blocked. Use inline SVGs or base64 data URIs.
- **No nested iframes**: Do not create child `<iframe>` elements.

### Broker Communication Protocol

To receive data from Orbit, communicate with the parent window using standard JSON-RPC over `postMessage`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, sans-serif;
      background: #0b0d13;
      color: #f4f5f7;
    }
  </style>
</head>
<body>
  <div id="app">Loading...</div>

  <script>
    let rpcId = 1;
    const pendingCallbacks = new Map();

    // 1. Listen for broker responses
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && data.jsonrpc === '2.0' && data.id) {
        const resolve = pendingCallbacks.get(data.id);
        if (resolve) {
          pendingCallbacks.delete(data.id);
          resolve(data.result);
        }
      }
    });

    // 2. Helper to send JSON-RPC requests to Orbit host
    function callBroker(method, params = {}) {
      return new Promise((resolve) => {
        const id = rpcId++;
        pendingCallbacks.set(id, resolve);
        window.parent.postMessage(
          { jsonrpc: '2.0', id, method, params },
          '*'
        );
      });
    }

    // 3. Handshake & query data
    async function init() {
      // Announce readiness to the host
      window.parent.postMessage({ jsonrpc: '2.0', method: 'plugin:ready' }, '*');

      // Request dashboard metrics (requires 'dashboard:read' capability)
      const data = await callBroker('dashboard:read', { fields: ['streak', 'level', 'xp'] });
      
      document.getElementById('app').innerHTML = `
        <h3>Streak: ${data.streak || 0} days</h3>
        <p>Level: ${data.level || 1} (${data.xp || 0} XP)</p>
      `;
    }

    init();
  </script>
</body>
</html>
```

---

## 4. Submission & Review Process

1. **Fork** this repository (`Praveen-2595/orbit-plugins`).
2. **Create a branch** for your plugin: `git checkout -b plugin/<plugin-id>`.
3. Add your plugin folder under `plugins/<plugin-id>/`:
   - `plugins/<plugin-id>/manifest.json`
   - `plugins/<plugin-id>/index.html`
   - `plugins/<plugin-id>/README.md`
4. **Run local validation**:
   ```bash
   node scripts/validate-plugin.mjs plugins/<plugin-id>
   ```
5. **Open a Pull Request**:
   - Provide a clear PR description explaining what your widget does.
   - Include a screenshot or recording if possible.
   - CI will automatically run the validator on your PR.
6. **Maintainer Review**:
   - The maintainer will verify your submission against the [Review Checklist](./PLUGIN_REVIEW_CHECKLIST.md).
   - Once approved and merged, the plugin is staged and published to the live Orbit catalog!
