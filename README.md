# Orbit Community Plugins

Welcome to the official community plugin repository for [Orbit](https://tryorbit.one).

This repository hosts community-submitted widgets and extensions for the Orbit ecosystem. Plugins in Orbit run in secure, sandboxed iframes with strict capability-based permissions.

## Directory Structure

Each plugin lives inside its own directory within `plugins/`:

```
plugins/
└── <plugin-id>/
    ├── manifest.json   # Manifest v1 definition (id, capabilities, trust, metadata)
    ├── index.html      # Self-contained bundle (HTML + inline CSS + inline JS)
    └── README.md       # Plugin documentation, capabilities explanation, and previews
```

## Submitting a Plugin

Interested in building an Orbit plugin? Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) guide before submitting a pull request.

All submissions are:
1. Automatically validated via GitHub Actions CI for Manifest v1 schema compliance and sandbox security.
2. Manually reviewed by maintainers using the [PLUGIN_REVIEW_CHECKLIST.md](./PLUGIN_REVIEW_CHECKLIST.md).
3. Staged and published to the live Orbit catalog upon approval.

## Active Capabilities (v1)

Today, Orbit plugins are strictly sandboxed and limited to:
- `widget:render` — renders an interactive visual widget card on the user's Today dashboard.
- `dashboard:read` — read-only access to user streak, level, and XP progression (`scope: ["streak", "level", "xp"]`).

*Network requests, filesystem access, notifications, and database writes are strictly disallowed.*
