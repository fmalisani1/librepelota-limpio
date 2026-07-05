// ==UserScript==
// @name         Streams limpios
// @namespace    local.feder.librepelota
// @version      0.2.2
// @description  Bloquea popups de reproductores deportivos y agrega reproducción limpia en pantalla completa.
// @author       local
// @homepageURL  https://github.com/fmalisani1/librepelota-limpio
// @supportURL   https://github.com/fmalisani1/librepelota-limpio/issues
// @updateURL    https://raw.githubusercontent.com/fmalisani1/librepelota-limpio/main/librepelota-limpio.user.js
// @downloadURL  https://raw.githubusercontent.com/fmalisani1/librepelota-limpio/main/librepelota-limpio.user.js
// @match        https://librepelota.su/*
// @match        https://*.librepelota.su/*
// @match        https://latamvidzfy.org/*
// @match        https://*.latamvidzfy.org/*
// @match        https://esvidzypro.sbs/*
// @match        https://*.sbs/*
// @match        https://rojadirectahd.biz/*
// @match        https://*.rojadirectahd.biz/*
// @match        https://radamel.icu/*
// @match        https://*.radamel.icu/*
// @match        https://zonatvlive.xyz/*
// @match        https://*.zonatvlive.xyz/*
// @match        https://tvcstreams.pl/*
// @match        https://*.tvcstreams.pl/*
// @match        https://tvcstreams.shop/*
// @match        https://*.tvcstreams.shop/*
// @match        https://tutvlive.xyz/*
// @match        https://*.tutvlive.xyz/*
// @match        https://la16hd.com/*
// @match        https://*.la16hd.com/*
// @match        https://la20hd.com/*
// @match        https://*.la20hd.com/*
// @match        https://golazohd.com/*
// @match        https://*.golazohd.com/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const pageWindow = typeof unsafeWindow === 'object' ? unsafeWindow : window;
  const LIBREPELOTA_HOST = /(^|\.)librepelota\.su$/i;
  const ROJADIRECTA_HOST = /(^|\.)rojadirectahd\.biz$/i;
  const PLAYER_HOST = /(^|\.)(latamvidzfy\.org|[a-z0-9-]+\.sbs|radamel\.icu|zonatvlive\.xyz|tvcstreams\.pl|tvcstreams\.shop|tutvlive\.xyz|la16hd\.com|la20hd\.com|golazohd\.com)$/i;
  const TRUSTED_FRAME_HOST = /(^|\.)(latamvidzfy\.org|librepelota\.su|rojadirectahd\.biz|[a-z0-9-]+\.sbs|radamel\.icu|zonatvlive\.xyz|tvcstreams\.pl|tvcstreams\.shop|tutvlive\.xyz|la16hd\.com|la20hd\.com|golazohd\.com)$/i;
  const AD_SCRIPT_HOST = /(^|\.)(acscdn\.com|llvpn\.com|bvtpk\.com|paupsoborofoow\.net|madurird\.com|jnbhi\.com|dtscout\.com|dtscdn\.com|mrktmtrcs\.net|tynt\.com|waust\.at)$/i;
  const AD_STACK_PATTERN = /(acscdn\.com|llvpn\.com|bvtpk\.com|paupsoborofoow\.net|madurird\.com|jnbhi\.com|dtscout\.com|dtscdn\.com|mrktmtrcs\.net|tynt\.com|waust\.at)/i;
  const LOG_PREFIX = '[Streams limpios]';
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
    return /aclib\.runPop|zoneId\s*:|dataset\.zone|data-zone|tag\.min\.js|function\s+qKk\s*\(|cce\s*\(\s*1920\s*\)/.test(code);
  }

  function stackIsAdvertising() {
    try {
      return AD_STACK_PATTERN.test(new Error().stack || '');
    } catch (_) {
      return false;
    }
  }

  function isAdScriptNode(node) {
    if (!(node instanceof Element) || !node.matches('script')) return false;

    if (node.src && AD_SCRIPT_HOST.test(hostOf(node.src))) return true;

    const code = node.textContent || '';
    return /aclib\.runPop|zoneId\s*:|dataset\.zone|data-zone|tag\.min\.js/.test(code);
  }

  function isClickTrapOverlay(node) {
    if (!(node instanceof Element)) return false;
    if (node.id === 'lp-clean-play' || node.closest?.('#lp-clean-play')) return false;
    if (!/^(DIV|SPAN|SECTION|ASIDE|INS)$/i.test(node.tagName)) return false;
    if (node.querySelector('iframe,video,canvas,object,embed,button,a,input,select,textarea')) return false;

    const text = (node.textContent || '').trim();
    if (text) return false;

    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

    const rect = node.getBoundingClientRect();
    const area = rect.width * rect.height;
    const viewportArea = Math.max(1, innerWidth * innerHeight);
    const zIndex = Number.parseInt(style.zIndex, 10) || 0;
    const highZ = zIndex >= 999999 || style.zIndex === '2147483647';
    const large = area > viewportArea * 0.25 || (rect.width > 250 && rect.height > 120);
    const positioned = style.position === 'absolute' || style.position === 'fixed' || style.position === 'sticky';

    return positioned && highZ && large;
  }

  function neutralizeClickTrap(node) {
    if (!isClickTrapOverlay(node)) return false;

    try {
      node.style.setProperty('pointer-events', 'none', 'important');
      node.style.setProperty('display', 'none', 'important');
      node.remove();
      console.info(LOG_PREFIX, 'Capa publicitaria transparente bloqueada.');
      return true;
    } catch (_) {
      return false;
    }
  }

  function installEarlyGuards() {
    const blockedOpen = function () {
      console.info(LOG_PREFIX, 'Popup bloqueado.');
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
          if (INTERACTION_EVENTS.has(String(type).toLowerCase()) && (scriptIsAdvertising() || stackIsAdvertising())) {
            console.info(LOG_PREFIX, 'Capturador publicitario bloqueado:', type);
            return undefined;
          }
          return nativeAddEventListener.call(this, type, listener, options);
        }
      });
    } catch (error) {
      console.warn(LOG_PREFIX, 'No se pudo proteger addEventListener:', error);
    }

    try {
      const proto = pageWindow.Node.prototype;
      const nativeAppendChild = proto.appendChild;
      const nativeInsertBefore = proto.insertBefore;

      Object.defineProperty(proto, 'appendChild', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (node) {
          if (isAdScriptNode(node)) {
            console.info(LOG_PREFIX, 'Script publicitario bloqueado:', node.src || 'inline');
            return node;
          }
          if (neutralizeClickTrap(node)) return node;
          return nativeAppendChild.call(this, node);
        }
      });

      Object.defineProperty(proto, 'insertBefore', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (node, child) {
          if (isAdScriptNode(node)) {
            console.info(LOG_PREFIX, 'Script publicitario bloqueado:', node.src || 'inline');
            return node;
          }
          if (neutralizeClickTrap(node)) return node;
          return nativeInsertBefore.call(this, node, child);
        }
      });
    } catch (error) {
      console.warn(LOG_PREFIX, 'No se pudo proteger inserción de scripts:', error);
    }
  }

  function hostOf(url) {
    try {
      return new URL(url, location.href).hostname;
    } catch (_) {
      return '';
    }
  }

  function isSupportedPage() {
    return LIBREPELOTA_HOST.test(location.hostname) || ROJADIRECTA_HOST.test(location.hostname) || PLAYER_HOST.test(location.hostname);
  }

  function patchIframe(iframe) {
    const host = hostOf(iframe.src);
    if (AD_SCRIPT_HOST.test(host)) {
      iframe.remove();
      return;
    }

    if (PLAYER_HOST.test(host) || TRUSTED_FRAME_HOST.test(host)) {
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

    if (isAdScriptNode(node)) {
      node.remove();
      return;
    }

    if (neutralizeClickTrap(node)) return;

    if (node.matches('iframe')) patchIframe(node);
    node.querySelectorAll('iframe').forEach(patchIframe);

    node.querySelectorAll('div,span,section,aside,ins').forEach(neutralizeClickTrap);

    node.querySelectorAll('script[src]').forEach(script => {
      if (isAdScriptNode(script)) script.remove();
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
        console.info(LOG_PREFIX, 'Enlace publicitario bloqueado:', anchor.href);
      }
    }, true);
  }

  function elementArea(element) {
    if (!(element instanceof Element)) return 0;

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return 0;
    if (rect.width < 120 || rect.height < 80) return 0;

    return rect.width * rect.height;
  }

  function biggestVisible(selector) {
    return Array.from(document.querySelectorAll(selector))
      .map(element => ({ element, area: elementArea(element) }))
      .filter(item => item.area > 0)
      .sort((a, b) => b.area - a.area)[0]?.element || null;
  }

  function getPlayerTargets() {
    const video = biggestVisible('video');
    const visibleIframe = biggestVisible('iframe');
    const visiblePlayer = biggestVisible('#player, .player_div, .iframe-container');
    const playerFromVideo = video?.closest?.('#player, .player_div, .iframe-container');

    return {
      video,
      player: playerFromVideo || video || visibleIframe || visiblePlayer
    };
  }

  function requestPlayerFullscreen(player) {
    try {
      if (!document.fullscreenElement && player.requestFullscreen) {
        return player.requestFullscreen();
      }
      if (player.webkitRequestFullscreen) {
        return player.webkitRequestFullscreen();
      }
    } catch (_) {}
    return undefined;
  }

  function startPlayer(button, userActivated) {
    const { video, player } = getPlayerTargets();
    if (!player) {
      if (button) {
        button.textContent = 'Esperando video...';
        setTimeout(() => { button.textContent = 'Reproducir limpio'; }, 1500);
      }
      return false;
    }

    if (!video) {
      if (!button || !userActivated) return false;

      button.textContent = 'Abriendo...';
      const fullscreenResult = requestPlayerFullscreen(player);
      Promise.resolve(fullscreenResult).catch(() => {});
      setTimeout(() => { button.textContent = 'Pantalla completa'; }, 500);
      return true;
    }

    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    if (button) button.textContent = 'Abriendo...';

    const playResult = Promise.resolve(video.play()).catch(error => {
      if (userActivated) throw error;
      video.muted = true;
      video.setAttribute('muted', '');
      return video.play();
    });

    const fullscreenResult = requestPlayerFullscreen(player);
    Promise.resolve(fullscreenResult).catch(() => {});

    playResult
      .catch(() => {})
      .finally(() => {
        if (!button) return;
        button.textContent = video.paused ? 'Reproducir limpio' : 'Reproduciendo';
      });

    return true;
  }

  function installCleanPlayerButton() {
    if (!PLAYER_HOST.test(location.hostname)) return;

    const addButton = () => {
      if (!document.body || document.getElementById('lp-clean-play')) return;

      const button = document.createElement('button');
      button.id = 'lp-clean-play';
      button.type = 'button';
      button.textContent = 'Reproducir limpio';
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
        startPlayer(button, true);
      }, true);

      document.body.appendChild(button);

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement || !screen.orientation?.lock) return;
        screen.orientation.lock('landscape').catch(() => {});
      });
    };

    const tryAutostart = () => {
      if (!document.body) return;

      const run = () => startPlayer(document.getElementById('lp-clean-play'), false);
      if (run()) return;

      const observer = new MutationObserver(() => {
        if (run()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    const installFirstGestureStart = () => {
      const onFirstGesture = event => {
        if (!startPlayer(document.getElementById('lp-clean-play'), true)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        document.removeEventListener('pointerdown', onFirstGesture, true);
        document.removeEventListener('touchstart', onFirstGesture, true);
        document.removeEventListener('click', onFirstGesture, true);
      };

      document.addEventListener('pointerdown', onFirstGesture, true);
      document.addEventListener('touchstart', onFirstGesture, true);
      document.addEventListener('click', onFirstGesture, true);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        addButton();
        tryAutostart();
        installFirstGestureStart();
      }, { once: true });
    } else {
      addButton();
      tryAutostart();
      installFirstGestureStart();
    }
  }

  if (!isSupportedPage()) return;

  installEarlyGuards();
  installDomCleaner();
  installExternalLinkGuard();
  installCleanPlayerButton();
})();
