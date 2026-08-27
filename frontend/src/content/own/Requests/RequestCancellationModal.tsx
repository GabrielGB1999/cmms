import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useMobile from 'src/hooks/useMobile';
import Form from '../components/form';
import * as Yup from 'yup';
import { IField } from '../type';
import { useContext } from 'react';
import { cancelRequest } from 'src/slices/request';
import { useDispatch } from 'src/store';

interface SignatureProps {
    open: boolean;
    requestId: number;
    onClose: () => void;
    onCancel:()=>void;
}
export default function CompleteWOModal({
    open,
    onClose,
    requestId,
    onCancel

}: SignatureProps) {
    const { t }: { t: any } = useTranslation();
    const isMobile = useMobile();
    const dispatch = useDispatch();

    const fields: IField[] = [
        {
            name: 'feedback',
            type: 'text',
            label: t('feedback'),
            multiple: true
        }
    ];
    const shape = {
        feedback: Yup.string().required(t('required_feedback'))
    };

    return (
        <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose} fullScreen={isMobile}>
            <DialogTitle
                sx={{
                    p: 3
                }}
            >
                <Typography variant="h4" gutterBottom>
                    {t('reject')}
                </Typography>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    p: 3
                }}
            >
                <Form
                    fields={fields}
                    validation={Yup.object().shape(shape)}
                    submitText={t('reject')}
                    values={{}}
                    onChange={({ field, e }) => { }}
                    onSubmit={async (values) => {
                        return dispatch(cancelRequest(requestId, values.feedback))
                        .then(onCancel)
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
