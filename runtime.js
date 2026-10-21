/*
 * Minimal data runtime for the dashboard page.
 * Loads data/<id>.json for every dataset, then calls every callback registered
 * with dash.onData (once data is in, and again when the window is resized).
 * Provides the small `dash` API the page scripts use: data, calc, onData,
 * colors, setLink.
 */
(function () {
  'use strict';

  var ids = window.DASH_DATASETS || [];
  var store = {};     // id -> rows (once loaded)
  var failed = {};    // id -> error message
  var calcs = {};     // id -> { inputs, fn, value }
  var callbacks = [];

  function rowsOf(json) {
    if (Array.isArray(json)) return json;
    var keys = ['rows', 'data', 'results'];
    for (var i = 0; i < keys.length; i++) if (json && Array.isArray(json[keys[i]])) return json[keys[i]];
    return json;
  }

  function result(status, data, message) {
    var d = data === undefined ? [] : data;
    return {
      status: status,
      data: d,
      rows: d,
      columns: Array.isArray(d) && d.length && typeof d[0] === 'object' ? Object.keys(d[0]) : [],
      message: message || '',
      refreshing: false,
      meta: []
    };
  }

  var dash = {
    // series colours (defined in styles.css, light and dark)
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return 'var(--series-' + n + ')'; }),

    data: function (id) {
      var c = calcs[id];
      if (c) {
        if (c.value === undefined) {
          var ins = c.inputs.map(dash.data);
          if (ins.some(function (x) { return x.status === 'error'; })) return result('error', [], 'An input failed to load.');
          if (ins.some(function (x) { return x.status !== 'ok'; })) return result('loading');
          c.value = c.fn.apply(null, ins.map(function (x) { return x.data; }));
        }
        return result('ok', c.value);
      }
      if (failed[id]) return result('error', [], failed[id]);
      if (id in store) return result('ok', store[id]);
      return result(ids.indexOf(id) >= 0 ? 'loading' : 'missing');
    },

    calc: function (id, opts) { calcs[id] = { inputs: opts.inputs, fn: opts.fn, value: undefined }; },

    onData: function (fn) {
      callbacks.push(fn);
      fn();
    },

    loader: function () {},
    refresh: function () {},
    params: function () { return {}; },
    setParams: function () {},
    resetParams: function () {},

    // remember the open tab in the address bar
    setLink: function (name) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* file:// or sandbox */ }
    }
  };
  window.dash = dash;

  function notify() {
    callbacks.forEach(function (fn) {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  // redraw on width changes
  var raf = 0, lastW = 0;
  window.addEventListener('resize', function () {
    var w = document.documentElement.clientWidth;
    if (w === lastW) return;
    lastW = w;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(notify);
  });

  function showFileWarning() {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0 0 auto 0;z-index:10;padding:12px 16px;background:#fff3cd;color:#533f03;font:14px system-ui,sans-serif;border-bottom:1px solid #e0c36a';
    el.textContent = 'This page loads its data files, so it needs a web server. Run "python3 -m http.server" in this folder and open http://localhost:8000, or publish it with GitHub Pages.';
    document.body.appendChild(el);
  }

  var domReady = new Promise(function (resolve) {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve);
  });

  var loads = ids.map(function (id) {
    return fetch('data/' + id + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) { store[id] = rowsOf(j); })
      .catch(function (e) { failed[id] = String((e && e.message) || e); });
  });

  Promise.all(loads.concat([domReady])).then(function () {
    if (location.protocol === 'file:' && Object.keys(failed).length) showFileWarning();
    notify();
  });
})();
