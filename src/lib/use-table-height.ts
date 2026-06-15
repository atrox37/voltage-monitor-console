import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

import { APP_HEADER_HEIGHT, TABLE_HEAD_HEIGHT_MIDDLE } from "@/lib/table-layout";

/**
 * 鏍规嵁 window.innerHeight 鍑忓幓椤甸潰鍥哄畾鍖哄煙楂樺害锛屽姩鎬佽绠楄〃鏍?scroll.y銆? * 鐩戝惉 window resize 浜嬩欢锛岀獥鍙ｅ彉鍖栨椂鑷姩鏇存柊銆? *
 * @param overhead - 闄よ〃鏍?body 婊氬姩鍖轰互澶栥€侀〉闈㈠唴鎵€鏈夊浐瀹氶珮搴︿箣鍜岋紙涓嶅惈椤舵爮锛夈€? *   椤舵爮楂樺害鐢?{@link APP_HEADER_HEIGHT} 鍦?hook 鍐呭崟鐙墸闄ゃ€? */
export function useTableHeight(overhead: number): number {
  const calc = useCallback(
    () => Math.max(20, window.innerHeight - APP_HEADER_HEIGHT - overhead),
    [overhead],
  );

  const [height, setHeight] = useState(calc);

  useEffect(() => {
    const onResize = () => setHeight(calc());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [calc]);

  return height;
}

/** 监听容器 clientHeight，用于列表页表格区 flex 布局下动态计算 scrollY */
export function useContainerHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setHeight(el.clientHeight);
    };
    const schedule = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(el);
    schedule();
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [ref]);

  return height;
}

/** 表格容器高度减去表头，得到 body 可用 scrollY 上限 */
export function useTableBodyMaxScrollY(
  containerRef: RefObject<HTMLElement | null>,
  headHeight = TABLE_HEAD_HEIGHT_MIDDLE,
): number {
  const containerHeight = useContainerHeight(containerRef);
  return Math.max(20, containerHeight - headHeight);
}

export type AdaptiveTableScrollState = {
  scrollY: number;
  hasVerticalOverflow: boolean;
};

export function useAdaptiveTableScrollY(
  tableWrapRef: RefObject<HTMLElement | null>,
  maxHeight: number,
  deps: unknown[],
): AdaptiveTableScrollState {
  const [state, setState] = useState<AdaptiveTableScrollState>({
    scrollY: maxHeight,
    hasVerticalOverflow: false,
  });

  useLayoutEffect(() => {
    const root = tableWrapRef.current;
    if (!root) return;

    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    });

    const measure = () => {
      frame = 0;
      const contentNode =
        root.querySelector<HTMLElement>(".ant-table-body .ant-table-tbody") ??
        root.querySelector<HTMLElement>(".ant-table-content .ant-table-tbody") ??
        root.querySelector<HTMLElement>(".ant-table-placeholder");

      if (!contentNode) {
        setState({ scrollY: maxHeight, hasVerticalOverflow: false });
        return;
      }

      const naturalHeight = Math.ceil(contentNode.scrollHeight);
      const hasVerticalOverflow = naturalHeight > maxHeight + 1;
      const nextHeight = Math.max(20, Math.min(maxHeight, naturalHeight));
      setState((prev) =>
        Math.abs(prev.scrollY - nextHeight) <= 1 && prev.hasVerticalOverflow === hasVerticalOverflow
          ? prev
          : { scrollY: nextHeight, hasVerticalOverflow },
      );
    };

    const observe = (selector: string) => {
      const node = root.querySelector<HTMLElement>(selector);
      if (node) resizeObserver.observe(node);
    };

    observe(".ant-table-body");
    observe(".ant-table-content");
    observe(".ant-table-tbody");
    observe(".ant-table-placeholder");
    resizeObserver.observe(root);

    measure();
    window.addEventListener("resize", measure);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableWrapRef, maxHeight, ...deps]);

  return state;
}
