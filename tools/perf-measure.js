/*
 * gv-science LIFF 読み込み速度 計測ハーネス
 * ───────────────────────────────────────────────────────────────
 * Claude in Chrome（または DevTools コンソール）で、実際に動いている LIFF
 * ページのコンテキストに貼り付けて使う。アプリ自身が叩いている GAS（proxy）
 * エンドポイントと id_token を performance のリソースlog から自動検出し、
 *   - データ取得時間（home / scores）の warm / cold（fresh=1）
 *   - 画面が描画されるまでの時間（DOM 出現計測）
 * を実測する。信頼する指標は「fetch promise の実測 ms」（= 先生用ダッシュボードの
 * 教訓 §7 と同じ）。背景タブはタイマーがスロットルされるため必ず前面で実行する。
 *
 * 使い方（コンソール）:
 *   1) LIFF アプリでホームを 1 回表示しておく（自動検出のため）
 *   2) この内容を貼り付けて実行 → window.gvPerf / gvPerfPaint が生える
 *   3) await gvPerf()                 … home/scores の warm を各 5 回計測
 *      await gvPerf({ cold:true })     … コールド(fresh=1, 全再計算)も計測（サーバ負荷高）
 *      await gvPerf({ runs:8, gapMs:600 })
 *      await gvPerfPaint('.c-today')    … 「今から」ホーム本体が出るまでの ms（遷移直前に呼ぶ）
 *      await gvPerfPaint('.gt-fade')    … 成績本体が出るまで（成績タップ直前に呼ぶ）
 */
(function () {
  'use strict';

  function stats(a) {
    a = a.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    var q = function (p) { return a[Math.min(n - 1, Math.round(p * (n - 1)))]; };
    var mean = a.reduce(function (s, x) { return s + x; }, 0) / n;
    var r = function (v) { return Math.round(v); };
    return { n: n, min: r(a[0]), median: r(q(0.5)), p95: r(q(0.95)), max: r(a[n - 1]), mean: r(mean) };
  }

  /** アプリが実際に叩いた /exec or proxy の URL から base と token を取り出す */
  function detect() {
    var ents = performance.getEntriesByType('resource');
    for (var i = ents.length - 1; i >= 0; i--) {
      var u = ents[i].name;
      if (/[?&]action=/.test(u) && /(\/exec|workers\.dev)/.test(u)) {
        try {
          var url = new URL(u);
          var token = url.searchParams.get('token');
          return { base: url.origin + url.pathname, token: token };
        } catch (e) { /* skip */ }
      }
    }
    return null;
  }

  function buildUrl(base, token, action, params) {
    var u = new URL(base);
    u.searchParams.set('action', action);
    if (token) u.searchParams.set('token', token);
    if (params) Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
    return u.toString();
  }

  async function timeFetch(url) {
    var t0 = performance.now();
    var ok = true, err = null, bytes = 0;
    try {
      var res = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
      var body = await res.text();           // 転送 + 本文受信まで含める
      bytes = body.length;
      ok = res.ok;
      try { var j = JSON.parse(body); if (j && j.error) { ok = false; err = j.error; } }
      catch (e) { ok = false; err = 'parse'; }
    } catch (e) { ok = false; err = String(e); }
    return { ms: performance.now() - t0, ok: ok, err: err, bytes: bytes };
  }

  /**
   * gvPerf(opts)
   *   opts.runs   各ターゲットの計測回数（既定 5）
   *   opts.gapMs  計測間の間隔ms（既定 400／連続並行を避けるため）
   *   opts.cold   true で fresh=1（全再計算）も計測（既定 false・負荷高なので runs を抑える）
   *   opts.endpoint / opts.token  自動検出できないときの手動指定
   */
  async function gvPerf(opts) {
    opts = opts || {};
    var runs = opts.runs || 5;
    var gapMs = opts.gapMs != null ? opts.gapMs : 400;

    var det = opts.endpoint
      ? { base: opts.endpoint, token: opts.token || (detect() || {}).token }
      : detect();
    if (!det || !det.base) {
      console.error('[gvPerf] エンドポイント自動検出に失敗。先にアプリでホームを開くか、' +
        'gvPerf({ endpoint:"https://.../exec", token:"<idToken>" }) で指定してください。');
      return;
    }
    if (document.hidden) {
      console.warn('[gvPerf] タブが非アクティブです。前面にして実行してください（背景タブは計測が乱れます）。');
    }
    if (!det.token) {
      console.warn('[gvPerf] token を検出できません。未認証だと GAS が UNAUTHORIZED を返します。');
    }

    var targets = [
      { label: 'home  (warm)',  action: 'home',   params: {} },
      { label: 'scores(warm)',  action: 'scores', params: {} },
    ];
    if (opts.cold) {
      targets.push({ label: 'home  (cold fresh=1)', action: 'home',   params: { fresh: '1' }, runs: opts.coldRuns || 2 });
      targets.push({ label: 'scores(cold fresh=1)', action: 'scores', params: { fresh: '1' }, runs: opts.coldRuns || 2 });
    }

    var results = {};
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      var loops = t.runs || runs;
      var arr = [], lastErr = null, bytes = 0;
      // warm 計測はキャッシュを温めてから（ミスの1回が混ざらないように）
      if (/warm/.test(t.label)) { await timeFetch(buildUrl(det.base, det.token, t.action, t.params)); }
      for (var i = 0; i < loops; i++) {
        var r = await timeFetch(buildUrl(det.base, det.token, t.action, t.params));
        arr.push(r.ms); bytes = r.bytes; if (!r.ok) lastErr = r.err;
        await new Promise(function (res) { setTimeout(res, gapMs); });
      }
      var s = stats(arr);
      s.KB = Math.round(bytes / 1024);
      if (lastErr) s.error = lastErr;
      results[t.label] = s;
    }
    console.table(results);
    console.log('[gvPerf] 単位=ms（fetch開始→本文受信完了の実測）。' +
      '一次情報として GAS 実行ログ（実行時間）も併読してください。');
    return results;
  }

  /**
   * gvPerfPaint(selector, timeoutMs)
   *   呼び出した瞬間から selector が DOM に現れるまでの ms を計測する。
   *   画面遷移の直前（ホーム表示直前 / 成績タップ直前）に呼んで使う。
   *   既に存在すれば 0、timeout で -1。
   */
  function gvPerfPaint(selector, timeoutMs) {
    var t0 = performance.now();
    return new Promise(function (resolve) {
      if (document.querySelector(selector)) { resolve({ ms: 0, note: '既に存在' }); return; }
      var obs = new MutationObserver(function () {
        if (document.querySelector(selector)) {
          obs.disconnect();
          var ms = Math.round(performance.now() - t0);
          console.log('[gvPerfPaint] ' + selector + ' 出現まで ' + ms + ' ms');
          resolve({ ms: ms });
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () {
        obs.disconnect();
        console.warn('[gvPerfPaint] timeout: ' + selector);
        resolve({ ms: -1, note: 'timeout' });
      }, timeoutMs || 15000);
    });
  }

  /** コールド起動（フルリロード）の素の指標。reload 後にこれを読むと boot 時間が分かる */
  function gvPerfBoot() {
    var nav = performance.getEntriesByType('navigation')[0];
    if (!nav) { console.warn('[gvPerfBoot] navigation timing なし'); return null; }
    var o = {
      'TTFB(ms)': Math.round(nav.responseStart),
      'DOMContentLoaded(ms)': Math.round(nav.domContentLoadedEventEnd),
      'load(ms)': Math.round(nav.loadEventEnd),
    };
    console.table(o);
    return o;
  }

  window.gvPerf = gvPerf;
  window.gvPerfPaint = gvPerfPaint;
  window.gvPerfBoot = gvPerfBoot;
  console.log('[gvPerf] ロード完了 → gvPerf() / gvPerf({cold:true}) / gvPerfPaint(".c-today") / gvPerfBoot()');
})();
