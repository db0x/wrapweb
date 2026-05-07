(function () {
  var n = 0;
  var t = setInterval(function () {
    if (++n > 60) { clearInterval(t); return; }
    var btn = Array.from(document.querySelectorAll('button.btn.btn-primary'))
      .find(function (b) { return b.textContent.includes('Neue E-Mail'); });
    if (!btn) return;
    clearInterval(t);
    btn.click();
  }, 400);
})();
