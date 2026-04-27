const { session, desktopCapturer, app } = require('electron')

const MEDIA_PERMISSIONS = [
  'media', 'display-capture', 'mediaKeySystem',
  'notifications', 'camera', 'microphone',
]

function createSession(profile) {
  const customSession = session.fromPartition('persist:my-profile', { cache: true })

  customSession.setSpellCheckerLanguages(app.getPreferredSystemLanguages())

  customSession.setPermissionCheckHandler((_wc, permission) =>
    MEDIA_PERMISSIONS.includes(permission)
  )

  customSession.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(MEDIA_PERMISSIONS.includes(permission))
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
