import { useEffect } from 'react';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
type Box = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

// Grid cells and headers sit outside the Tab order (tabindex -1) but are how
// you enter a data grid with the arrows.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), .MuiDataGrid-cell, .MuiDataGrid-columnHeader';

// Native controls that use the arrow keys without calling preventDefault.
// MUI widgets (tabs, menus, selects, autocomplete) call it, so the
// event.defaultPrevented check below already leaves them alone.
const OWNS_ARROWS =
  'input:not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select, [contenteditable=true]';

// Index of the nearest box in the arrow's direction, or -1. A box counts only
// when it lies past the current one's edge; boxes lined up with it (same row /
// column) win; off-axis distance counts double.
export const pickNext = (from: Box, boxes: Box[], key: ArrowKey): number => {
  const fx = (from.left + from.right) / 2;
  const fy = (from.top + from.bottom) / 2;
  let best = -1;
  let bestScore = Infinity;
  boxes.forEach((b, i) => {
    const bx = (b.left + b.right) / 2;
    const by = (b.top + b.bottom) / 2;
    let main: number;
    let cross: number;
    let inLine: boolean;
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      if (key === 'ArrowRight' ? b.left < from.right - 2 : b.right > from.left + 2) return;
      main =
        key === 'ArrowRight'
          ? Math.max(0, b.left - from.right)
          : Math.max(0, from.left - b.right);
      cross = Math.abs(by - fy);
      inLine = b.top < from.bottom && b.bottom > from.top;
    } else {
      if (key === 'ArrowDown' ? b.top < from.bottom - 2 : b.bottom > from.top + 2) return;
      main =
        key === 'ArrowDown'
          ? Math.max(0, b.top - from.bottom)
          : Math.max(0, from.top - b.bottom);
      cross = Math.abs(bx - fx);
      inLine = b.left < from.right && b.right > from.left;
    }
    const score = (inLine ? 0 : 1e6) + main + 2 * cross;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
};

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const isPlainArrow = (event: KeyboardEvent) =>
  ARROWS.includes(event.key) &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

// Focus the nearest control from `active` in the arrow's direction, inside the
// topmost open dialog/drawer if there is one. `leaving` is a widget being exited,
// whose own controls are skipped. Returns whether focus moved.
const moveFocus = (
  active: HTMLElement | null,
  key: ArrowKey,
  leaving?: Element
): boolean => {
  const modals = document.querySelectorAll(
    '.MuiModal-root:not(.MuiModal-hidden)'
  );
  const scope: ParentNode = modals[modals.length - 1] ?? document;
  const candidates = Array.from(
    scope.querySelectorAll<HTMLElement>(FOCUSABLE)
  ).filter(
    (el) =>
      !(leaving && leaving.contains(el)) &&
      !el.closest('[data-no-arrow-nav], [aria-hidden=true]') &&
      // zero-size: hidden elements, and dialog focus-trap sentinels that bounce focus to the top
      el.offsetWidth > 0 &&
      el.offsetHeight > 0 &&
      // collapsed submenus keep their box but can't take focus
      getComputedStyle(el).visibility === 'visible'
  );
  if (!candidates.length) return false;

  let target: HTMLElement | undefined;
  if (!active || (!leaving && !candidates.includes(active))) {
    // Nothing usable focused (page load, after "skip to content"): start
    // with the first control inside the focused area, else the page.
    target =
      candidates.find((el) => active && active.contains(el)) ?? candidates[0];
  } else {
    // Stay in the same area (header, sidebar, page content) while it has
    // something that way; cross over only from its edge.
    const region = (el: Element) => el.closest('[data-arrow-region]');
    const from = active.getBoundingClientRect();
    const pick = (list: HTMLElement[]) =>
      list[pickNext(from, list.map((el) => el.getBoundingClientRect()), key)];
    target =
      pick(candidates.filter((el) => region(el) === region(active))) ??
      pick(candidates);
  }
  if (!target) return false; // nothing that way: let the page scroll as usual
  // Fields below the fold of a scrolling form come into view as they're reached
  target.focus();
  target.scrollIntoView({ block: 'nearest' });
  return true;
};

// Widgets that would swallow this key instead of letting focus go on: a tab
// strip wraps around at its ends (disabled tabs are skipped), and a closed
// dropdown or autocomplete opens on Up/Down. Enter, Space or Alt+Down still open them.
const trappingWidget = (active: HTMLElement, key: ArrowKey): Element | null => {
  const vertical = key === 'ArrowUp' || key === 'ArrowDown';
  const tab = active.closest('[role=tab]');
  const tablist = tab?.closest('[role=tablist]');
  if (tab && tablist && !vertical) {
    const tabs = Array.from(
      tablist.querySelectorAll('[role=tab]:not([disabled])')
    );
    const index = tabs.indexOf(tab);
    const atEnd =
      key === 'ArrowRight' ? index === tabs.length - 1 : index === 0;
    return atEnd ? tablist : null;
  }
  const popup =
    active.closest('[role=combobox]') ??
    (active.matches('[aria-haspopup=listbox]') ? active : null);
  if (vertical && popup && popup.getAttribute('aria-expanded') !== 'true')
    return popup;
  return null;
};

// Arrow keys move focus to the nearest control on screen in that direction.
export default function useArrowNavigation() {
  useEffect(() => {
    let focusAtKeyDown: Element | null = null;

    // Capture phase: runs before the widgets' own handlers.
    const beforeWidgets = (event: KeyboardEvent) => {
      focusAtKeyDown = document.activeElement;
      if (!isPlainArrow(event)) return;
      const active = document.activeElement as HTMLElement | null;
      const widget = active && trappingWidget(active, event.key as ArrowKey);
      if (widget && moveFocus(active, event.key as ArrowKey, widget)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Bubble phase: runs after the widgets had their chance.
    const afterWidgets = (event: KeyboardEvent) => {
      if (!isPlainArrow(event)) return;
      const key = event.key as ArrowKey;
      const active = document.activeElement as HTMLElement | null;

      // A data grid moves between its cells itself; when an arrow didn't move
      // focus, the grid is at its edge, so carry on out of it.
      const gridBody = active?.closest('.MuiDataGrid-main');
      if (gridBody) {
        if (active === focusAtKeyDown && moveFocus(active, key, gridBody))
          event.preventDefault();
        return;
      }
      if (event.defaultPrevented) return;

      // Up/Down leave a text or number field (typing still edits it): always
      // for one line, at the first/last character for a multi-line one
      const field = active as HTMLInputElement | HTMLTextAreaElement;
      const leavesTextField =
        (key === 'ArrowUp' || key === 'ArrowDown') &&
        ((active instanceof HTMLInputElement &&
          ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(
            active.type
          )) ||
          (active instanceof HTMLTextAreaElement &&
            field.selectionStart === field.selectionEnd &&
            field.selectionStart ===
              (key === 'ArrowUp' ? 0 : field.value.length)));
      if (active?.closest(OWNS_ARROWS) && !leavesTextField) return;

      if (moveFocus(active, key)) event.preventDefault();
    };

    document.addEventListener('keydown', beforeWidgets, true);
    document.addEventListener('keydown', afterWidgets);
    return () => {
      document.removeEventListener('keydown', beforeWidgets, true);
      document.removeEventListener('keydown', afterWidgets);
    };
  }, []);
}
