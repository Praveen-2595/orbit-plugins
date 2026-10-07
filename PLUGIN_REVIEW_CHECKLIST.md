# Community Plugin Review Checklist

A straightforward, practical checklist for reviewing pull requests in `orbit-plugins`. Use this when evaluating any submitted community plugin before approving and merging.

---

## 1. Automated CI Checks (Sanity Check)

- [ ] **GitHub Actions passed**: The automated validator ran green on the PR.
- [ ] **Folder name matches ID**: The folder name under `plugins/` exactly matches the `"id"` field in `manifest.json`.
- [ ] **Files present**: The directory contains only `manifest.json`, `index.html`, and `README.md` (plus optional local assets like preview screenshots).

---

## 2. Capability & Scope Review (Least Privilege)

Check the `"capabilities"` array in `manifest.json`:

- [ ] **Only existing capabilities requested**:
  - Valid: `widget:render` (rendering on Today dashboard).
  - Valid: `dashboard:read` (reading streak/level/xp).
  - ❌ **Reject immediately** if the plugin asks for:
    - Any network or internet capabilities (`net:*`, `http`, `fetch`).
    - File system capabilities (`fs:*`).
    - Shell or system execution (`shell:*`).
    - Notification capabilities (`notify:*`).
    - Any unrecognised capability names.
- [ ] **Scoped data access matches purpose**:
  - If it requests `dashboard:read`, does the widget actually display the requested values?
  - For example, if it only shows streak, it should ideally only request `["streak"]`, not unnecessary scopes.
- [ ] **`trust` is set to `"sandboxed"`**:
  - Must never be `"builtin"`.

---

## 3. Name & Description Truthfulness (No Dark Patterns)

Read the `manifest.json` `"name"` and `"description"`, and compare them to what `index.html` actually does:

- [ ] **No misleading claims**:
  - The plugin doesn't claim to "sync with Google Calendar" or "send alerts" when plugins cannot access the internet or notifications.
  - The name and description accurately describe what the user will see on their Today screen.
- [ ] **Consent modal clarity**:
  - When the user installs the plugin, the consent modal lists the capabilities. Is the user going to be surprised by what this plugin asks for?

---

## 4. Code & Sandbox Security Inspection (`index.html`)

Open `index.html` and scan the code:

- [ ] **Strictly self-contained (No External Links)**:
  - Search for `http://` and `https://`:
    - ❌ No `<script src="https://...">` (external JS libraries like jQuery/React CDN are prohibited).
    - ❌ No `<link rel="stylesheet" href="https://...">` (external fonts or stylesheets are prohibited).
    - ❌ No `<img src="https://...">` (external images are prohibited; inline SVGs or data URIs are required).
- [ ] **No Network API attempts**:
  - Search for `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`.
  - Even though the sandbox CSP blocks network calls, a clean community plugin should not even attempt them.
- [ ] **No Sandbox Probe or Escape Attempts**:
  - Search for `window.parent`: It should ONLY be used for `window.parent.postMessage({ jsonrpc: '2.0', ... }, '*')`.
  - ❌ Reject if it tries:
    - `window.parent.location = ...` or `window.top.location = ...`
    - `window.parent.document` or `window.top.document`
    - `document.cookie` or `window.localStorage` (isolated in sandboxed origins anyway, but shouldn't attempt cross-origin access).
    - Nested `<iframe>` tags.
    - Obfuscated code, `eval(...)`, or `new Function(...)`.
- [ ] **No infinite loops or CPU burners**:
  - Code should use `requestAnimationFrame` or reasonable `setInterval` (e.g. 1000ms+), not tight `while(true)` loops that freeze the browser tab.

---

## 5. Review Decision

| Findings | Action |
| :--- | :--- |
| All checks pass | **Approve & Merge PR** &rarr; Run publish script. |
| Minor issue (e.g. typo, missing README detail) | Request changes on PR with a friendly comment. |
| Sandbox probe, external URLs, or reserved permissions | **Close & Reject PR** with explanation referencing `CONTRIBUTING.md`. |
