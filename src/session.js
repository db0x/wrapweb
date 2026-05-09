const { session, desktopCapturer, app } = require('electron')

const MEDIA_PERMISSIONS = [
  'media', 'display-capture', 'mediaKeySystem',
  'notifications', 'camera', 'microphone',
  'clipboard-read', 'clipboard-sanitized-write',
]

function createSession(profile, opts = {}) {
  const customSession = session.fromPartition('persist:my-profile', { cache: true })

  customSession.setSpellCheckerLanguages(app.getPreferredSystemLanguages())

  const allowed = opts.fileSystem
    ? [...MEDIA_PERMISSIONS, 'fileSystem']
    : MEDIA_PERMISSIONS

  customSession.setPermissionCheckHandler((_wc, permission) =>
    allowed.includes(permission)
  )

  customSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(allowed.includes(permission))
  )

  // Wayland: getSources() delegates to xdg-desktop-portal
  customSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
      callback(sources.length > 0 ? { video: sources[0], audio: 'loopback' } : {})
    } catch {
      callback({})
    }
  })

  return customSession
}

module.exports = { createSession }
