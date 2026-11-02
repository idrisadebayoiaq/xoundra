import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Bottom padding that lifts composers above the soft keyboard on iOS + Android + web. */
export function useKeyboardPad(extra = 0) {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event) => {
      const height = event?.endCoordinates?.height || 0;
      setPad(Math.max(0, height + extra));
    };
    const onHide = () => setPad(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [extra]);

  return pad;
}
