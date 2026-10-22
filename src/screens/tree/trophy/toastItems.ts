/**
 * API の応答 → 通知（ToastItem）。文言はボード「通知のバリエーション」（実装手順_トロフィー §5.4・§5.5）。
 */
import type { ArenaSeason, Level30Got, Level50Got, QType, SubmitResult, TreeManifest, TreeNotice, TreeProgress, TreeStage, TrophyGet, TrophyNear } from '../../../lib/treeApi';
import { gradeLabel } from '../../../lib/treeApi';
import { MASTER_AT, fmtScore } from '../treeTheme';
import type { ToastItem } from './toastQueue';

const SHORT_TYPE: Record<QType, string> = { tf: '正誤', calc: '計算', reason: '考察' };
const seasonLabel = (s: ArenaSeason) => (s.n >= 1 ? `SEASON ${s.n}` : 'PRE SEASON');
const who = (h: { grade: string; nickname: string }) => `${gradeLabel(h.grade)} ${h.nickname}`.trim();

/**
 * 季節イベントの EVENT CLEAR!!（EVENT トロフィー ＋ 初めてなら錨のアイコン・2026-10-20）。既読はトロフィーと同じ（trophy:{科目}:{id}）。
 * 札はアカウントで初めての 100% なら「{科目} · トロフィー ＋ アイコン」、2 科目目からは「{科目} · EVENT トロフィー」
 */
export function eventClearToast(t: TrophyGet, subjectName: string, kind = t.eventKind || 'halloween'): ToastItem {
  return {
    key: `trophy:${t.subject}:${t.id}`, kind: 'evClear', grade: 'E', head: 'EVENT CLEAR!!', main: t.name,
    sub: t.firstIcon ? `${subjectName} · トロフィー ＋ アイコン` : `${subjectName} · EVENT トロフィー`,
    trophy: { subject: t.subject, id: t.id },
    ev: { kind, subject: t.subject, stamp: '100%', firstIcon: !!t.firstIcon },
  };
}

/** 季節イベントの TICKET GET!（テスト合格・イベント限定チケット）。既読は evticket:{科目}:{イベント}（提出の直後もツリーを開いたときも同じキー）*/
export function eventTicketToast(g: { subject: string; eventId: string; usableFrom: number | null; kind?: string | null }, subjectName: string): ToastItem {
  const key = `evticket:${g.subject}:${g.eventId}`;
  const d = g.usableFrom ? new Date(g.usableFrom + 9 * 3600_000) : null;
  const stamp = d ? `${d.getUTCMonth() + 1}/${d.getUTCDate()}` : '';
  return {
    key, noticeKey: key, kind: 'evTicket', head: 'TICKET GET!', main: `${subjectName} · ボーナスチケット`,
    // 使える日が無い（usableFrom が null）ときは日付の部分を出さない（2026-10-22 修正: 「 のみ使用可能」と日付が空で出ていた）
    sub: stamp ? `${stamp} のみ使用可能` : undefined, ticket: true, ev: { kind: g.kind || 'halloween', subject: g.subject, stamp },
  };
}

/** 獲得したトロフィー */
export function trophyToast(t: TrophyGet, subjectName: string, stage: TreeStage = 'front'): ToastItem {
  // EVENT トロフィーは TROPHY GET! を出さず EVENT CLEAR!! の 1 件にまとめる（2026-10-20）
  // 札の絵柄はトロフィーの eventKind（2026-10-22 修正: 'halloween' 固定で、次のイベントの通知もハロウィンの札になっていた）
  if (t.grade === 'E' || t.event) return eventClearToast(t, subjectName);
  // 残念トロフィー（2026-10-19）: 札は何が起きたか（無ければ「残念トロフィー」）・+0PT
  if (t.grade === 'Z') {
    return {
      key: `trophy:${t.subject}:${t.id}`, kind: 'trophy', grade: 'Z', head: 'TROPHY GET...?', main: t.name,
      sub: t.note || '残念トロフィー', pt: 0, trophy: { subject: t.subject, id: t.id },
    };
  }
  const head = t.grade === 'P' ? 'PLATINUM GET!!' : t.grade === 'F' ? 'FIRST CLEAR!!' : 'TROPHY GET!';
  // 「全獲得」はその科目のプラチナ（id = *_plat）だけ。ほかのプラチナ（範囲のランキング制覇など・2026-10-19）は副題なし
  const sub = t.grade === 'P' ? (t.id.endsWith('_plat') ? `${subjectName}のトロフィー全獲得` : undefined) : t.grade === 'F' ? '塾内で最初の 1 人' : undefined;
  return {
    key: `trophy:${t.subject}:${t.id}`,
    kind: 'trophy',
    grade: t.grade,
    head,
    main: t.name,
    sub,
    pt: t.pt,
    abyss: stage === 'back',
    trophy: { subject: t.subject, id: t.id },
  };
}

/** トロフィーレベル 30（LV.30 チケット）。既読は level30:{科目}（提出の直後もツリーを開いたときも同じキー）*/
export function level30Toast(g: Pick<Level30Got, 'subject'>, subjectName: string): ToastItem {
  const key = `level30:${g.subject}`;
  return { key, noticeKey: key, kind: 'level30', head: 'LEVEL 30 REACHED!!', main: 'トロフィーレベル 30', sub: `${subjectName} · ボーナスチケット獲得`, ticket: true };
}

/** トロフィーレベル 50（LV.50 チケット・2026-10-22）。既読は level50:{科目}。見た目・音は LEVEL 30 と同じ（スタンプ LV50）*/
export function level50Toast(g: Pick<Level50Got, 'subject'>, subjectName: string): ToastItem {
  const key = `level50:${g.subject}`;
  return { key, noticeKey: key, kind: 'level50', head: 'LEVEL 50 REACHED!!', main: 'トロフィーレベル 50', sub: `${subjectName} · ボーナスチケット獲得`, ticket: true };
}

/** 数えるトロフィーが 80% に届いた */
export function nearToast(n: TrophyNear): ToastItem {
  return { key: `near:${n.subject}:${n.id}`, kind: 'progress', head: `PROGRESS ${n.now}/${n.max}`, main: n.name, prog: { now: n.now, max: n.max } };
}

/** サーバのお知らせ（ファースト・アリーナ・先生の記録）*/
export function noticeToast(n: TreeNotice, subjectName: string): ToastItem | null {
  switch (n.type) {
    case 'first_broadcast':
      return {
        key: n.key, noticeKey: n.key, kind: 'firstOther',
        head: `FIRST! ${who(n.holder)}`, main: n.trophy.name, sub: `${subjectName} · ${n.trophy.desc}`,
      };
    case 'arena_rank': {
      const d = n.prevRank == null ? 0 : n.rank - n.prevRank;
      const arrow = d > 0 ? ` ▼${d}` : d < 0 ? ` ▲${-d}` : '';
      return {
        key: n.key, noticeKey: n.key, kind: 'arenaRank', head: 'RANKING UPDATE',
        main: `${subjectName}アリーナ ${n.rank} 位${arrow}`,
        sub: n.leaderChanged && n.leader ? `${seasonLabel(n.season)} · ${who(n.leader)} が 1 位に` : `${seasonLabel(n.season)} · ${n.of} 人中`,
      };
    }
    case 'teacher_record':
      return {
        key: n.key, noticeKey: n.key, kind: 'teacher', head: 'TEACHER RECORD',
        main: `先生の記録 ${fmtScore(n.score)} 点`, sub: `今シーズン · ${subjectName}アリーナ`,
      };
    case 'rank_down':
      return {
        key: n.key, noticeKey: n.key, kind: 'rankDown', head: 'RANK DOWN',
        main: `${subjectName} ${n.prevRank} 位 → ${n.rank} 位`, sub: `${n.of} 人中 · 抜き返そう`,
      };
    case 'level30':
      return level30Toast(n, subjectName);
    case 'level50':
      return level50Toast(n, subjectName);
    case 'event_ticket':
      return eventTicketToast(n, subjectName);
    case 'arena_last_day':
      return {
        key: n.key, noticeKey: n.key, kind: 'lastday', head: 'LAST DAY!',
        main: `${seasonLabel(n.season)} あと 1 日`, sub: `CHAMPION ARENA · ${subjectName}`,
      };
    default:
      return null;
  }
}

/** 結果画面に入ったとき: トロフィー・PROGRESS・分野の解放・種別のマスター・順位アップ */
export function submitToasts(r: SubmitResult, manifest: TreeManifest, subjectName: string, stage: TreeStage): ToastItem[] {
  const out: ToastItem[] = [];
  const name = (id: string) => manifest.fields.find((f) => f.id === id)?.name ?? id;
  const stageName = stage === 'back' ? 'ABYSS' : 'ROUTE';
  for (const t of r.trophies ?? []) out.push(trophyToast(t, subjectName, stage));
  if (r.level30) out.push(level30Toast(r.level30, subjectName));
  if (r.level50) out.push(level50Toast(r.level50, subjectName));
  for (const n of r.near ?? []) out.push(nearToast(n));
  for (const f of r.newlyUnlocked ?? []) {
    // 問題がまだ無い（準備中の）分野は知らせない（結果画面の帯と同じ・2026-10-22 デバッグで修正）
    const mf = manifest.fields.find((x) => x.id === f);
    if (mf && !(mf.total > 0)) continue;
    out.push({ key: `node:${manifest.subject}:${stage}:${f}`, kind: 'node', head: 'NODE OPEN!', main: name(f), sub: `${subjectName} · ${stageName}` });
  }
  // 季節イベントの挑戦（r.event）の node・rank は科目の値（分野・種別ではない）→ MASTER! は出さず、RANK UP! は科目の名前で
  const ev = !!r.event;
  const b = r.node?.before?.mastery ?? 0;
  const a = r.node?.after?.mastery ?? 0;
  if (r.node && !ev && b < MASTER_AT && a >= MASTER_AT) {
    out.push({
      key: `master:${manifest.subject}:${stage}:${r.node.field}:${r.node.qtype}`, kind: 'master', head: 'MASTER!',
      main: `${name(r.node.field)} · ${SHORT_TYPE[r.node.qtype]}`, sub: `マスター度 ${Math.round(MASTER_AT * 100)}%`,
    });
  }
  const rb = r.rank?.before?.rank ?? null;
  const ra = r.rank?.after?.rank ?? null;
  if (r.rank && ra != null && (rb == null || ra < rb)) {
    out.push({
      key: `rank:${r.sessionId}`, kind: 'rank', head: 'RANK UP!',
      main: rb == null ? `${ev ? subjectName : name(r.node.field)} ${ra} 位に` : `${ev ? subjectName : name(r.node.field)} ${rb} 位 → ${ra} 位`,
      sub: `${r.rank.after.of} 人中`,
    });
  }
  return out;
}

/** ツリーを開いたとき: 新着（その版で 1 回だけ。localStorage['gvTree.newNotified.{科目}'] = 版）*/
export function newsToast(manifest: TreeManifest, progress: TreeProgress, subjectName: string): ToastItem | null {
  const key = `gvTree.newNotified.${manifest.subject}`;
  try {
    if (localStorage.getItem(key) === String(manifest.version)) return null;
  } catch {
    /* 覚えられない端末は毎回出しうる */
  }
  const list = manifest.fields.map((f) => ({ name: f.name, n: progress.fields[f.id]?.unlocked ? progress.fields[f.id]?.newCount ?? 0 : 0 })).filter((x) => x.n > 0);
  const n = list.reduce((s, x) => s + x.n, 0);
  try {
    localStorage.setItem(key, String(manifest.version));
  } catch {
    /* noop */
  }
  if (!n) return null;
  return {
    key: `news:${manifest.subject}:${manifest.version}`, kind: 'news', head: `NEW +${n}`,
    main: list.length === 1 ? `${list[0]!.name}に新着 ${n} 問` : `新着 ${n} 問`, sub: `${subjectName} · ROUTE`,
  };
}
