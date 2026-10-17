/**
 * ANCHOR TREE — チャンピオンアリーナ（設計書 §5.7）の入口。ツリーの一番下のノードから開く。
 * シーズン（2 週間）・開放条件（全分野それぞれマスター度 70%）・自分の挑戦・前シーズンのチャンピオン・先生のスコア。
 * 挑戦は 1 シーズン 1 回で、始めた時点で使う → 始める前に確認する。途中で閉じた挑戦は「続きから再開」。
 * 見た目は夜の紫 + 金（2026-10-17 先生決定・デザインボード A03〜A05・A14）。
 */
import { useState } from 'react';
import type { ArenaInfo, TreeManifest } from '../../lib/treeApi';
import { arenaIsStaffSelf, arenaStaffScore, gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ARENA_LOGO, CROWN, CROWN_MONO, arenaLeft, arenaPeriod, arenaSeasonName, fmtScore, fmtTime, rootClass } from './treeTheme';

interface Props {
  info: ArenaInfo;
  manifest: TreeManifest;
  starting: boolean;
  message: string | null;
  /** 本人のボーナスチケットの枚数（0 なら導線を出さない）*/
  tickets?: number;
  onStart: () => void;
  onRanking: () => void;
  onTickets?: () => void;
  onBack: () => void;
}

/** アリーナの見出し（王冠 + ドット文字 + 科目など）*/
export function ArenaHead({ sub, onClose, closeLabel = '閉じる', disabled, compact }: { sub: string; onClose?: () => void; closeLabel?: string; disabled?: boolean; compact?: boolean }) {
  return (
    <div className="tr-ar-head">
      <img className="crown" src={CROWN} alt="" />
      <img className="logo" src={ARENA_LOGO} alt="CHAMPION ARENA" style={compact ? { width: 140 } : undefined} />
      <span className="sub">· {sub}</span>
      {onClose && (
        <button type="button" className="tr-ar-close" aria-label={closeLabel} disabled={disabled} onClick={onClose}>
          <Ico id="i-close" size={16} />
        </button>
      )}
    </div>
  );
}

/** 背景の発光粒子（静止）*/
export function ArenaSparks() {
  return (
    <>
      <span className="tr-ar-spark is-gold" aria-hidden="true" style={{ left: '15%', top: 150 }} />
      <span className="tr-ar-spark is-lilac" aria-hidden="true" style={{ left: '85%', top: 440 }} />
      <span className="tr-ar-spark" aria-hidden="true" style={{ left: '28%', top: 600 }} />
    </>
  );
}

export function ArenaScreen({ info, manifest, starting, message, tickets = 0, onStart, onRanking, onTickets, onBack }: Props) {
  const [confirm, setConfirm] = useState(false);
  const e = info.entry;
  const staffSelf = arenaIsStaffSelf(info);
  const staffScore = arenaStaffScore(info);
  const nameOf = (id: string) => manifest.fields.find((f) => f.id === id)?.name ?? id;
  const canStart = info.open && (staffSelf || !e || e.status === 'started');
  const startLabel = e?.status === 'started' && !staffSelf ? '続きから再開' : '挑戦する';

  return (
    <div className={rootClass('is-arena tr-ar-screen')}>
      <ArenaSparks />
      <ArenaHead sub={manifest.name} onClose={onBack} />

      <div className="tr-ar-body">
        {message && (
          <div className="tr-alert" role="status">
            <Ico id="i-alert" size={18} />
            <span>{message}</span>
          </div>
        )}

        <div className="tr-ar-hero">
          <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>
            {arenaSeasonName(info.season.n)} · {arenaPeriod(info.season)}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="tr-ar-big">{arenaLeft(info.season.end)}</span>
            <span style={{ fontSize: 13, color: 'var(--tr-sub)' }}>
              参加 <b style={{ color: 'var(--tr-text)' }}>{info.count}</b> 人
            </span>
          </div>
        </div>

        {!info.open ? (
          <div className="tr-ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <Ico id="i-lock" size={14} />
              開放条件 · 全分野それぞれマスター度 {info.cond.need}% 以上
            </div>
            <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>
              達成 <b style={{ color: 'var(--tr-text)' }}>{info.cond.done}</b> / {info.cond.of} 分野
            </div>
            {info.cond.fields.map((f) => (
              <div key={f.id} className="tr-ar-cond">
                <span>{nameOf(f.id)}</span>
                <span className="tr-mono" style={{ color: 'var(--tr-review)' }}>
                  {Math.floor(f.mastery)}% / {info.cond.need}%
                </span>
              </div>
            ))}
          </div>
        ) : e?.status === 'done' && !staffSelf ? (
          <div className="tr-ar-stat3">
            <div className="tr-ar-stat">
              <div className="k">スコア</div>
              <div className="v tr-ar-dot" style={{ color: 'var(--ar-gold)' }}>{fmtScore(e.score ?? 0)}</div>
              <div className="k">/ 1,000</div>
            </div>
            <div className="tr-ar-stat">
              <div className="k">正答 · 時間</div>
              <div className="v tr-ar-dot">
                {e.correct ?? 0}/{e.total ?? 10}
              </div>
              <div className="k">{fmtTime(e.elapsedMs ?? 0)}</div>
            </div>
            <button type="button" className="tr-ar-stat" onClick={onRanking} aria-label="アリーナのランキングを見る">
              <div className="k">シーズン順位</div>
              <div className="v tr-ar-dot">{e.rank.rank ? `${e.rank.rank}位` : '—'}</div>
              <div className="k">{e.rank.rank ? `${e.rank.of} 人中` : '0 点は未掲載'}</div>
            </button>
          </div>
        ) : e?.status === 'started' && !staffSelf ? (
          <div className="tr-ar-card" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ar-gold)', fontSize: 13 }}>
            <Ico id="i-clock" size={18} />
            <span>挑戦の途中です。時間は進み続けているので、早めに再開して提出してください。</span>
          </div>
        ) : null}

        {staffSelf && (
          <div style={{ fontSize: 12, color: 'var(--tr-sub)', lineHeight: 1.7, padding: '0 2px' }}>
            先生用アカウント: 何度でも挑戦できます。最高スコアがアリーナに表示されます（ランキングには載りません）。
          </div>
        )}

        {info.champion && (
          <div className="tr-ar-card">
            <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>前シーズンのチャンピオン（{arenaSeasonName(info.champion.season.n)}）</div>
            {info.champion.list.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <img src={CROWN_MONO} alt="" style={{ width: 20, height: 'auto', display: 'block' }} />
                <span className="tr-ar-grade">{gradeLabel(c.grade)}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.nickname}
                </span>
                <span className="tr-ar-dot" style={{ fontSize: 18, color: 'var(--ar-gold)' }}>
                  {fmtScore(c.score)}
                </span>
              </div>
            ))}
          </div>
        )}

        {staffScore && (
          <div className="tr-ar-staff">
            <span style={{ fontSize: 13, fontWeight: 600 }}>{staffSelf ? 'あなた' : '先生'}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tr-sub)' }}>今シーズン最高</span>
            <span className="tr-ar-dot" style={{ fontSize: 17 }}>
              {staffScore.seasonBest == null ? '—' : fmtScore(staffScore.seasonBest)}
            </span>
            <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--tr-sub)' }}>2シーズン合算</span>
            <span className="tr-ar-dot" style={{ fontSize: 17 }}>
              {staffScore.pairSum == null ? '—' : fmtScore(staffScore.pairSum)}
            </span>
          </div>
        )}
      </div>

      <div className="tr-ar-foot">
        {canStart && (
          <button type="button" className="tr-ar-btn" disabled={starting} onClick={() => (e?.status === 'started' || staffSelf ? onStart() : setConfirm(true))}>
            {starting ? '準備中…' : startLabel}
          </button>
        )}
        <button type="button" className="tr-ar-btn2" onClick={onRanking}>
          アリーナのランキング
        </button>
        {tickets > 0 && onTickets && (
          <button type="button" className="tr-ar-btn2" onClick={onTickets}>
            <img src={CROWN_MONO} alt="" style={{ width: 18, height: 'auto', display: 'block' }} />
            チケット
          </button>
        )}
      </div>

      {confirm && (
        <div className="tr-overlay tr-ar-overlay" role="dialog" aria-label="今シーズンの挑戦を始めますか？">
          <div className="tr-ar-dialog">
            <img src={CROWN} alt="" style={{ width: 52, height: 'auto', display: 'block' }} />
            <div style={{ fontSize: 17, fontWeight: 600 }}>今シーズンの挑戦を始めますか？</div>
            <div style={{ fontSize: 13, color: 'var(--tr-sub)' }}>挑戦は 1 シーズンにつき 1 回のみです。</div>
            <button
              type="button"
              className="tr-ar-btn"
              style={{ marginTop: 4 }}
              disabled={starting}
              onClick={() => {
                setConfirm(false);
                onStart();
              }}
            >
              始める
            </button>
            <button type="button" className="tr-ar-btn2" style={{ height: 50 }} onClick={() => setConfirm(false)}>
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
