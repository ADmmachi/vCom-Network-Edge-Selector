(function() {
  var inspectEnabled = false;
  var highlightEl = null;

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var path = [];
    while (el && el.nodeType === 1) {
      if (el.id) {
        path.unshift('#' + el.id);
        break;
      }
      var tag = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        var classes = el.className.trim().split(/\s+/).filter(function(c) {
          return c && !c.startsWith('hover') && !c.startsWith('focus');
        });
        if (classes.length > 0) {
          path.unshift(tag + '.' + classes.join('.'));
          break;
        }
      }
      var parent = el.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) {
          return c.tagName === el.tagName;
        });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(el) + 1;
          path.unshift(tag + ':nth-of-type(' + idx + ')');
        } else {
          path.unshift(tag);
        }
      } else {
        path.unshift(tag);
      }
      el = parent;
    }
    return path.join(' > ');
  }

  function getAncestorPath(el, depth) {
    var parts = [];
    var current = el;
    for (var i = 0; i < (depth || 3); i++) {
      if (!current || current === document.documentElement) break;
      parts.unshift(current.tagName.toLowerCase());
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function getRect(el) {
    var r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function getSnippet(el) {
    var clone = el.cloneNode(true);
    // Truncate deep children
    var children = clone.querySelectorAll('*');
    for (var i = 0; i < children.length; i++) {
      if (children[i].children.length > 0) {
        children[i].innerHTML = '...';
      }
    }
    var html = clone.outerHTML;
    return html.length > 500 ? html.slice(0, 500) + '...' : html;
  }

  function onHover(e) {
    if (!inspectEnabled) return;
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    window.parent.postMessage({
      type: 'devs:hover',
      payload: {
        rect: getRect(el),
        tagName: el.tagName.toLowerCase(),
        selector: getSelector(el)
      }
    }, '*');
  }

  function onHoverOut() {
    if (!inspectEnabled) return;
    window.parent.postMessage({ type: 'devs:hover-out' }, '*');
  }

  function onClick(e) {
    if (!inspectEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    var textContent = (el.textContent || '').trim();
    window.parent.postMessage({
      type: 'devs:select',
      payload: {
        selector: getSelector(el),
        tagName: el.tagName.toLowerCase(),
        className: el.className || '',
        id: el.id || '',
        textContent: textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent,
        htmlSnippet: getSnippet(el),
        rect: getRect(el),
        ancestorPath: getAncestorPath(el, 3)
      }
    }, '*');
  }

  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'devs:enable-inspect') {
      inspectEnabled = true;
      document.body.style.cursor = 'crosshair';
    } else if (e.data.type === 'devs:disable-inspect') {
      inspectEnabled = false;
      document.body.style.cursor = '';
    } else if (e.data.type === 'devs:setup-touch' && !window.__devsTouchSetup) {
      window.__devsTouchSetup = true;
      document.addEventListener('touchstart', function(te) {
        if (!inspectEnabled) return;
        var t = te.touches[0]; if (!t) return;
        var el = document.elementFromPoint(t.clientX, t.clientY);
        if (!el || el === document.body || el === document.documentElement) return;
        te.preventDefault();
        window.parent.postMessage({ type: 'devs:hover', payload: { rect: getRect(el), tagName: el.tagName.toLowerCase(), selector: getSelector(el) } }, '*');
      }, { capture: true, passive: false });
      document.addEventListener('touchend', function(te) {
        if (!inspectEnabled) return;
        var t = te.changedTouches[0]; if (!t) return;
        var el = document.elementFromPoint(t.clientX, t.clientY);
        if (!el || el === document.body || el === document.documentElement) return;
        te.preventDefault();
        var tc = (el.textContent || '').trim();
        window.parent.postMessage({ type: 'devs:select', payload: { selector: getSelector(el), tagName: el.tagName.toLowerCase(), className: el.className || '', id: el.id || '', textContent: tc.length > 100 ? tc.slice(0, 100) + '...' : tc, htmlSnippet: getSnippet(el), rect: getRect(el), ancestorPath: getAncestorPath(el, 3) } }, '*');
      }, { capture: true, passive: false });
    } else if (e.data.type === 'devs:ping') {
      window.parent.postMessage({ type: 'devs:pong' }, '*');
    } else if (e.data.type === 'devs:db-query') {
      var queryId = e.data.queryId;
      var sql = e.data.sql;
      (function() {
        var pglite = window.__devs_pglite;
        if (!pglite) {
          // Try to dynamically import PGlite and open the IDB database
          import('@electric-sql/pglite').then(function(mod) {
            var client = new mod.PGlite('idb://app-db');
            window.__devs_pglite = client;
            return client.waitReady ? client.waitReady.then(function() { return client; }) : client;
          }).then(function(client) {
            return client.query(sql);
          }).then(function(result) {
            window.parent.postMessage({ type: 'devs:db-result', queryId: queryId, rows: result.rows, fields: result.fields ? result.fields.map(function(f) { return f.name; }) : [] }, '*');
          }).catch(function(err) {
            window.parent.postMessage({ type: 'devs:db-result', queryId: queryId, error: String(err.message || err) }, '*');
          });
          return;
        }
        var ready = pglite.waitReady ? pglite.waitReady : Promise.resolve();
        ready.then(function() {
          return pglite.query(sql);
        }).then(function(result) {
          window.parent.postMessage({ type: 'devs:db-result', queryId: queryId, rows: result.rows, fields: result.fields ? result.fields.map(function(f) { return f.name; }) : [] }, '*');
        }).catch(function(err) {
          window.parent.postMessage({ type: 'devs:db-result', queryId: queryId, error: String(err.message || err) }, '*');
        });
      })();
    }
  });

  document.addEventListener('mouseover', onHover, true);
  document.addEventListener('mouseout', onHoverOut, true);
  document.addEventListener('click', onClick, true);

  // Touch support for mobile inspect
  window.__devsTouchSetup = true;
  document.addEventListener('touchstart', function(e) {
    if (!inspectEnabled) return;
    var touch = e.touches[0];
    if (!touch) return;
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || el === document.body || el === document.documentElement) return;
    e.preventDefault();
    window.parent.postMessage({
      type: 'devs:hover',
      payload: {
        rect: getRect(el),
        tagName: el.tagName.toLowerCase(),
        selector: getSelector(el)
      }
    }, '*');
  }, { capture: true, passive: false });

  document.addEventListener('touchend', function(e) {
    if (!inspectEnabled) return;
    var touch = e.changedTouches[0];
    if (!touch) return;
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || el === document.body || el === document.documentElement) return;
    e.preventDefault();
    var textContent = (el.textContent || '').trim();
    window.parent.postMessage({
      type: 'devs:select',
      payload: {
        selector: getSelector(el),
        tagName: el.tagName.toLowerCase(),
        className: el.className || '',
        id: el.id || '',
        textContent: textContent.length > 100 ? textContent.slice(0, 100) + '...' : textContent,
        htmlSnippet: getSnippet(el),
        rect: getRect(el),
        ancestorPath: getAncestorPath(el, 3)
      }
    }, '*');
  }, { capture: true, passive: false });

  // Forward console output to parent for the Logs panel
  var _origLog = console.log;
  var _origWarn = console.warn;
  var _origError = console.error;
  var _origInfo = console.info;

  function forwardConsole(level, args) {
    try {
      var parts = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        parts.push(typeof a === 'string' ? a : JSON.stringify(a));
      }
      window.parent.postMessage({
        type: 'devs:console',
        level: level,
        text: parts.join(' ')
      }, '*');
    } catch (e) { /* ignore serialization errors */ }
  }

  console.log = function() { forwardConsole('log', arguments); return _origLog.apply(console, arguments); };
  console.warn = function() { forwardConsole('warn', arguments); return _origWarn.apply(console, arguments); };
  console.error = function() { forwardConsole('error', arguments); return _origError.apply(console, arguments); };
  console.info = function() { forwardConsole('info', arguments); return _origInfo.apply(console, arguments); };

  // Forward unhandled errors
  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'devs:console',
      level: 'error',
      text: '[Runtime Error] ' + (e.message || String(e.error))
    }, '*');
  });

  window.addEventListener('unhandledrejection', function(e) {
    window.parent.postMessage({
      type: 'devs:console',
      level: 'error',
      text: '[Unhandled Promise] ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))
    }, '*');
  });
})();