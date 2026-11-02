import { FC, ReactNode } from 'react';
import { alpha, Box, lighten, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Sidebar from './Sidebar';
import Header from './Header';

interface ExtendedSidebarLayoutProps {
  children?: ReactNode;
}

const ExtendedSidebarLayout: FC<ExtendedSidebarLayoutProps> = () => {
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();

  return (
    <>
      <Box
        sx={{
          flex: 1,
          height: '100%',

          '.MuiPageTitle-wrapper': {
            background:
              theme.palette.mode === 'dark'
                ? theme.colors.alpha.trueWhite[5]
                : theme.colors.alpha.white[50],
            marginBottom: `${theme.spacing(4)}`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? `0 1px 0 ${alpha(
                    lighten(theme.colors.primary.main, 0.7),
                    0.15
                  )}, 0px 2px 4px -3px rgba(0, 0, 0, 0.2), 0px 5px 12px -4px rgba(0, 0, 0, .1)`
                : `0px 2px 4px -3px ${alpha(
                    theme.colors.alpha.black[100],
                    0.1
                  )}, 0px 5px 12px -4px ${alpha(
                    theme.colors.alpha.black[100],
                    0.05
                  )}`
          }
        }}
      >
        {/* First Tab stop: lets keyboard users jump past the header and sidebar */}
        <Box
          component="a"
          href="#main-content"
          data-no-arrow-nav
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
          sx={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: theme.zIndex.tooltip,
            p: 1,
            borderRadius: 1,
            bgcolor: 'background.paper',
            transform: 'translateY(-200%)',
            '&:focus': { transform: 'none' }
          }}
        >
          {t('skip_to_content')}
        </Box>
        <Header />
        <Sidebar />
        <Box
          sx={{
            position: 'relative',
            zIndex: 5,
            display: 'block',
            flex: 1,
            pt: `${theme.header.height}`,
            [theme.breakpoints.up('lg')]: {
              ml: `${theme.sidebar.width}`
            }
          }}
        >
          <Box
            display="block"
            id="main-content"
            data-arrow-region="main"
            tabIndex={-1}
            sx={{ '&:focus-visible': { outline: 'none' } }}
          >
            <Outlet />
          </Box>
          {/*<ThemeSettings />*/}
        </Box>
      </Box>
    </>
  );
};

export default ExtendedSidebarLayout;
