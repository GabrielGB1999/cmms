import React, { useCallback, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Box, Button, FormHelperText, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
  label: string;
  onChange: (base64Data: string) => void;
  value?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
}

const CANVAS_HEIGHT = 200;
/**
 * Exporting the canvas costs time proportional to its pixel count, and the result is carried around
 * as a base64 string, so a 3x display is nearly 2x the cost of a 2x one for no visible gain on a
 * signature.
 */
const MAX_PIXEL_RATIO = 2;
/**
 * Writing to the drawing costs an encode plus a form-wide re-render, so it waits until the pen has
 * been up this long. Anything that could read the value flushes it first, see flushPending below.
 */
const COMMIT_DELAY_MS = 400;

const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  onChange,
  value,
  disabled,
  error,
  errorMessage
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout>>(null);
  // Latest onChange, so the document-level listener below never closes over a stale one.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // What we last handed upwards, so an echo of our own value does not trigger a restore.
  const emitted = useRef<string>(value ?? '');
  // The signature the form opened with, used when a resize wipes an image we cannot redraw.
  const initialValue = useRef(value);
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();

  const commit = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (!sigCanvas.current) return;
    const data = sigCanvas.current.isEmpty()
      ? ''
      : sigCanvas.current.toDataURL('image/png');
    if (data === emitted.current) return;
    emitted.current = data;
    onChangeRef.current(data);
  }, []);

  /**
   * The canvas bitmap has to be sized in pixels, not with CSS: signature_pad maps pointer
   * coordinates onto the bitmap, so stretching a default 300x150 bitmap over a wider element makes
   * every stroke land away from the cursor. Resize the bitmap to the element, scale it for the
   * display, and carry the strokes over.
   */
  const fitCanvasToContainer = useCallback(() => {
    const canvas = sigCanvas.current?.getCanvas();
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.min(
      Math.max(window.devicePixelRatio || 1, 1),
      MAX_PIXEL_RATIO
    );
    const width = container.clientWidth;
    if (!width) return;
    if (
      canvas.width === width * ratio &&
      canvas.height === CANVAS_HEIGHT * ratio
    )
      return;

    // Strokes are stored as points, so they survive the bitmap being resized. An image restored
    // through fromDataURL is not in that list, hence the fallback to the initial value.
    const strokes = sigCanvas.current.toData();
    canvas.width = width * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sigCanvas.current.clear();
    if (strokes.length) sigCanvas.current.fromData(strokes);
    else if (initialValue.current)
      sigCanvas.current.fromDataURL(initialValue.current, {
        width,
        height: CANVAS_HEIGHT
      });
  }, []);

  useEffect(() => {
    fitCanvasToContainer();
    const observer = new ResizeObserver(fitCanvasToContainer);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitCanvasToContainer]);

  /**
   * Submitting, or touching any other field, can read the form value while an encode is still
   * pending. Capture-phase pointerdown runs before the click that submits, so the value is always
   * current by the time anything looks at it.
   */
  useEffect(() => {
    const flushPending = (event: PointerEvent) => {
      if (!commitTimer.current) return;
      if (containerRef.current?.contains(event.target as Node)) return;
      commit();
    };
    document.addEventListener('pointerdown', flushPending, true);
    return () => {
      document.removeEventListener('pointerdown', flushPending, true);
      if (commitTimer.current) clearTimeout(commitTimer.current);
    };
  }, [commit]);

  // Restore a signature set from outside - opening the form on an existing one, or a reset. Our own
  // commits are filtered out by the emitted ref so drawing never triggers this.
  useEffect(() => {
    const incoming = value ?? '';
    if (incoming === emitted.current) return;
    emitted.current = incoming;
    initialValue.current = value;
    if (!sigCanvas.current) return;
    if (incoming) {
      sigCanvas.current.fromDataURL(incoming, {
        width: containerRef.current?.clientWidth,
        height: CANVAS_HEIGHT
      });
    } else sigCanvas.current.clear();
  }, [value]);

  const handleEnd = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(commit, COMMIT_DELAY_MS);
  };

  const handleClear = () => {
    if (!sigCanvas.current) return;
    sigCanvas.current.clear();
    initialValue.current = undefined;
    commit();
  };

  return (
    <Box sx={{ my: 1 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          height: CANVAS_HEIGHT,
          borderRadius: 1,
          border: `1px solid ${
            error ? theme.colors.error.main : theme.colors.alpha.black[30]
          }`,
          backgroundColor: theme.colors.alpha.white[100],
          overflow: 'hidden',
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          // The canvas swallows touch scrolling, which is what we want while signing.
          touchAction: 'none',
          cursor: 'crosshair'
        }}
      >
        {/* Baseline and hint sit behind the canvas so they never end up in the exported image. */}
        <Box
          sx={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 48,
            borderBottom: `1px dashed ${theme.colors.alpha.black[30]}`,
            pointerEvents: 'none'
          }}
        />
        {!value && (
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              left: 24,
              bottom: 28,
              color: theme.colors.alpha.black[50],
              pointerEvents: 'none'
            }}
          >
            {t('sign_here')}
          </Typography>
        )}
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          // The library only re-fits the bitmap on window resize, and clears the drawing when it
          // does. fitCanvasToContainer covers mount and every container resize, keeping strokes.
          clearOnResize={false}
          canvasProps={{
            style: {
              position: 'relative',
              width: '100%',
              height: CANVAS_HEIGHT,
              touchAction: 'none'
            }
          }}
          onEnd={handleEnd}
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1
        }}
      >
        <Box>
          {error && errorMessage && (
            <FormHelperText error>{errorMessage}</FormHelperText>
          )}
        </Box>
        <Button variant="outlined" onClick={handleClear} disabled={disabled}>
          {t('clear')}
        </Button>
      </Box>
    </Box>
  );
};

export default SignaturePad;
