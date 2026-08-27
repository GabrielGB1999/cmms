import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import SignatureScreen, {
  SignatureViewRef
} from 'react-native-signature-canvas';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface SignaturePadProps {
  label: string;
  onChange: (base64Data: string) => void;
  value?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  onChange,
  value
}) => {
  const ref = useRef<SignatureViewRef>(null);
  const theme = useTheme();
  const { t }: { t: any } = useTranslation();
  // Only the signature the form opened with is worth pushing into the canvas. Feeding every later
  // value back in would re-inject the image the user just drew on each stroke.
  const initialValue = useRef(value);

  // readSignature() is what hands us the image, through onOK. Calling it as soon as a stroke ends
  // keeps the form value in step with the canvas, so there is no separate "save" step to forget.
  const handleEnd = () => ref.current?.readSignature();

  const handleClear = () => {
    ref.current?.clearSignature();
    onChange('');
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: transparent;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--body canvas {
      width: 100%;
      height: 100%;
      box-shadow: none;
    }`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.signatureContainer,
          { borderColor: theme.colors.outline }
        ]}
      >
        <SignatureScreen
          ref={ref}
          onOK={onChange}
          onEnd={handleEnd}
          onEmpty={() => onChange('')}
          dataURL={initialValue.current}
          imageType="image/png"
          trimWhitespace
          webStyle={webStyle}
        />
        {!value && (
          <Text
            style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
            pointerEvents="none"
          >
            {t('sign_here')}
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Button mode="outlined" onPress={handleClear}>
          {t('clear')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10
  },
  label: {
    fontSize: 16,
    marginBottom: 5
  },
  signatureContainer: {
    height: 250,
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden'
  },
  hint: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    fontSize: 12
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  }
});

export default SignaturePad;
