import fs from 'fs'
import path from 'path'

const ALLOWED_CAPABILITIES = new Set(['widget:render', 'dashboard:read'])
const RESERVED_NAMESPACES = ['fs:', 'shell:', 'notify:', 'net:']
const ALLOWED_DASHBOARD_SCOPES = new Set(['streak', 'level', 'xp'])
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
const REVERSE_DOMAIN_REGEX = /^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i

export function validatePlugin(pluginDir) {
  const errors = []
  const warnings = []
  const folderName = path.basename(pluginDir)
  let pluginId = folderName

  if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
    return { valid: false, errors: [`Path is not a directory: ${pluginDir}`], warnings: [] }
  }

  // 1. manifest.json
  const manifestPath = path.join(pluginDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing manifest.json')
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

      if (manifest.manifestVersion !== 1) {
        errors.push(`manifestVersion must be 1 (found ${manifest.manifestVersion})`)
      }

      if (!manifest.id || typeof manifest.id !== 'string') {
        errors.push('Missing or invalid plugin id')
      } else {
        pluginId = manifest.id
        if (manifest.id !== folderName) {
          errors.push(`Plugin ID "${manifest.id}" does not match folder name "${folderName}"`)
        }
        if (!REVERSE_DOMAIN_REGEX.test(manifest.id)) {
          errors.push(`Plugin ID "${manifest.id}" must follow reverse-domain format (e.g. orbit.community.my-widget)`)
        }
      }

      if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim() === '') {
        errors.push('Missing or empty plugin name')
      }

      if (!manifest.version || !SEMVER_REGEX.test(manifest.version)) {
        errors.push(`Version "${manifest.version}" is not a valid semver string (e.g. 1.0.0)`)
      }

      if (manifest.trust !== 'sandboxed') {
        errors.push(`trust must be "sandboxed" for community plugins (found "${manifest.trust}")`)
      }

      if (manifest.entry !== 'index.html') {
        errors.push(`entry must be "index.html" (found "${manifest.entry}")`)
      }

      if (!manifest.author || !manifest.author.name) {
        errors.push('author.name is required in manifest.json')
      }

      if (!Array.isArray(manifest.capabilities)) {
        errors.push('capabilities must be an array')
      } else {
        for (const cap of manifest.capabilities) {
          if (!cap.name) {
            errors.push('Capability object missing name')
            continue
          }
          if (RESERVED_NAMESPACES.some((ns) => cap.name.startsWith(ns))) {
            errors.push(`Capability "${cap.name}" belongs to a reserved namespace. Filesystem, shell, network, and notifications are not available.`)
          } else if (!ALLOWED_CAPABILITIES.has(cap.name)) {
            errors.push(`Unsupported capability "${cap.name}". Supported: widget:render, dashboard:read`)
          }

          if (cap.name === 'dashboard:read' && cap.scope) {
            if (!Array.isArray(cap.scope)) {
              errors.push('dashboard:read scope must be an array of strings')
            } else {
              for (const s of cap.scope) {
                if (!ALLOWED_DASHBOARD_SCOPES.has(s)) {
                  errors.push(`Invalid dashboard:read scope "${s}". Allowed: streak, level, xp`)
                }
              }
            }
          }
        }
      }
    } catch (err) {
      errors.push(`manifest.json parse error: ${err.message}`)
    }
  }

  // 2. index.html
  const indexPath = path.join(pluginDir, 'index.html')
  if (!fs.existsSync(indexPath)) {
    errors.push('Missing index.html')
  } else {
    const html = fs.readFileSync(indexPath, 'utf-8')

    if (/<script\b[^>]*\bsrc\s*=\s*["'](https?:|\/\/)/i.test(html)) {
      errors.push('index.html contains external <script src="...">. All JavaScript must be inline.')
    }
    if (/<link\b[^>]*\bhref\s*=\s*["'](https?:|\/\/)/i.test(html)) {
      errors.push('index.html contains external <link rel="stylesheet">. All CSS must be inline.')
    }
    if (/<img\b[^>]*\bsrc\s*=\s*["'](https?:|\/\/)/i.test(html)) {
      errors.push('index.html contains external <img src="...">. Use inline SVGs or data: URIs.')
    }
    if (/<iframe\b/i.test(html)) {
      errors.push('Nested <iframe> elements are forbidden.')
    }
    if (/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/i.test(html)) {
      errors.push('Direct network APIs (fetch, XMLHttpRequest, WebSocket) are blocked. Use Orbit broker protocol.')
    }
    if (/window\.parent\.document|window\.top\.document|window\.parent\.location|window\.top\.location/i.test(html)) {
      errors.push('Forbidden attempt to access parent or top window document/location.')
    }
  }

  // 3. README.md
  const readmePath = path.join(pluginDir, 'README.md')
  if (!fs.existsSync(readmePath)) {
    errors.push('Missing README.md')
  }

  return {
    valid: errors.length === 0,
    pluginId,
    folderName,
    errors,
    warnings,
  }
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('validate-plugin.mjs')) {
  const args = process.argv.slice(2)
  const target = args[0] || 'plugins'
  const targetPath = path.resolve(target)

  let directories = []
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    const manifestInDir = path.join(targetPath, 'manifest.json')
    if (fs.existsSync(manifestInDir)) {
      directories = [targetPath]
    } else {
      directories = fs
        .readdirSync(targetPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(targetPath, d.name))
    }
  }

  if (directories.length === 0) {
    console.log(`No plugin directories found in ${targetPath}`)
    process.exit(0)
  }

  console.log(`Validating ${directories.length} plugin(s)...\n`)
  let allPass = true

  for (const dir of directories) {
    const res = validatePlugin(dir)
    if (res.valid) {
      console.log(`[PASS] ${res.folderName} (${res.pluginId})`)
      res.warnings.forEach((w) => console.log(`       WARN: ${w}`))
    } else {
      allPass = false
      console.error(`[FAIL] ${res.folderName}`)
      res.errors.forEach((e) => console.error(`       ERROR: ${e}`))
    }
  }

  if (!allPass) {
    console.error('\nPlugin validation failed.')
    process.exit(1)
  }

  console.log('\nAll plugins passed validation!')
}
