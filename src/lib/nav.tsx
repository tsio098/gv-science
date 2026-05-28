/**
 * スタックベースのナビゲーション。
 *
 * - 履歴は配列で持ち、`nav('back')` で pop、`nav('home')` でリセット。
 * - ブラウザの戻る (popstate) は pop と等価に扱う。
 * - `nav('ext', { url })` は外部リンク確認モーダルを開く。
 *
 * iOS 風横スライドは CSS keyframes（app.css 内）で実現する。
 *
 * 履歴同期の方針:
 *   forward 遷移時のみ history.pushState() する。
 *   popstate 受信時に stack を pop する。
 *   nav('back') 内では history.back() を呼ばずに、popstate ハンドラに任せる
 *   ことで二重 pop を避ける。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NavFn, Route } from './types';

type Direction = 'forward' | 'back' | 'none';

interface NavState {
  stack: Route[];
  direction: Direction;
  nav: NavFn;
}

const NavContext = createContext<NavState | null>(null);

interface NavProviderProps {
  children: ReactNode;
  /** モーダル本体は App が描く。URL を受け取って通知するだけ */
  onExternalLink: (url: string) => void;
}

export function NavProvider({ children, onExternalLink }: NavProviderProps) {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [direction, setDirection] = useState<Direction>('none');

  /**
   * pop（戻る）動作の共通実装。
   * popstate からも、ボタンからも呼ばれる。
   */
  const pop = useCallback(() => {
    setStack((s) => {
      if (s.length <= 1) return s;
      setDirection('back');
      return s.slice(0, -1);
    });
  }, []);

  const nav = useCallback<NavFn>(
    ((name: string, params?: unknown) => {
      if (name === 'ext') {
        const url = (params as { url?: string } | undefined)?.url ?? '#';
        onExternalLink(url);
        return;
      }
      if (name === 'back') {
        // history.back() が popstate を発火するので、それ任せ。
        // 履歴が空の場合に備えてフォールバック。
        if (window.history.state?.gvDepth) {
          window.history.back();
        } else {
          pop();
        }
        return;
      }
      if (name === 'home') {
        setDirection('back');
        setStack([{ name: 'home' }]);
        return;
      }
      const next = { name, params: params ?? {} } as unknown as Route;
      setDirection('forward');
      setStack((s) => {
        const nextStack = [...s, next];
        try {
          window.history.pushState({ gvDepth: nextStack.length }, '');
        } catch {
          /* noop */
        }
        return nextStack;
      });
    }) as NavFn,
    [onExternalLink, pop]
  );

  // popstate → pop（ブラウザ戻る / Android ハードウェアバック）
  useEffect(() => {
    const onPop = () => pop();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [pop]);

  const value = useMemo<NavState>(
    () => ({ stack, direction, nav }),
    [stack, direction, nav]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavState {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav must be used inside NavProvider');
  return v;
}
