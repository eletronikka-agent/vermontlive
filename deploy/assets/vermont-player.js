(function () {
  if (customElements.get('vermont-player')) return;

  const PLAYLIST = 'PLqvfvAz4C2G81M1qO-i6XskTjjrtrskHy';
  const KEY_VIDEO = 'vmt-player-video-open';

  // carrega a IFrame API do YouTube uma vez
  let apiReady = null;
  function loadAPI() {
    if (apiReady) return apiReady;
    apiReady = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return apiReady;
  }

  class VermontPlayer extends HTMLElement {
    connectedCallback() {
      const videoOpen = localStorage.getItem(KEY_VIDEO) === '1';
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host { position: fixed; left: 0; right: 0; bottom: 0; z-index: 90; font-family: 'Archivo', sans-serif; }
          * { box-sizing: border-box; }
          .wrap { display: flex; flex-direction: column; }
          .videoPanel { align-self: flex-end; margin-right: 28px; width: min(480px, calc(100vw - 40px));
                        border: 1px solid rgba(221,181,112,0.35); border-bottom: none; border-radius: 8px 8px 0 0;
                        overflow: hidden; background: #000; box-shadow: 0 -18px 60px rgba(0,0,0,0.65);
                        transition: max-height 0.45s cubic-bezier(0.22,1,0.36,1); max-height: 0; }
          .videoPanel.open { max-height: 270px; }
          .videoPanel .frame { width: 100%; aspect-ratio: 16/9; display: block; }
          .bar { position: relative; display: flex; align-items: center; gap: 22px; padding: 0 28px; height: 74px;
                 background: linear-gradient(180deg, rgba(14,16,19,0.96), rgba(9,11,13,0.99));
                 backdrop-filter: blur(14px); border-top: 1px solid rgba(221,181,112,0.4); }
          .progress { position: absolute; top: -1px; left: 0; height: 2px; width: 100%; background: rgba(236,237,235,0.08); cursor: pointer; }
          .progress .fill { height: 100%; width: 0%; background: linear-gradient(90deg, #C9A05C, #FFE9C4);
                            box-shadow: 0 0 12px rgba(221,181,112,0.9); transition: width 0.3s linear; }
          .brand { display: flex; align-items: center; gap: 16px; min-width: 0; flex: 1.8; }
          .brand-logo { height: 24px; width: auto; display: block; flex: none; opacity: 0.95; filter: drop-shadow(0 0 8px rgba(221,181,112,0.55)); }
          .eq { display: flex; align-items: center; gap: 4px; height: 46px; flex: 0.9; justify-content: center; min-width: 0; overflow: hidden; }
          .eq span { width: 3px; height: 10%; border-radius: 999px; flex: none;
                     background: linear-gradient(180deg, #FFE9C4, #C9A05C 55%, #7a5c2e);
                     box-shadow: 0 0 10px rgba(221,181,112,0.4); animation: eq-idle 3s ease-in-out infinite; }
          .playing .eq span { animation-name: eq; }
          @keyframes eq-idle { 0%,100% { height: 10%; } 50% { height: 34%; } }
          @keyframes eq { 0%,100% { height: 14%; } 50% { height: 96%; } }
          @media (max-width: 1240px) { .eq { display: none; } }
          .meta { display: flex; align-items: baseline; gap: 8px; min-width: 0; flex: 1; }
          .track-label { font-family: 'Unbounded', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; color: #C9A05C; white-space: nowrap; flex: none; }
          .tag-logo { height: 14px; width: auto; display: block; align-self: flex-start; opacity: 0.9; filter: drop-shadow(0 0 6px rgba(221,181,112,0.5)); }
          .titleClip { flex: 1; min-width: 0; overflow: hidden; }
          .title { font-family: 'Unbounded', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 0.03em; color: #ECEDEB; white-space: nowrap; display: inline-block; }
          .titleClip.scroll .title { animation: title-scroll 12s linear infinite; padding-right: 60px; }
          @keyframes title-scroll { 0%, 12% { transform: translateX(0); } 88%, 100% { transform: translateX(calc(-100% + var(--clip-w, 200px))); } }
          .controls { display: flex; align-items: center; gap: 8px; flex: none; }
          .btn { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px;
                 border-radius: 999px; border: 1px solid rgba(236,237,235,0.15); background: none; color: #ECEDEB;
                 cursor: pointer; transition: all 0.25s ease; }
          .btn:hover { border-color: #C9A05C; color: #DDB570; transform: translateY(-2px); }
          .btn.play { width: 52px; height: 52px; background: linear-gradient(135deg, #DDB570, #C9A05C); color: #0F1113;
                      border: none; box-shadow: 0 0 22px rgba(221,181,112,0.4); }
          .btn.play:hover { box-shadow: 0 0 34px rgba(221,181,112,0.7); transform: translateY(-2px) scale(1.04); }
          .btn svg { display: block; }
          .side { display: flex; align-items: center; gap: 8px; flex: none; }
          .toggleVideo { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: 0.18em;
                         color: #9BA1A3; background: none; border: 1px solid rgba(236,237,235,0.15); border-radius: 999px;
                         padding: 9px 16px; cursor: pointer; transition: all 0.25s ease; white-space: nowrap; }
          .toggleVideo:hover { color: #DDB570; border-color: #C9A05C; }
          .hideBtn { width: 36px; height: 36px; color: #9BA1A3; }
          .wrap { transition: transform 0.45s cubic-bezier(0.22,1,0.36,1); }
          .wrap.hidden { transform: translateY(calc(100% + 2px)); }
          .pill { position: absolute; right: 24px; bottom: 100%; margin-bottom: 0; display: none; align-items: center; gap: 9px;
                  background: linear-gradient(135deg, #DDB570, #C9A05C); color: #0F1113; border: none; border-radius: 999px 999px 0 0;
                  padding: 9px 18px 7px; cursor: pointer; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700;
                  letter-spacing: 0.16em; box-shadow: 0 -6px 24px rgba(221,181,112,0.35); }
          :host(.player-hidden) .pill { display: inline-flex; }
          .pill svg { display: block; }
          @media (max-width: 760px) { .toggleVideo { display: none; } .title { max-width: 34vw; } .bar { gap: 12px; padding: 0 16px; } }
        </style>
        <button class="pill" id="show" aria-label="Mostrar player"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>PLAYER</button>
        <div class="wrap" id="wrap">
          <div class="videoPanel ${videoOpen ? 'open' : ''}"><div class="frame" id="yt"></div></div>
          <div class="bar" id="bar">
            <div class="progress" id="progress"><div class="fill" id="fill"></div></div>
            <div class="brand">
              <img class="brand-logo" src="assets/logo-white.png" alt="Vermont">
              <div class="meta">
                <span class="track-label">Track :</span><div class="titleClip" id="titleClip"><span class="title" id="title">Carregando playlist…</span></div>
              </div>
            </div>
            <div class="eq" id="eq"></div>
            <div class="controls">
              <button class="btn" id="prev" aria-label="Anterior"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.5v14H6zM20 5v14l-10-7z"/></svg></button>
              <button class="btn play" id="play" aria-label="Tocar/Pausar"><svg id="iconPlay" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg></button>
              <button class="btn" id="next" aria-label="Próxima"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 5h-2.5v14H18zM4 5v14l10-7z"/></svg></button>
            </div>
            <div class="side">
              <button class="btn hideBtn" id="hide" aria-label="Esconder player" title="Esconder player"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>
              <button class="toggleVideo" id="tv">${videoOpen ? 'OCULTAR VÍDEO ▾' : 'VER VÍDEO ▴'}</button>
            </div>
          </div>
        </div>`;

      const $ = (id) => this.shadowRoot.getElementById(id);
      const eq = this.shadowRoot.getElementById('eq');
      const titleClip = this.shadowRoot.getElementById('titleClip');
      const checkScroll = () => {
        const t = this.shadowRoot.getElementById('title');
        titleClip.classList.remove('scroll');
        requestAnimationFrame(() => {
          if (t.scrollWidth > titleClip.clientWidth + 4) {
            titleClip.style.setProperty('--clip-w', titleClip.clientWidth + 'px');
            titleClip.classList.add('scroll');
          }
        });
      };
      new MutationObserver(checkScroll).observe(this.shadowRoot.getElementById('title'), { childList: true, characterData: true, subtree: true });
      window.addEventListener('resize', checkScroll);
      for (let i = 0; i < 16; i++) {
        const s = document.createElement('span');
        const center = 1 - Math.abs(i - 7.5) / 7.5; // mais alto no meio
        s.style.animationDuration = (0.6 + Math.random() * 0.6).toFixed(2) + 's';
        s.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
        s.style.opacity = (0.45 + center * 0.55).toFixed(2);
        eq.appendChild(s);
      }
      const bar = $('bar'), title = $('title'), fill = $('fill');
      const iconPause = '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>';
      const iconPlay = '<svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
      let player = null, playing = false;

      loadAPI().then((YT) => {
        player = new YT.Player($('yt'), {
          playerVars: { listType: 'playlist', list: PLAYLIST, rel: 0, playsinline: 1 },
          events: {
            onReady: () => { try { title.textContent = player.getVideoData().title || 'Vermont — Playlist'; } catch (e) {} },
            onStateChange: (e) => {
              playing = e.data === YT.PlayerState.PLAYING;
              bar.classList.toggle('playing', playing);
              $('play').innerHTML = playing ? iconPause : iconPlay;
              try { const d = player.getVideoData(); if (d && d.title) title.textContent = d.title; } catch (er) {}
            }
          }
        });
        setInterval(() => {
          if (!player || !player.getDuration) return;
          try {
            const d = player.getDuration(), c = player.getCurrentTime();
            if (d > 0) fill.style.width = ((c / d) * 100).toFixed(1) + '%';
          } catch (e) {}
        }, 1000);
      });

      $('play').addEventListener('click', () => { if (!player) return; playing ? player.pauseVideo() : player.playVideo(); });
      $('next').addEventListener('click', () => player && player.nextVideo());
      $('prev').addEventListener('click', () => player && player.previousVideo());
      $('progress').addEventListener('click', (e) => {
        if (!player || !player.getDuration) return;
        const r = e.currentTarget.getBoundingClientRect();
        try { player.seekTo(player.getDuration() * ((e.clientX - r.left) / r.width), true); } catch (er) {}
      });
      $('tv').addEventListener('click', () => {
        const panel = this.shadowRoot.querySelector('.videoPanel');
        const open = panel.classList.toggle('open');
        $('tv').textContent = open ? 'OCULTAR VÍDEO ▾' : 'VER VÍDEO ▴';
        try { localStorage.setItem(KEY_VIDEO, open ? '1' : '0'); } catch (e) {}
      });

      const wrap = $('wrap');
      const KEY_HIDE = 'vmt-player-hidden';
      const setHidden = (h) => {
        wrap.classList.toggle('hidden', h);
        this.classList.toggle('player-hidden', h);
        document.body.style.paddingBottom = h ? '0px' : '74px';
        try { localStorage.setItem(KEY_HIDE, h ? '1' : '0'); } catch (e) {}
        if (h && player && playing) { try { player.pauseVideo(); } catch (e) {} }
      };
      $('hide').addEventListener('click', () => setHidden(true));
      $('show').addEventListener('click', () => setHidden(false));
      if (localStorage.getItem(KEY_HIDE) === '1') setHidden(true);

      document.body.style.paddingBottom = wrap.classList.contains('hidden') ? '0px' : '74px';
    }
  }
  customElements.define('vermont-player', VermontPlayer);

  const mount = () => { if (!document.querySelector('vermont-player')) document.body.appendChild(document.createElement('vermont-player')); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
