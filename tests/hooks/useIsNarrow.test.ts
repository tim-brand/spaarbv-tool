// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsNarrow } from "../../src/hooks/useIsNarrow";

interface FakeMql {
  matches: boolean;
  addEventListener: (t: string, cb: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (t: string, cb: (e: MediaQueryListEvent) => void) => void;
}

let luisteraars: Array<(e: MediaQueryListEvent) => void> = [];
let huidig = false;

function installeer(): void {
  luisteraars = [];
  const mql: FakeMql = {
    get matches() { return huidig; },
    addEventListener: (_t, cb) => { luisteraars.push(cb); },
    removeEventListener: (_t, cb) => {
      luisteraars = luisteraars.filter((l) => l !== cb);
    },
  };
  vi.stubGlobal("matchMedia", () => mql);
}

describe("useIsNarrow", () => {
  beforeEach(() => { huidig = false; installeer(); });

  it("is false op een breed scherm", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
  });

  it("is true op een smal scherm", () => {
    huidig = true;
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(true);
  });

  it("reageert op een verandering van schermbreedte", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
    act(() => {
      huidig = true;
      for (const l of luisteraars) {
        l({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(result.current).toBe(true);
  });

  it("ruimt de luisteraar op bij unmount", () => {
    const { unmount } = renderHook(() => useIsNarrow());
    expect(luisteraars).toHaveLength(1);
    unmount();
    expect(luisteraars).toHaveLength(0);
  });
});
