/**
 * 錨のアイコンの着せ替え（ボード E05・先生の回答 3: アイコンだけ・ICON FRAME は無し）。
 * 上にプレビュー（選んでいるアイコン・「ホームのタイル・ログインの錨がこの絵になる」）→ ANCHOR ICON（いつもの + イベント 4 つ）→「これにする」。
 * まだ持っていないアイコンは「?」だけ（絵・名前・日付を出さない・21:33 先生）
 */
import { useEffect, useState } from 'react';
import type { TreeCosmetics } from '../../../lib/treeApi';
import { TreeApiError, fetchCosmetics, saveIconSkin } from '../../../lib/treeApi';
import { BRAND, rootClass } from '../treeTheme';
import { EV_ASSET, EV_HAS_ART, EV_NAME } from './evTheme';
import { PxBackIcon } from './EvParts';
import '../../../styles/tree-event.css';

interface Props {
  onBack: () => void;
  /** 保存できた（null = いつもの錨）*/
  onSaved: (skin: string | null) => void;
}

const ROUTE_ICON = BRAND + 'icon_route.svg';

export function DressUpScreen({ onBack, onSaved }: Props) {
  const [data, setData] = useState<TreeCosmetics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchCosmetics()
      .then((d) => {
        setData(d);
        setPick(d.selected);
      })
      .catch((e) => setError(e instanceof TreeApiError ? e.code : 'NETWORK'));
  }, []);

  const owned = new Set((data?.icons ?? []).map((x) => x.item));
  const kinds = data?.kinds ?? ['halloween', 'xmas', 'newyear', 'setsubun'];
  const previewImg = pick && EV_HAS_ART.has(pick) ? EV_ASSET(pick).appicon512 : ROUTE_ICON;
  const previewName = pick ? `${EV_NAME[pick] ?? pick.toUpperCase()} ICON` : 'ROUTE ICON';
  const smallIcon = pick && EV_HAS_ART.has(pick) ? EV_ASSET(pick).icon2x : ROUTE_ICON;

  const save = async () => {
    if (!data || saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await saveIconSkin(pick);
      onSaved(r.selected);
    } catch (e) {
      setError(e instanceof TreeApiError ? e.code : 'NETWORK');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={rootClass('ev-dress')}>
      <div aria-hidden="true" className="ev-dress-glow" />
      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2 is-route" aria-label="戻る" onClick={onBack}>
          <span className="ev-px2">
            <PxBackIcon />
          </span>
        </button>
        <h1 className="ev-title" style={{ gap: 5 }}>
          <span className="ev-arc ev-chrome is-aqua" style={{ fontSize: 13, lineHeight: 1, alignSelf: 'flex-start' }}>DRESS UP</span>
          <span className="ev-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>アイコンの着せ替え</span>
        </h1>
      </div>

      <div className="ev-body" style={{ top: 70 }}>
        {error && (
          <div className="ev-msg ev-dot" role="alert">
            {error === 'NOT_OWNED' ? 'まだ手に入れていないアイコンです。' : error === 'EVENT_NOT_READY' ? '着せ替えはまだ準備中です。' : '読み込めませんでした。通信状況を確かめてもう一度お試しください。'}
          </div>
        )}
        <div className="ev-shadow is-aqua">
          <div className="ev-px ev-frame" style={{ background: '#2DF4C6' }}>
            <div className="ev-px ev-card is-aqua" style={{ padding: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
              <img src={previewImg} alt={`選んでいるアイコン（${previewName}）`} style={{ width: 104, height: 104, flex: 'none', display: 'block', objectFit: 'contain', imageRendering: 'pixelated' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                <span className="ev-dot" style={{ fontSize: 16, color: '#FFFFFF', textShadow: '2px 2px 0 #021014' }}>{previewName}</span>
                <div className="ev-px2" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(2,16,22,.8)' }}>
                  <img src={smallIcon} alt="" style={{ width: 28, height: 28, display: 'block', objectFit: 'contain', imageRendering: 'pixelated' }} />
                  <span className="ev-arc" style={{ fontSize: 8, color: '#2DF4C6' }}>ANCHOR TREE</span>
                </div>
                <span className="ev-dot" style={{ fontSize: 11, color: '#8ED4E0', lineHeight: 1.5 }}>ホームのタイル・ログインの錨がこの絵になる</span>
              </div>
              <div className="ev-scan" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="ev-arc" style={{ fontSize: 8, color: '#2DF4C6' }}>ANCHOR ICON</span>
          <span className="ev-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>ホームのタイル・ログインの錨</span>
        </div>
        <div className="ev-dress-grid" role="radiogroup" aria-label="錨のアイコン">
          <IconTile label="いつもの錨" img={ROUTE_ICON} cap="ROUTE" own sel={pick === null} disabled={!data} onPick={() => setPick(null)} />
          {kinds.map((k) => {
            const has = owned.has(k) && EV_HAS_ART.has(k);
            return (
              <IconTile
                key={k}
                label={has ? `${EV_NAME[k] ?? k} ICON` : 'まだ手に入れていないアイコン'}
                img={has ? EV_ASSET(k).appicon : ''}
                cap={has ? EV_NAME[k] ?? k.toUpperCase() : ''}
                own={has}
                sel={pick === k}
                disabled={!data || !has}
                onPick={() => has && setPick(k)}
              />
            );
          })}
        </div>
      </div>

      <div className="ev-foot is-aqua">
        <button type="button" className="ev-cta-wrap is-aqua" disabled={!data || saving || pick === data?.selected} onClick={() => void save()}>
          <span className="ev-px2 ev-cta is-aqua">
            <span className="ev-dot" style={{ fontSize: 17 }}>{saving ? '保存中…' : pick === data?.selected ? '選択中' : 'これにする'}</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function IconTile({ label, img, cap, own, sel, disabled, onPick }: { label: string; img: string; cap: string; own: boolean; sel: boolean; disabled: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={sel}
      aria-label={label + (sel ? '（選択中）' : '')}
      className={`ev-px2 ev-tile${sel ? ' is-sel' : own ? ' is-own' : ' is-lock'}`}
      disabled={disabled}
      onClick={onPick}
    >
      <span className="ev-px2 ev-tile-in">
        {own ? (
          <>
            <img src={img} alt="" style={{ width: 48, height: 48, display: 'block', objectFit: 'contain', imageRendering: 'pixelated' }} />
            <span className="ev-arc" style={{ fontSize: 6 }}>{cap}</span>
          </>
        ) : (
          <span className="ev-arc" style={{ fontSize: 22, color: 'rgba(234,251,255,.45)' }}>?</span>
        )}
        {sel && <span className="ev-arc ev-tile-ok">OK</span>}
      </span>
    </button>
  );
}
