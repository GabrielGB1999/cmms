import { Theme, useMediaQuery } from '@mui/material';

export const useMobile = (): boolean =>
  useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

export const useTablet = (): boolean =>
  useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

export default useMobile;
