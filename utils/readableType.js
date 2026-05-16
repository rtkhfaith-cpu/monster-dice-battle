import { useWindowDimensions } from 'react-native';

/** Shared readable font scale for menus + battle HUD (phone / desktop). */
export function useReadableType() {
  const { width } = useWindowDimensions();
  const bump = width < 380 ? 0 : width > 720 ? 5 : 2;
  return {
    hero: 34 + bump,
    section: 24 + bump,
    body: 17 + bump,
    stat: 19 + bump,
    statSm: 16 + bump,
    btn: 20 + bump,
    btnSm: 17 + bump,
  };
}
