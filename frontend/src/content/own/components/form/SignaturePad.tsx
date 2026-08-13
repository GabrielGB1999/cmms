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
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();

  /**
   * The canvas bitmap has to be sized in pixels, not with CSS: signature_pad maps pointer
   * coordinates onto the bitmap, so stretching a default 300x150 bitmap over a wider element makes
   * every stroke land away from the cursor. Resize the bitmap to the element, scale it by the
   * device pixel ratio to stay sharp on HiDPI screens, and carry the strokes over.
   */
  const fitCanvasToContainer = useCallback(() => {
    const canvas = sigCanvas.current?.getCanvas();
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = container.clientWidth;
    if (!width) return;
    if (
      canvas.width === width * ratio &&
      canvas.height === CANVAS_HEIGHT * ratio
    )
      return;

    // Strokes are stored as points, so they survive the bitmap being resized. An image restored
    // through fromDataURL is not in that list, hence the value fallback below.
    const strokes = sigCanvas.current.toData();
    canvas.width = width * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sigCanvas.current.clear();
    if (strokes.length) sigCanvas.current.fromData(strokes);
    else if (value) sigCanvas.current.fromDataURL(value, { width, height: CANVAS_HEIGHT });
  }, [value]);

  useEffect(() => {
    fitCanvasToContainer();
    const observer = new ResizeObserver(fitCanvasToContainer);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitCanvasToContainer]);

  // Restore a signature the form was opened with. Only meaningful on mount and on an external
  // reset, since drawing keeps the canvas and the form value in sync.
  useEffect(() => {
    if (!sigCanvas.current) return;
    if (value && sigCanvas.current.isEmpty()) {
      sigCanvas.current.fromDataURL(value, {
        width: containerRef.current?.clientWidth,
        height: CANVAS_HEIGHT
      });
    } else if (!value && !sigCanvas.current.isEmpty()) {
      sigCanvas.current.clear();
    }
  }, [value]);

  const handleEnd = () => {
    if (!sigCanvas.current) return;
    onChange(sigCanvas.current.toDataURL('image/png'));
  };

  const handleClear = () => {
    if (!sigCanvas.current) return;
    sigCanvas.current.clear();
    onChange('');
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
