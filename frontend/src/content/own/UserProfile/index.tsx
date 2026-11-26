import { useContext, useEffect, useState } from 'react';

import { Helmet } from 'react-helmet-async';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Stack,
  TextField
} from '@mui/material';
import useRefMounted from 'src/hooks/useRefMounted';
import { useTranslation } from 'react-i18next';
import ProfileCover from './ProfileCover';
import RecentActivity from './RecentActivity';
import ProfileDetails from './ProfileDetails';
import { TitleContext } from '../../../contexts/TitleContext';
import useAuth from '../../../hooks/useAuth';
import api, { getErrorMessage } from '../../../utils/api';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import WorkOrder from '../../../models/owns/workOrder';
import { useNavigate } from 'react-router-dom';
import { homeUrl } from '../../../config';

function UserProfile() {
  const isMountedRef = useRefMounted();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // @ts-ignore
  const { t }: { t: any } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [backupPath, setBackupPath] = useState<string>('/var/backups/atlas');
  const [backingUp, setBackingUp] = useState<boolean>(false);
  useEffect(() => {
    setTitle(t('profile'));
  }, []);

  if (!user) {
    return null;
  }

  const onDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account?')) {
      const { success } = await api.deletes<{ success: boolean }>(`auth`);
      if (success) {
        logout();
        navigate('/');
      }
    }
  };

  const onBackup = async () => {
    setBackingUp(true);
    try {
      const { message } = await api.post<{ message: string }>('backup', {
        path: backupPath.trim()
      });
      showSnackBar(message, 'success');
    } catch (err) {
      showSnackBar(getErrorMessage(err, t('backup_failed')), 'error');
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{user.firstName} - Profile Details</title>
      </Helmet>
      <Grid
        sx={{
          px: 4
        }}
        container
        direction="row"
        justifyContent="center"
        alignItems="stretch"
        spacing={2}
      >
        <Grid item xs={12} md={4}>
          <ProfileCover user={user} />
        </Grid>
        <Grid item xs={12} md={8}>
          <RecentActivity />
        </Grid>
        <Grid item xs={12}>
          <ProfileDetails />
        </Grid>
        {user.role?.code === 'ADMIN' && (
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={t('system_backup')}
                subheader={t('system_backup_description')}
              />
              <Divider />
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('backup_path')}
                    helperText={t('backup_path_description')}
                    value={backupPath}
                    onChange={(event) => setBackupPath(event.target.value)}
                    disabled={backingUp}
                  />
                  <Button
                    variant="contained"
                    onClick={onBackup}
                    disabled={backingUp || !backupPath.trim()}
                    sx={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                  >
                    {backingUp ? t('backup_in_progress') : t('backup_now')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12}>
          <Button
            sx={{ mb: 2 }}
            onClick={onDeleteAccount}
            variant="contained"
            color="error"
          >
            {t('delete_account')}
          </Button>
        </Grid>
        {/*<Grid item xs={12} md={12}>*/}
        {/*  <MyCards />*/}
        {/*</Grid>*/}
      </Grid>
    </>
  );
}

export default UserProfile;
