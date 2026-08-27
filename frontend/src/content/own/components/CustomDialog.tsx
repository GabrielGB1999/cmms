import { Breakpoint, Dialog, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import useMobile from 'src/hooks/useMobile';

interface FormModalProps {
  children?: ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  maxWidth?: false | Breakpoint;
  fullScreen?: boolean;
}
function CustomDialog(props: FormModalProps) {
  const { open, onClose, children, title, subtitle, maxWidth, fullScreen } = props;
  const { t }: { t: any } = useTranslation();
  const isMobile = useMobile();
  const isFullScreen = fullScreen ?? isMobile;
  return (
    <Dialog
      fullWidth
      maxWidth={maxWidth ?? 'xs'}
      open={open}
      onClose={onClose}
      fullScreen={isFullScreen}
    >
      <DialogTitle
        sx={{
          p: 3
        }}
      >
        <Typography variant="h4" gutterBottom>
          {t(title)}
        </Typography>
        <Typography variant="subtitle2">{t(subtitle)}</Typography>
        {isFullScreen && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 12,
              top: 12
            }}
          >
            <CloseTwoToneIcon />
          </IconButton>
        )}
      </DialogTitle>
      {children}
    </Dialog>
  );
}

export default CustomDialog;
