const ASCII_ART = [
  '                                 __ ',
  ' _    _________ ____ _    _____ / / ',
  '| |/|/ / __/ _ `/ _ \\ |/|/ / -_) _ \\',
  '|__,__/_/  \\_,_/ .__/__,__/\\__/_.__/🐧',
  '              /_/                   ',
].join('\n')

export function initAboutDialog({ i18n, version, icons }) {
  const githubIconHtml = icons.github
    ? `<img src="${icons.github}" width="20" height="20" alt="" class="about-github-icon">`
    : ''
  const overlay = document.createElement('div')
  overlay.className = 'dialog-overlay hidden'
  overlay.innerHTML = `
    <div class="dialog about-dialog">
      <button class="dialog-close" id="about-close">✕</button>
      <div class="about-icon-wrap">
        <img src="../../assets/wrapweb.svg" alt="wrapweb" class="about-icon">
      </div>
      <pre class="about-ascii"></pre>
      <div class="about-version">v${version}</div>
      <div class="about-license">${i18n.aboutLicense}</div>
      <a class="about-github" href="#" id="about-github-link">${githubIconHtml}${i18n.aboutGithub}</a>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('.about-ascii').textContent = ASCII_ART

  function closeAboutDialog() { overlay.classList.add('hidden') }

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAboutDialog() })
  document.getElementById('about-close').addEventListener('click', closeAboutDialog)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAboutDialog() })

  // openExternal goes through main to enforce an allowlist — renderer cannot open arbitrary URLs.
  document.getElementById('about-github-link').addEventListener('click', e => {
    e.preventDefault()
    window.managerAPI.openExternal('https://github.com/db0x/wrapweb')
  })

  function openAboutDialog() { overlay.classList.remove('hidden') }

  return { openAboutDialog }
}
