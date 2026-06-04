/**
 * シンプルな fetch フック。React Query を入れるほどでもないので最小実装。
 * 依存配列に渡された値が変わったら再 fetch する。
 */
import { useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** 同じ条件で再フェッチする（エラー時の「再試行」ボタン用）。*/
  reload: () => void;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: ReadonlyArray<unknown>
): AsyncState<T> {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });
  // reload() で値を変えて useEffect を再発火させるためのカウンタ
  const [nonce, setNonce] = useState(0);
  // fn は毎レンダ新インスタンス想定なので、deps で発火する
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((d) => {
        if (alive) setState({ data: d, loading: false, error: null });
      })
      .catch((e) => {
        if (alive)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e : new Error(String(e)),
          });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
