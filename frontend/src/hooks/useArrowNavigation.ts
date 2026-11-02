import { useEffect } from 'react';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
type Box = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Native controls that use the arrow keys without calling preventDefault.
// MUI widgets (tabs, menus, selects, autocomplete, grid) call it, so the
// event.defaultPrevented check below already leaves them alone.
const OWNS_ARROWS =
  'input:not([type=checkbox]):not([type=button]):not([type=submit]), textarea, select, [contenteditable=true], .MuiDataGrid-root';

// Index of the nearest box in the arrow's direction, or -1. Boxes lined up with
// the current one (same row / column) win; off-axis distance counts double.
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
      if (key === 'ArrowRight' ? bx <= fx + 1 : bx >= fx - 1) return;
      main =
        key === 'ArrowRight'
          ? Math.max(0, b.left - from.right)
          : Math.max(0, from.left - b.right);
      cross = Math.abs(by - fy);
      inLine = b.top < from.bottom && b.bottom > from.top;
    } else {
      if (key === 'ArrowDown' ? by <= fy + 1 : by >= fy - 1) return;
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

// Arrow keys move focus to the nearest control on screen in that direction,
// inside the topmost open dialog/drawer if there is one.
export default function useArrowNavigation() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key as ArrowKey;
      if (
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const active = document.activeElement as HTMLElement | null;
      // Up/Down leave a text field: always for one line, at the first/last
      // character for a multi-line one
      const field = active as HTMLInputElement | HTMLTextAreaElement;
      const leavesTextField =
        (key === 'ArrowUp' || key === 'ArrowDown') &&
        ((active instanceof HTMLInputElement &&
          ['text', 'email', 'password', 'search', 'tel', 'url'].includes(
            active.type
          )) ||
          (active instanceof HTMLTextAreaElement &&
            field.selectionStart === field.selectionEnd &&
            field.selectionStart ===
              (key === 'ArrowUp' ? 0 : field.value.length)));
      if (active?.closest(OWNS_ARROWS) && !leavesTextField) return;

      const modals = document.querySelectorAll(
        '.MuiModal-root:not(.MuiModal-hidden)'
      );
      const scope: ParentNode = modals[modals.length - 1] ?? document;
      const candidates = Array.from(
        scope.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(
        (el) =>
          !el.closest('[data-no-arrow-nav], [aria-hidden=true]') &&
          el.getClientRects().length > 0 &&
          // collapsed submenus keep their box but can't take focus
          getComputedStyle(el).visibility === 'visible'
      );
      if (!candidates.length) return;

      let target: HTMLElement | undefined;
      if (!active || !candidates.includes(active)) {
        // Nothing usable focused (page load, after "skip to content"): start
        // with the first control inside the focused area, else the page.
        target =
          candidates.find((el) => active && active.contains(el)) ??
          candidates[0];
      } else {
        const index = pickNext(
          active.getBoundingClientRect(),
          candidates.map((el) => el.getBoundingClientRect()),
          key
        );
        target = candidates[index];
      }
      if (!target) return; // nothing that way: let the page scroll as usual
      event.preventDefault();
      target.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
