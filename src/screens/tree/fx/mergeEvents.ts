/**
 * 演出のイベントをまとめる（2026-10-19 先生の報告で修正）。
 * 新シーズン開始（season_start）はサーバが科目ごとに返す（化学・生物の両方でアリーナを開いた生徒・先生は 2 件）。
 * 演出の中身はシーズン番号だけで科目を出さないので、2 回目が「同じアニメーションがもう一度始まった」ように見えていた。
 * → 同じシーズンの season_start は 1 つにまとめ、閉じたら全部の科目を既読にする（seenKeys）。
 * 解放・優勝・総合優勝は科目ごとの出来事なのでまとめない。
 */
import type { TreeEvent } from '../../../lib/treeApi';

export type MergedTreeEvent = TreeEvent & {
  /** 閉じたときに既読にするキー（まとめた分を含む）*/
  seenKeys: string[];
  /** まとめた科目（「アリーナへ」の行き先を、いま開いている科目にするため）*/
  subjects: string[];
};

export function mergeTreeEvents(list: TreeEvent[]): MergedTreeEvent[] {
  const out: MergedTreeEvent[] = [];
  const bySeason = new Map<string, MergedTreeEvent>();
  for (const e of list) {
    const sk = e.type === 'season_start' && e.season ? e.season.key : null;
    const prev = sk ? bySeason.get(sk) : undefined;
    if (prev) {
      prev.seenKeys.push(e.key);
      prev.subjects.push(e.subject);
      continue;
    }
    const m: MergedTreeEvent = { ...e, seenKeys: [e.key], subjects: [e.subject] };
    if (sk) bySeason.set(sk, m);
    out.push(m);
  }
  return out;
}
