import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import { useApp } from './AppState';

/** Acts on nuzzle://action?do=L, R or done: start on a side, or stop and save. */
export function LinkActions() {
  const { startOn, done } = useApp();
  const ref = useRef({ startOn, done });
  ref.current = { startOn, done };

  useEffect(() => {
    const act = (url: string | null | undefined) => {
      const m = url && /action\?(?:.*&)?do=(L|R|done)\b/.exec(url);
      if (!m) return;
      if (m[1] === 'done') ref.current.done();
      else ref.current.startOn(m[1] as 'L' | 'R');
    };
    Linking.getInitialURL().then(act).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => act(e.url));
    return () => sub.remove();
  }, []);
  return null;
}
