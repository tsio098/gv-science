/**
 * 出席用 QR コード画面（ハンドオフ仕様 1-B）。
 *   TopNav → ページヘッダ → 本人確認ストリップ → QR カード → 更新ボタン
 *   QR は `qrcode.react` の QRCodeSVG で本物を描画（前景: --c-text, 背景: 白）。
 */
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchAttendanceQR } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import {
  InfoIcon,
  RefreshIcon,
  UserIcon,
} from '../components/Icon';

interface Props {
  nav: NavFn;
}

export function AttendanceQRScreen({ nav }: Props) {
  // 「最新の状態に更新」で useAsync を再実行するための再フェッチキー
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading, error } = useAsync(fetchAttendanceQR, [reloadKey], {
    cacheKey: 'qr',
  });

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb="GV / 出席"
        onBack={() => nav('back')}
        backLabel="ホーム"
      />
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">ATTENDANCE · 受付</div>
          <h1 className="page-title">出席用QRコード</h1>
          <p className="page-sub">受付でこの画面を提示してください。</p>
        </div>

        {error && !loading ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : loading || !data ? (
          <Spinner />
        ) : (
          <>
            {/* 本人確認ストリップ */}
            <div className="qr-id">
              <div className="qr-id-av">
                <UserIcon size={22} />
              </div>
              <div className="qr-id-tx">
                <div className="hi">こんにちは</div>
                <div className="nm">
                  {data.name || '未登録'}
                  {data.grade && <span className="grade">{data.grade}</span>}
                </div>
              </div>
            </div>

            {/* QR カード */}
            <div className="qr-card">
              <div className="qr-frame">
                {data.qrText ? (
                  <QRCodeSVG
                    value={data.qrText}
                    size={232}
                    level="M"
                    fgColor="#2D3A2A"
                    bgColor="#ffffff"
                  />
                ) : (
                  <div className="qr-empty">
                    QR を生成できません。
                    <br />
                    管理者にお問い合わせください。
                  </div>
                )}
              </div>
              <div className="qr-note">
                <InfoIcon size={14} />
                <span>画面の明るさを上げるとスキャンしやすくなります</span>
              </div>
            </div>

            {/* 更新ボタン */}
            <button
              type="button"
              className="qr-refresh"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshIcon size={16} />
              <span>最新の状態に更新</span>
            </button>
          </>
        )}

        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
