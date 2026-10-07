# Streak Glance Widget

A clean, distraction-free widget displaying your daily streak with motivational milestone progress.

## Overview

- **Plugin ID**: `orbit.community.streak-glance`
- **Version**: `1.0.0`
- **Author**: Alex Vance (`@alexvance`)
- **Category**: Community / Productivity
- **Display Location**: Today Dashboard

## Capabilities Requested

| Capability | Scope | Purpose |
| :--- | :--- | :--- |
| `widget:render` | — | Renders the visual card in the Today dashboard widget grid |
| `dashboard:read` | `["streak", "level", "xp"]` | Displays your current streak count, level, and XP progression |

## Security & Isolation

- 100% self-contained in a single `index.html`.
- No external scripts, stylesheets, or remote images.
- Zero network requests. All data is requested securely through Orbit's local message broker.
