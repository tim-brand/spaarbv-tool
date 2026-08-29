import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/**
 * True op smalle schermen. De grafieken kiezen dan grotere letters, andere
 * marges en minder tickmarks.
 *
 * Vervangt de resize-listener met debounce uit het origineel: matchMedia vuurt
 * alleen bij een echte overgang, dus geen last van iOS dat resize afvuurt
 * tijdens scrollen.
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent): void => setNarrow(e.matches);
    setNarrow(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return narrow;
}
