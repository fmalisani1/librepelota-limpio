// ==UserScript==
// @name         LibrePelota limpio
// @namespace    local.feder.librepelota
// @version      0.1.0
// @description  Bloquea popups del reproductor y agrega reproducción limpia en pantalla completa.
// @author       local
// @homepageURL  https://github.com/fmalisani1/librepelota-limpio
// @supportURL   https://github.com/fmalisani1/librepelota-limpio/issues
// @updateURL    https://raw.githubusercontent.com/fmalisani1/librepelota-limpio/main/librepelota-limpio.user.js
// @downloadURL  https://raw.githubusercontent.com/fmalisani1/librepelota-limpio/main/librepelota-limpio.user.js
// @match        https://librepelota.su/*
// @match        https://*.librepelota.su/*
// @match        https://latamvidzfy.org/*
// @match        https://*.latamvidzfy.org/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const pageWindow = typeof unsafeWindow === 'object' ? unsafeWindow : window;
  const PLAYER_HOST = /(^|\.)latamvidzfy\.org$/i;
  const TRUSTED_FRAME_HOST = /(^|\.)(latamvidzfy\.org|librepelota\.su)$/i;
  const AD_SCRIPT_HOST = /(^|\.)acscdn\.com$/i;
  const INTERACTION_EVENTS = new Set([
    'auxclick', 'click', 'dblclick', 'mousedown', 'mouseup',
    'pointerdown', 'pointerup', 'touchstart', 'touchend'
  ]);

  function scriptIsAdvertising() {
    const script = document.currentScript;
    if (!script) return false;

    if (script.src) {
      try {
        return AD_SCRIPT_HOST.test(new URL(script.src, location.href).hostname);
      } catch (_) {
        return false;
      }
    }

    const code = script.textContent || '';
    return /aclib\.runPop|zoneId\s*:|function\s+qKk\s*\(|cce\s*\(\s*1920\s*\)/.test(code);
  }

  function installEarlyGuards() {
    const blockedOpen = function () {
      console.info('[LibrePelota limpio] Popup bloqueado.');
      return null;
    };

    try {
      Object.defineProperty(pageWindow, 'open', {
        configurable: false,
        enumerable: true,
        writable: false,
        value: blockedOpen
      });
    } catch (_) {
      try { pageWindow.open = blockedOpen; } catch (_) {}
    }

    const aclibStub = Object.freeze({
      runPop: () => null,
      runBanner: () => null,
      runInterstitial: () => null
    });

    try {
      Object.defineProperty(pageWindow, 'aclib', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: aclibStub
      });
    } catch (_) {}

    try {
      const proto = pageWindow.EventTarget.prototype;
      const nativeAddEventListener = proto.addEventListener;

      Object.defineProperty(proto, 'addEventListener', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (type, listener, options) {
          if (INTERACTION_EVENTS.has(String(type).toLowerCase()) && scriptIsAdvertising()) {
            console.info('[LibrePelota limpio] Capturador publicitario bloqueado:', type);
            return undefined;
          }
          return nativeAddEventListener.call(this, type, listener, options);
        }
      });
    } catch (error) {
      console.warn('[LibrePelota limpio] No se pudo proteger addEventListener:', error);
    }
  }

  function hostOf(url) {
    try {
      return new URL(url, location.href).hostname;
    } catch (_) {
      return '';
    }
  }

  function patchIframe(iframe) {
    const host = hostOf(iframe.src);
    if (!TRUSTED_FRAME_HOST.test(host)) {
      iframe.remove();
      return;
    }

    if (PLAYER_HOST.test(host)) {
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('webkitallowfullscreen', '');

      const permissions = new Set(
        (iframe.getAttribute('allow') || '')
          .split(';')
          .map(value => value.trim())
          .filter(Boolean)
      );
      permissions.add('autoplay');
      permissions.add('encrypted-media');
      permissions.add('fullscreen');
      iframe.setAttribute('allow', Array.from(permissions).join('; '));
    }
  }

  function cleanNode(node) {
    if (!(node instanceof Element)) return;

    if (node.matches('script[src]') && AD_SCRIPT_HOST.test(hostOf(node.src))) {
      node.remove();
      return;
    }

    if (node.matches('iframe')) patchIframe(node);
    node.querySelectorAll('iframe').forEach(patchIframe);

    node.querySelectorAll('script[src]').forEach(script => {
      if (AD_SCRIPT_HOST.test(hostOf(script.src))) script.remove();
    });
  }

  function installDomCleaner() {
    const start = () => {
      cleanNode(document.documentElement);

      const observer = new MutationObserver(records => {
        for (const record of records) {
          record.addedNodes.forEach(cleanNode);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.documentElement) start();
    else new MutationObserver((_, observer) => {
      if (!document.documentElement) return;
      observer.disconnect();
      start();
    }).observe(document, { childList: true });
  }

  function installExternalLinkGuard() {
    if (!PLAYER_HOST.test(location.hostname)) return;

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!anchor) return;

      const destinationHost = hostOf(anchor.href);
      if (destinationHost && destinationHost !== location.hostname) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.info('[LibrePelota limpio] Enlace publicitario bloqueado:', anchor.href);
      }
    }, true);
  }

  function installCleanPlayerButton() {
    if (!PLAYER_HOST.test(location.hostname)) return;

    const addButton = () => {
      if (!document.body || document.getElementById('lp-clean-play')) return;

      const button = document.createElement('button');
      button.id = 'lp-clean-play';
      button.type = 'button';
      button.textContent = '▶ Reproducir limpio';
      button.setAttribute('aria-label', 'Reproducir y abrir en pantalla completa');
      button.style.cssText = [
        'position:fixed',
        'left:12px',
        'top:12px',
        'z-index:2147483647',
        'padding:10px 14px',
        'border:0',
        'border-radius:999px',
        'background:#16a34a',
        'color:#fff',
        'font:600 14px/1.2 system-ui,sans-serif',
        'box-shadow:0 2px 12px rgba(0,0,0,.45)',
        'cursor:pointer',
        'touch-action:manipulation'
      ].join(';');

      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const video = document.querySelector('video');
        const player = document.getElementById('player') || video;
        if (!video || !player) {
          button.textContent = 'Esperando video…';
          setTimeout(() => { button.textContent = '▶ Reproducir limpio'; }, 1500);
          return;
        }

        button.textContent = 'Abriendo…';

        // Ambas llamadas se hacen directamente dentro del toque para conservar
        // la activación exigida por Chrome y Firefox.
        const playResult = video.play();
        let fullscreenResult;
        try {
          if (!document.fullscreenElement && player.requestFullscreen) {
            fullscreenResult = player.requestFullscreen();
          } else if (player.webkitRequestFullscreen) {
            fullscreenResult = player.webkitRequestFullscreen();
          }
        } catch (_) {}

        Promise.resolve(playResult).catch(() => {});
        Promise.resolve(fullscreenResult).catch(() => {});

        setTimeout(() => {
          button.textContent = video.paused ? '▶ Reproducir limpio' : '✓ Reproduciendo';
        }, 500);
      }, true);

      document.body.appendChild(button);

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement || !screen.orientation?.lock) return;
        screen.orientation.lock('landscape').catch(() => {});
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addButton, { once: true });
    } else {
      addButton();
    }
  }

  installEarlyGuards();
  installDomCleaner();
  installExternalLinkGuard();
  installCleanPlayerButton();
})();
