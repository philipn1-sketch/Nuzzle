import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useApp } from '../state/AppState';

/**
 * Where Siri and the Shortcuts app land: nuzzle://action?do=L, R or done.
 * It does what was asked once, then goes to Home.
 */
export default function Action() {
  const { do: what } = useLocalSearchParams<{ do?: string }>();
  const { startOn, done } = useApp();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (what === 'L' || what === 'R') startOn(what);
    else if (what === 'done') done();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [what, startOn, done]);
  return null;
}
