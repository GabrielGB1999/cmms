import { useEffect } from 'react';

// Keyboard gaps in the MUI date/time picker popup (@mui/lab DateTimePicker):
// - the clock takes Up/Down/Home/End but only a click on the dial commits a
//   value (moving on to minutes, then closing with the time kept); Escape and
//   clicking away revert it. Enter/Space now click the dial where its hand points;
// - Escape closed the dialog around the picker too, losing the whole form,
//   because the dialog sees the key first and the popup isn't a modal.
export default function usePickerKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target === document) return; // our own re-sent Escape
      const active = document.activeElement as HTMLElement | null;
      // The desktop popup is a non-modal [role=dialog] with no stable class
      const popup = active?.closest('[role=dialog]');
      if (!active || !popup || popup.closest('.MuiModal-root')) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        // The popup closes on an Escape reaching document; sent there directly
        // it never passes the dialog.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return;
      }

      const onDial =
        active.matches('[role=listbox]') &&
        active.closest('.MuiClockPicker-root');
      if (!onDial || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      // Dial children: the mouse-handling mask first, the hand (with its tip
      // as only child) right before the listbox; no hand when the time is disabled.
      const mask = active.parentElement?.firstElementChild;
      const tip = active.previousElementSibling?.firstElementChild;
      if (!mask || !tip) return;
      const r = tip.getBoundingClientRect();
      mask.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          clientX: (r.left + r.right) / 2,
          clientY: (r.top + r.bottom) / 2
        })
      );
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
