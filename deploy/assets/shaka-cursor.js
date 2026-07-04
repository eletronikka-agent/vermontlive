(function () {
  if (window.__shakaCursor) return;
  window.__shakaCursor = true;

  function init() {
    var style = document.createElement('style');
    style.textContent =
      '@keyframes shaka-wiggle{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes shaka-pop{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;display:none;animation:shaka-pop 0.25s ease-out';
    var hand = document.createElement('span');
    hand.textContent = '\uD83E\uDD19';
    hand.style.cssText = 'display:block;font-size:36px;line-height:1;transform-origin:50% 50%;animation:shaka-wiggle 3s linear infinite;filter:drop-shadow(0 0 7px rgba(221,181,112,0.85))';
    wrap.appendChild(hand);
    document.body.appendChild(wrap);

    var tx = -100, ty = -100, x = -100, y = -100, shown = false;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; x = tx; y = ty; wrap.style.display = 'block'; }
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      shown = false; wrap.style.display = 'none';
    });
    document.addEventListener('mousedown', function () {
      hand.style.animationDuration = '1.2s';
    });
    document.addEventListener('mouseup', function () {
      hand.style.animationDuration = '3s';
    });

    (function loop() {
      requestAnimationFrame(loop);
      x += (tx - x) * 0.35;
      y += (ty - y) * 0.35;
      wrap.style.transform = 'translate(' + (x - 10) + 'px,' + (y - 8) + 'px)';
    })();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
