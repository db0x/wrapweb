export function initBuildOverlay({ tr }) {
  const overlay = document.createElement('div')
  overlay.id = 'build-overlay'
  overlay.className = 'hidden'
  overlay.innerHTML = `
    <div class="build-spinner"></div>
    <span class="build-overlay-label" id="build-overlay-label"></span>
  `
  document.body.appendChild(overlay)

  function showBuildOverlay(name) {
    document.getElementById('build-overlay-label').textContent = tr('buildingApp', { name })
    overlay.classList.remove('hidden')
  }

  function hideBuildOverlay() {
    overlay.classList.add('hidden')
  }

  return { showBuildOverlay, hideBuildOverlay }
}
