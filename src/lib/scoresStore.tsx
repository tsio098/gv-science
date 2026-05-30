/**
 * 成績推移データの共有ストア（Context + SWR キャッシュ）。
 *
 *   - HomeC（スパークライン）と ScoresScreen（本体）の両方が同じデータを
 *     使うため、Provider に持ち上げて fetch を 1 回に抑える。
 *   - sessionStorage に直前レスポンスをキャッシュし、再訪時に即描画。
 *     直後にバックグラウンドで再フェッチし、差分があれば差し替える（SWR）。
 *   - `refresh()` を呼ぶと GAS 側のキャッシュ（30 分）も無効化して再取得する。
 *
 * セッション境界:
 *   sessionStorage はタブ単位で揮発するため、ペアリング切替や
 *   別アカウントログインによるデータ混入リスクが小さい。
 *   念のためキーには version プレフィックス（`scores:v1`）を含め、
 *   スキーマ変更時には version を上げてキャッシュを失効させる。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchScores } from './api';
import type { ScoresResponse } from './types';

const STORAGE_KEY = 'scores:v1';

interface State {
  data: ScoresResponse | null;
  loading: boolean;
  error: Error | null;
  /** 直近の成功取得時刻（ms epoch）。表示用 */
  fetchedAt: number | null;
}

interface ScoresContextValue extends State {
  /** GAS キャッシュも破棄して再取得 */
  refresh: () => void;
  /** バックグラウンド更新中フラグ（前回データ表示中 + 裏で fetch 中） */
  refreshing: boolean;
}

const ScoresContext = createContext<ScoresContextValue | null>(null);

function readCache(): ScoresResponse | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScoresResponse;
  } catch {
    return null;
  }
}

function writeCache(data: ScoresResponse): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode などは無視。機能は維持される */
  }
}

export function ScoresProvider({ children }: { children: ReactNode }) {
  const initial = readCache();
  const [state, setState] = useState<State>({
    data: initial,
    loading: initial === null,
    error: null,
    fetchedAt: null,
  });
  const [refreshing, setRefreshing] = useState<boolean>(initial !== null);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback((fresh: boolean) => {
    setState((s) => ({
      ...s,
      loading: s.data === null,
      error: null,
    }));
    setRefreshing(true);
    fetchScores(fresh)
      .then((d) => {
        if (!aliveRef.current) return;
        setState({
          data: d,
          loading: false,
          error: null,
          fetchedAt: Date.now(),
        });
        writeCache(d);
      })
      .catch((e) => {
        if (!aliveRef.current) return;
        // 裏フェッチ失敗時は前回 data を保持してエラー画面に切り替えない
        setState((s) => ({
          data: s.data,
          loading: false,
          error: e instanceof Error ? e : new Error(String(e)),
          fetchedAt: s.fetchedAt,
        }));
      })
      .finally(() => {
        if (!aliveRef.current) return;
        setRefreshing(false);
      });
  }, []);

  // マウント時に裏で 1 回フェッチ（キャッシュあれば即描画 → 上書き）
  useEffect(() => {
    run(false);
  }, [run]);

  const refresh = useCallback(() => run(true), [run]);

  return (
    <ScoresContext.Provider value={{ ...state, refresh, refreshing }}>
      {children}
    </ScoresContext.Provider>
  );
}

export function useScores(): ScoresContextValue {
  const ctx = useContext(ScoresContext);
  if (!ctx) {
    throw new Error('useScores must be used inside <ScoresProvider>');
  }
  return ctx;
}
