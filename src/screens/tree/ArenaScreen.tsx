/**
 * ANCHOR TREE — チャンピオンアリーナ（設計書 §5.7）の入口。ツリーの一番下の門から開く。
 * シーズン（2 週間）・ルール・開放条件（全分野それぞれマスター度 70%）・自分の挑戦・前シーズンのチャンピオン。
 * 挑戦は 1 シーズン 1 回で、始めた時点で使う → 始める前に確認する。途中で閉じた挑戦は「続きから再開」。
 */
import { useState } from 'react';
import type { ArenaInfo, TreeManifest } from '../../lib/treeApi';
import { gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ARENA_GOLD, ARENA_GOLD_SIDE, REVIEW_COLOR, T, alpha, arenaLeft, arenaPeriod, arenaSeasonName, fmtScore, fmtTime, rootClass } from './treeTheme';

interface Props {
  info: ArenaInfo;
  manifest: TreeManifest;
  starting: boolean;
  message: string | null;
  onStart: () => void;
  onRanking: () => void;
  onBack: () => void;
}

export function ArenaScreen({ info, manifest, starting, message, onStart, onRanking, onBack }: Props) {
  const [confirm, setConfirm] = useState(false);
  const e = info.entry;
  const nameOf = (id: string) => manifest.fields.find((f) => f.id === id)?.name ?? id;
  const canStart = info.open && (info.staff || !e || e.status === 'started');
  const startLabel = e?.status === 'started' && !info.staff ? '続きから再開' : info.staff ? '挑戦する（先生用・何度でも）' : '挑戦する（今シーズン 1 回だけ）';

  return (
    <div className={rootClass('tr-result')}>
      <div className="tr-result-head">
        <div className="tr-arena-tile">
          <Ico id="i-crown" size={16} />
        </div>
        <span style={{ flex: 1 }}>
          <b>CHAMPION ARENA</b> · {manifest.name}
        </span>
        <button type="button" className="tr-iconbtn" aria-label="ツリーへ戻る" onClick={onBack}>
          <Ico id="i-close" size={16} />
        </button>
      </div>

      <div className="tr-result-body">
        {message && (
          <div className="tr-alert" role="status">
            <Ico id="i-alert" size={18} />
            <span>{message}</span>
          </div>
        )}

        <div className="tr-card tr-hero" style={{ boxShadow: `6px 6px 0 0 ${ARENA_GOLD_SIDE}, 0 0 20px ${alpha(ARENA_GOLD, 0.2)}`, borderColor: alpha(ARENA_GOLD, 0.6) }}>
          <div style={{ fontSize: 12, color: T.sub }}>
            {arenaSeasonName(info.season.n)} · {arenaPeriod(info.season)}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span className="tr-num" style={{ fontSize: 30, fontWeight: 700, color: ARENA_GOLD }}>
              {arenaLeft(info.season.end)}
            </span>
            <span style={{ fontSize: 13, color: T.sub }}>
              参加 <b className="tr-num" style={{ color: T.text }}>{info.count}</b> 人
            </span>
          </div>
          <ul className="tr-arena-rules">
            <li>全員共通の 10 問（全分野から・計算 3 問以上・考察 2 問以上）</li>
            <li>
              1 問 = 正解の基礎点 <b>25</b> + タイムボーナス 最大 <b>75</b>（満点 1,000）。<b>不正解はどれだけ速くても 0 点</b>
            </li>
            <li>挑戦は 1 シーズンに 1 回だけ。始めた時点で使い、やり直せません（中断しても時間は進みます）</li>
            <li>自己ベスト・マスター度・ツリーのランキングには影響しません</li>
          </ul>
        </div>

        {!info.open ? (
          <div className="tr-panel">
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ico id="i-lock" size={14} />
              開放条件 · 全分野それぞれマスター度 {info.cond.need}% 以上
            </div>
            <div className="tr-note">
              達成 <b className="tr-num" style={{ color: T.text }}>{info.cond.done}</b> / {info.cond.of} 分野
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {info.cond.fields.map((f) => (
                <div key={f.id} className="tr-row" style={{ borderRadius: 12 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{nameOf(f.id)}</span>
                  <span className="tr-num" style={{ fontSize: 12, fontWeight: 700, color: REVIEW_COLOR }}>
                    {Math.floor(f.mastery)}% / {info.cond.need}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : e?.status === 'done' && !info.staff ? (
          <div className="tr-stat3">
            <div className="tr-stat">
              <div>スコア</div>
              <div className="tr-num">{fmtScore(e.score ?? 0)}</div>
              <div className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>/ 1,000</div>
            </div>
            <div className="tr-stat">
              <div>正答 · 時間</div>
              <div className="tr-num">
                {e.correct ?? 0}/{e.total ?? 10}
              </div>
              <div className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>{fmtTime(e.elapsedMs ?? 0)}</div>
            </div>
            <button type="button" className="tr-stat" onClick={onRanking} aria-label="アリーナのランキングを見る">
              <div>シーズン順位</div>
              <div className="tr-num">{e.rank.rank ? `${e.rank.rank}位` : '—'}</div>
              <div className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>{e.rank.rank ? `${e.rank.of} 人中` : '0 点は未掲載'}</div>
            </button>
          </div>
        ) : e?.status === 'started' && !info.staff ? (
          <div className="tr-alert" style={{ borderColor: alpha(ARENA_GOLD, 0.6), color: ARENA_GOLD }}>
            <Ico id="i-clock" size={18} />
            <span>挑戦の途中です。時間は進み続けているので、早めに再開して提出してください。</span>
          </div>
        ) : null}

        {info.staff && <div className="tr-note">先生用アカウントは開放条件なしで何度でも挑戦でき、ランキングには載りません。</div>}

        {info.champion && (
          <div className="tr-panel" style={{ borderColor: alpha(ARENA_GOLD, 0.5) }}>
            <div style={{ fontSize: 12, color: T.sub }}>
              前シーズンのチャンピオン（{arenaSeasonName(info.champion.season.n)}）
            </div>
            {info.champion.list.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: ARENA_GOLD, display: 'flex' }}>
                  <Ico id="i-crown" size={18} />
                </span>
                <span style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>{gradeLabel(c.grade)}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{c.nickname}</span>
                <span className="tr-num" style={{ fontWeight: 700 }}>{fmtScore(c.score)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tr-foot">
        {canStart && (
          <button
            type="button"
            className="tr-cta tr-arena-cta"
            disabled={starting}
            onClick={() => (e?.status === 'started' || info.staff ? onStart() : setConfirm(true))}
          >
            {starting ? '準備中…' : startLabel}
          </button>
        )}
        <button type="button" className="tr-ghost" onClick={onRanking}>
          アリーナのランキング
        </button>
      </div>

      {confirm && (
        <div className="tr-overlay" role="dialog" aria-label="挑戦の確認">
          <div className="tr-card">
            <div style={{ fontWeight: 700, fontSize: 16 }}>今シーズンの挑戦を始めますか？</div>
            <div style={{ color: T.sub }}>
              挑戦は 1 シーズンに 1 回だけです。始めた時点で使い、やり直しはできません。10 問を続けて解き、最後にまとめて採点します。
            </div>
            <button
              type="button"
              className="tr-cta tr-arena-cta"
              disabled={starting}
              onClick={() => {
                setConfirm(false);
                onStart();
              }}
            >
              始める
            </button>
            <button type="button" className="tr-ghost" onClick={() => setConfirm(false)}>
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
