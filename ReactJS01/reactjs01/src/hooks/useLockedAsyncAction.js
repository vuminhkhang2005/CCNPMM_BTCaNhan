import { useCallback, useEffect, useRef, useState } from "react";

const useLockedAsyncAction = () => {
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const run = useCallback(async (action) => {
    if (inFlightRef.current) return undefined;

    inFlightRef.current = true;
    if (mountedRef.current) setLoading(true);

    try {
      return await action();
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  return { loading, run };
};

export default useLockedAsyncAction;
