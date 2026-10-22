/*
 * Site-wide search for the dashboard.
 * Looks up players, teams, body regions, archetypes, case studies and tabs,
 * and can hand any text to the Injury explorer to search every injury.
 * Press "/" anywhere to jump to the box. Arrow keys move, Enter opens, Esc closes.
 */
(function () {
  'use strict';

  var W = window.NI;
  var input = document.getElementById('gs-q');
  var list = document.getElementById('gs-list');
  var wrap = document.getElementById('gs-wrap');
  if (!W || !input || !list) return;

  var PAGES = [
    { page: 'overview', name: 'Overview', words: 'summary headline seasons months' },
    { page: 'archetypes', name: 'Player archetypes', words: 'archetype position guard wing big rates' },
    { page: 'teams', name: 'Teams & players', words: 'team franchise player table ranking' },
    { page: 'court', name: 'Court & play context', words: 'court zone shot play transition half-court location' },
    { page: 'load', name: 'Timing & workload', words: 'workload rest back-to-back minutes fatigue timing' },
    { page: 'recur', name: 'Re-injury risk', words: 'recurrence re-injury reinjury repeat return' },
    { page: 'cases', name: 'Case studies', words: 'case study replay famous' },
    { page: 'playbook', name: 'Prevention playbook', words: 'prevention playbook staff trainers monitoring exercises' },
    { page: 'explorer', name: 'Injury explorer', words: 'explorer every injury table' },
    { page: 'method', name: 'Method & limits', words: 'method limits sources data attribution' }
  ];

  var MAX_PER_GROUP = 5;
  var items = [];      // flat list of selectable results, in display order
  var active = -1;

  // ---------- text helpers
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 0 = no match; higher is better. Every word typed must appear somewhere.
  function score(hay, words) {
    if (!words.length) return 0;
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var at = hay.indexOf(words[i]);
      if (at < 0) return 0;
      s += at === 0 || hay.charAt(at - 1) === ' ' ? 2 : 1;
    }
    return s;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // text with the typed words highlighted (built from text nodes, never innerHTML)
  function highlighted(text, words) {
    var frag = document.createDocumentFragment();
    var low = text.toLowerCase();
    var marks = [];
    words.forEach(function (w) {
      var from = 0, at;
      while ((at = low.indexOf(w, from)) >= 0) { marks.push([at, at + w.length]); from = at + w.length; }
    });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0;
    marks.forEach(function (m) {
      if (m[1] <= pos) return;
      var s = Math.max(m[0], pos);
      if (s > pos) frag.appendChild(document.createTextNode(text.slice(pos, s)));
      frag.appendChild(el('mark', null, text.slice(s, m[1])));
      pos = m[1];
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  var n0 = function (v) { return Number(v).toLocaleString('en-US'); };
  var plural = function (n, one, many) { return n0(n) + ' ' + (n === 1 ? one : many || one + 's'); };

  // ---------- actions
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function goCase(c) {
    W.showPage('cases');
    var all = document.querySelector('#case-chips button[data-v="All"]');
    if (all && all.getAttribute('aria-pressed') !== 'true') all.click();
    var card = document.getElementById('case-' + c.id);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.add('gs-flash');
      setTimeout(function () { card.classList.remove('gs-flash'); }, 1800);
    }
  }

  function choose(item) {
    close();
    input.blur();
    item.run();
    if (item.scroll !== false) {
      var tabs = document.getElementById('tabs');
      if (tabs && item.kind !== 'case') tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---------- search
  function search(raw) {
    var q = norm(raw);
    var words = q ? q.split(' ') : [];
    var groups = [];
    if (!words.length) return { groups: groups, words: words };

    var players = W.get('players') || [];
    var teams = W.get('teams') || [];
    var regions = W.get('by_region') || [];
    var archs = W.get('by_archetype') || [];
    var cases = W.get('cases') || [];

    function top(rows, pick, make) {
      var scored = [];
      rows.forEach(function (r) {
        var s = score(norm(pick(r)), words);
        if (s) scored.push({ r: r, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s || (b.r.injuries || 0) - (a.r.injuries || 0); });
      return { total: scored.length, rows: scored.slice(0, MAX_PER_GROUP).map(function (x) { return make(x.r); }) };
    }

    var g;

    g = top(players, function (p) { return p.player; }, function (p) {
      var bits = [p.team, p.archetype, plural(p.injuries, 'injury', 'injuries')].filter(Boolean);
      return { kind: 'player', title: p.player, sub: bits.join(' · '), run: function () { W.explore({ q: p.player.toLowerCase() }); } };
    });
    if (g.rows.length) groups.push({ name: 'Players', rows: g.rows, more: g.total - g.rows.length });

    g = top(teams, function (t) { return t.team_name + ' ' + t.team_code; }, function (t) {
      return { kind: 'team', title: t.team_name, sub: plural(t.injuries, 'injury', 'injuries') + ' · most often ' + String(t.top_region || '').toLowerCase(), run: function () { W.explore({ team: t.team_name }); } };
    });
    if (g.rows.length) groups.push({ name: 'Teams', rows: g.rows });

    g = top(regions, function (r) { return r.region; }, function (r) {
      return { kind: 'region', title: r.region, sub: plural(r.total, 'injury', 'injuries') + ' · median ' + r.median_games_missed + ' games missed', run: function () { W.explore({ region: r.region }); } };
    });
    var arch = top(archs, function (a) { return a.archetype; }, function (a) {
      return { kind: 'arch', title: a.archetype, sub: plural(a.injuries, 'injury', 'injuries') + ' · player archetype', run: function () { W.explore({ arch: a.archetype }); } };
    });
    var rows = g.rows.concat(arch.rows);
    if (rows.length) groups.push({ name: 'Body regions & archetypes', rows: rows });

    g = top(cases, function (c) { return c.player + ' ' + c.injury + ' ' + c.region; }, function (c) {
      return { kind: 'case', title: c.player + ': ' + c.injury, sub: 'Case study · ' + c.region, run: function () { goCase(c); } };
    });
    if (g.rows.length) groups.push({ name: 'Case studies', rows: g.rows });

    var pages = [];
    PAGES.forEach(function (p) {
      var s = score(norm(p.name + ' ' + p.words), words);
      if (s) pages.push({ kind: 'page', title: p.name, sub: 'Open this tab', run: function () { W.showPage(p.page); }, s: s });
    });
    pages.sort(function (a, b) { return b.s - a.s; });
    if (pages.length) groups.push({ name: 'Tabs', rows: pages.slice(0, 4) });

    // any text can also be looked up across every injury record (same matching as the Injury explorer)
    var text = raw.trim().toLowerCase();
    var terms = text.split(/\s+/);
    var injuries = W.get('injuries');
    var n = 0;
    if (injuries) {
      for (var i = 0; i < injuries.length; i++) {
        var r = injuries[i];
        var hay = (r.player + ' ' + (r.team_name || r.team) + ' ' + r.desc).toLowerCase();
        var all = true;
        for (var k = 0; k < terms.length; k++) if (hay.indexOf(terms[k]) < 0) { all = false; break; }
        if (all) n++;
      }
    }
    if (!injuries || n > 0) {
      groups.push({
        name: 'All injuries',
        rows: [{
          kind: 'injuries',
          title: 'Search every injury for \u201c' + raw.trim() + '\u201d',
          sub: injuries ? plural(n, 'matching injury', 'matching injuries') + ' in the Injury explorer' : 'Open the Injury explorer',
          run: function () { W.explore({ q: text }); }
        }]
      });
    }

    return { groups: groups, words: words };
  }

  // ---------- render
  function render() {
    var res = search(input.value);
    list.replaceChildren();
    items = [];
    active = -1;
    if (!res.groups.length) {
      if (!res.words.length) { close(); return; }
      list.appendChild(el('div', 'gs-more', 'No matches for \u201c' + input.value.trim() + '\u201d. Try a last name, a team, or a body part.'));
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    res.groups.forEach(function (g) {
      var head = el('div', 'gs-head', g.name);
      head.setAttribute('role', 'presentation');
      list.appendChild(head);
      g.rows.forEach(function (row) {
        var li = el('div', 'gs-item');
        li.id = 'gs-opt-' + items.length;
        li.setAttribute('role', 'option');
        var t = el('span', 'gs-title');
        t.appendChild(highlighted(row.title, res.words));
        li.appendChild(t);
        li.appendChild(el('span', 'gs-sub', row.sub));
        var idx = items.length;
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(items[idx]); });
        li.addEventListener('mousemove', function () { if (active !== idx) setActive(idx); });
        items.push({ kind: row.kind, run: row.run, node: li, scroll: row.kind !== 'case' });
        list.appendChild(li);
      });
      if (g.more > 0) list.appendChild(el('div', 'gs-more', '+ ' + n0(g.more) + ' more. Keep typing to narrow it down.'));
    });

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(0);
  }

  function setActive(i) {
    if (active >= 0 && items[active]) { items[active].node.classList.remove('is-active'); items[active].node.removeAttribute('aria-selected'); }
    active = i;
    if (i >= 0 && items[i]) {
      items[i].node.classList.add('is-active');
      items[i].node.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', items[i].node.id);
      items[i].node.scrollIntoView({ block: 'nearest' });
    }
  }

  // ---------- events
  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) { render(); }
      if (!items.length) return;
      e.preventDefault();
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (e.key === 'Enter') {
      if (!list.hidden && items[active]) { e.preventDefault(); choose(items[active]); }
    } else if (e.key === 'Escape') {
      if (!list.hidden) close(); else { input.value = ''; input.blur(); }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (document.activeElement && document.activeElement.isContentEditable)) return;
    e.preventDefault();
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
    input.select();
  });
})();
