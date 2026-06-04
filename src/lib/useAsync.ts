/**
 * シンプルな fetch フック。React Query を入れるほどでもないので最小実装。
 * 依存配列に渡された値が変わったら再 fetch する。
 *
 * SWR（stale-while-revalidate）対応:
 *   options.cacheKey を渡すと、前回取得値があれば**スピナーを出さず即表示**し、
 *   裏で最新を取り直して差し替える。これにより一度開いた画面の再表示が瞬時になる。
 *   裏更新が失敗しても前回データを保持し、エラー画面に切り替えない。
 *   キャッシュが無い初回のみ通常どおりローディング → 失敗時はエラー表示。
 */
import { useEffect, useRef, useState } from 'react';
import { swrGet, swrFetch } from './swrCache';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** 同じ条件で再フェッチする（エラー時の「再試行」ボタン用）。*/
  reload: () => void;
}

interface UseAsyncOptions {
  /** SWR キャッシュキー。指定すると再表示が即時になる。*/
  cacheKey?: string;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  options: UseAsyncOptions = {}
): AsyncState<T> {
  const { cacheKey } = options;

  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>(() => {
    const cached = cacheKey ? swrGet<T>(cacheKey) : undefined;
    return {
      data: cached ?? null,
      loading: cached === undefined, // キャッシュがあれば最初からスピナーを出さない
      error: null,
    };
  });
  // reload() で値を変えて useEffect を再発火させるためのカウンタ
  const [nonce, setNonce] = useState(0);
  // fn は毎レンダ新インスタンス想定なので、deps で発火する
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    // 依存（cacheKey 含む）が変わった瞬間に、その時点のキャッシュを即表示。
    const cached = cacheKey ? swrGet<T>(cacheKey) : undefined;
    setState({
      data: cached ?? null,
      loading: cached === undefined,
      error: null,
    });
    // cacheKey があれば swrFetch 経由で取得（取得中なら共有し、成功時にキャッシュ保存）。
    // 起動時のホーム先読みと画面側の取得が二重に走らないようにするため。
    const run = cacheKey
      ? swrFetch(cacheKey, () => fnRef.current())
      : fnRef.current();
    run
      .then((d) => {
        if (!alive) return;
        setState({ data: d, loading: false, error: null });
      })
      .catch((e) => {
        if (!alive) return;
        // 裏更新失敗時、前回データ（stale）があれば保持してエラーを出さない。
        // データが無いときだけエラー表示（画面側で再試行ボタン）。
        setState((s) =>
          s.data != null
            ? { data: s.data, loading: false, error: null }
            : {
                data: null,
                loading: false,
                error: e instanceof Error ? e : new Error(String(e)),
              }
        );
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, cacheKey]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
