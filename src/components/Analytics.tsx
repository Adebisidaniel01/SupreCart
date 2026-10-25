import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

import {
  initializeAnalytics,
  trackOutboundClick,
  trackPageView,
  trackScrollDepth,
} from "@/lib/analytics";
import { CONSENT_CHANGE_EVENT } from "@/lib/consent";

const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100];

export function Analytics() {
  const href = useRouterState({ select: (state) => state.location.href });
  const currentHref = useRef(href);

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    currentHref.current = href;
    const timer = window.setTimeout(() => {
      trackPageView(href, document.title);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [href]);

  useEffect(() => {
    function handleConsentChange() {
      trackPageView(currentHref.current, document.title);
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  }, []);

  useEffect(() => {
    let frame = 0;
    const reached: number[] = [];
    function measure() {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !reached.includes(threshold)) {
          reached.push(threshold);
          trackScrollDepth(threshold, currentHref.current);
        }
      }
    }
    function handleScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [href]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const link = anchor.getAttribute("href");
      if (!link) return;
      const label = anchor.textContent?.trim() ?? undefined;
      if (link.startsWith("mailto:") || link.startsWith("tel:")) {
        trackOutboundClick(link, label);
        return;
      }
      try {
        const url = new URL(link, window.location.origin);
        if (url.origin !== window.location.origin) {
          trackOutboundClick(url.href, label);
        }
      } catch {
        return;
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
