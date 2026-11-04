import React from 'react';

const MomentsContext = React.createContext(null);

/** Calm one-shot celebrations — keep rare so Quiet stays quiet. */
export function MomentsProvider({ children }) {
  const [moment, setMoment] = React.useState(null);
  const timer = React.useRef(null);

  const clear = React.useCallback(() => {
    clearTimeout(timer.current);
    setMoment(null);
  }, []);

  const showMoment = React.useCallback((kind, opts = {}) => {
    if (!kind) return;
    clearTimeout(timer.current);
    setMoment({
      kind,
      title: opts.title || '',
      body: opts.body || '',
      id: Date.now(),
    });
    timer.current = setTimeout(() => setMoment(null), opts.duration || 2200);
  }, []);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  const value = React.useMemo(() => ({ moment, showMoment, clearMoment: clear }), [moment, showMoment, clear]);

  return <MomentsContext.Provider value={value}>{children}</MomentsContext.Provider>;
}

export function useMoments() {
  const value = React.useContext(MomentsContext);
  if (!value) {
    return {
      moment: null,
      showMoment: () => {},
      clearMoment: () => {},
    };
  }
  return value;
}
