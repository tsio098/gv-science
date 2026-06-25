/**
 * App ルート。
 *  - スタックを保持し、最新画面を slide-in アニメで描画。
 *  - 前画面を裏に重ねて translateX(-30%) + opacity 0.6 する iOS 風遷移。
 *  - 外部リンクは ExternalLinkModal を経由。
 *  - 成績推移画面は SVG チャートを含む重めの画面のため、React.lazy で
 *    遅延ロードする。HomeC マウント時にプリロードを発火するので、
 *    実際にタップした瞬間にはチャンクが既にダウンロード済みであることが多い。
 */
import { lazy, Suspense, useState } from 'react';
import { NavProvider, useNav } from './lib/nav';
import { ScoresProvider } from './lib/scoresStore';
import type { Route } from './lib/types';
import { HomeC } from './screens/HomeC';
import { ScheduleListScreen } from './screens/ScheduleListScreen';
import { ScheduleDetailScreen } from './screens/ScheduleDetailScreen';
import { ProblemListScreen } from './screens/ProblemListScreen';
import { ProblemDetailScreen } from './screens/ProblemDetailScreen';
import { ArticleListScreen } from './screens/ArticleListScreen';
import { StudyBookListScreen } from './screens/StudyBookListScreen';
import { AttendanceQRScreen } from './screens/AttendanceQRScreen';
import { ShibouRequestScreen } from './screens/ShibouRequestScreen';
import { Spinner } from './components/Spinner';
import { ExternalLinkModal } from './components/ExternalLinkModal';

// ── 成績推移は遅延ロード（初期バンドル軽量化） ──
// preloadScoresScreen() は lib/lazyImports.ts に切り出している（循環参照回避）。
import { importScoresScreen } from './lib/lazyImports';
const ScoresScreen = lazy(() =>
  importScoresScreen().then((m) => ({ default: m.ScoresScreen }))
);

function renderRoute(route: Route, nav: ReturnType<typeof useNav>['nav']) {
  switch (route.name) {
    case 'home':
      return <HomeC nav={nav} />;
    case 'schedules':
      return <ScheduleListScreen subject={route.params.subject} nav={nav} />;
    case 'schedule':
      return (
        <ScheduleDetailScreen
          id={route.params.id}
          subject={route.params.subject}
          nav={nav}
        />
      );
    case 'problems':
      return <ProblemListScreen subject={route.params.subject} nav={nav} />;
    case 'problem':
      return (
        <ProblemDetailScreen
          id={route.params.id}
          subject={route.params.subject}
          nav={nav}
        />
      );
    case 'articles':
      return <ArticleListScreen kind="articles" nav={nav} />;
    case 'share':
      return <ArticleListScreen kind="share" nav={nav} />;
    case 'studyBooks':
      return <StudyBookListScreen nav={nav} />;
    case 'qr':
      return <AttendanceQRScreen nav={nav} />;
    case 'shibouRequest':
      return <ShibouRequestScreen nav={nav} />;
    case 'scores':
      return (
        <Suspense fallback={<ScoresFallback />}>
          <ScoresScreen nav={nav} />
        </Suspense>
      );
  }
}

/** lazy ScoresScreen 読み込み中の最小フォールバック（白地 + スピナー） */
function ScoresFallback() {
  return (
    <div className="app">
      <div className="safe-top" />
      <Spinner />
    </div>
  );
}

function Stack() {
  const { stack, direction, nav } = useNav();
  const top = stack[stack.length - 1]!;
  const prev = stack.length > 1 ? stack[stack.length - 2]! : null;

  // 戻る時：destination が左から戻ってくる動きのみ。下層は描かない
  // （pop 直後で stack に消えゆく画面は残っていないため）。
  if (direction === 'back') {
    return (
      <div
        key={`b-${stack.length}-${top.name}`}
        className="page page-back-enter"
      >
        {renderRoute(top, nav)}
      </div>
    );
  }

  // forward / 初期：prev は下層、top はスライドイン
  return (
    <>
      {prev && (
        <div
          key={`u-${stack.length - 2}-${prev.name}`}
          className={`page ${direction === 'forward' ? 'page-under' : ''}`}
        >
          {renderRoute(prev, nav)}
        </div>
      )}
      <div
        key={`t-${stack.length - 1}-${top.name}`}
        className={`page ${direction === 'forward' ? 'page-enter' : ''}`}
      >
        {renderRoute(top, nav)}
      </div>
    </>
  );
}

export function App() {
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  return (
    <div className="gv-root dens-regular">
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <NavProvider onExternalLink={(url) => setModalUrl(url)}>
          <ScoresProvider>
            <Stack />
            {modalUrl !== null && (
              <ExternalLinkModal
                url={modalUrl}
                onClose={() => setModalUrl(null)}
              />
            )}
          </ScoresProvider>
        </NavProvider>
      </div>
    </div>
  );
}
