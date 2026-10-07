"use client";

import { usePathname } from "next/navigation";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * The modal navigation drawer contract, shared by the Workspace and Admin mobile menus (one
 * implementation, so the two products cannot drift; Admin had no trap before this):
 *
 *   - open FOR a path: navigating anywhere (a link inside it, or browser Back) closes it
 *     without an effect;
 *   - page scroll locked while open, and always released (close, navigation or unmount);
 *   - focus moves to the [data-autofocus] control on open, Tab and Shift+Tab stay inside
 *     the panel, Escape closes it, focus returns to the toggle on close;
 *   - a native <dialog> nested inside (Start a conversation) keeps its own keyboard.
 *
 * The caller renders role="dialog" + aria-modal on the panel and wires toggleRef, panelRef,
 * onKeyDown, openDrawer and close.
 */
export function useModalDrawer() {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt !== null && openAt === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setOpenAt(null), []);
  const openDrawer = useCallback(() => setOpenAt(pathname), [pathname]);

  // Scroll lock + initial focus while open; release + focus return when it closes.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        toggleRef.current?.focus();
      }

      return;
    }

    wasOpen.current = true;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // A native modal <dialog> nested in the drawer owns its own keyboard (Escape closes
      // that dialog only, Tab stays in it).
      if ((event.target as HTMLElement).closest("dialog[open]")) {
        return;
      }

      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [close]
  );

  return { open, openDrawer, close, toggleRef, panelRef, onKeyDown };
}
