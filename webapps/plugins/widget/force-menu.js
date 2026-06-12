// Restores access to the native context menu (cut/copy/paste + the widget's Move/Quit and any other
// plugin items) in apps that suppress it. RUNS IN THE PAGE'S MAIN WORLD (injected by widget.js on
// dom-ready). Apps like Microsoft Teams / Office call preventDefault() on `contextmenu` almost
// everywhere to hide the browser menu and show their own — which leaves a frameless widget with no
// way to reach Move/Quit there (a "dead" right-click; only text inputs, where the app lets the
// event through, still work).
//
// Ctrl+right-click is the escape hatch: a capture-phase listener on window (so it runs before the
// app's handlers, wherever they're attached) stops the event from reaching the app when Ctrl is
// held, and — crucially — does NOT preventDefault. With no preventDefault, Chromium emits the native
// context-menu request, so Electron's context-menu event fires and window.js shows our menu. A plain
// right-click is left untouched, so the app's own menus keep working.
(() => {
  if (window.__wrapwebForceMenu) return                     // already installed for this document
  window.__wrapwebForceMenu = true
  window.addEventListener('contextmenu', (e) => {
    if (e.ctrlKey) e.stopImmediatePropagation()
  }, true)
})();
