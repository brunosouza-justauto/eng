import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X, Camera, FlashlightOff, Flashlight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

interface BarcodeScannerModalProps {
  visible: boolean;
  onBarcodeScanned: (barcode: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export const BarcodeScannerModal = ({
  visible,
  onBarcodeScanned,
  onClose,
}: BarcodeScannerModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorch(false);
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    onBarcodeScanned(result.data);
  };

  const handleClose = () => {
    setScanned(false);
    setTorch(false);
    onClose();
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
          <View style={styles.loadingContainer}>
            <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Loading camera...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={isDark ? '#FFFFFF' : '#1F2937'} />
            </Pressable>
          </View>

          <View style={styles.permissionContainer}>
            <Camera size={64} color={isDark ? '#6B7280' : '#9CA3AF'} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              Camera Permission Required
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginTop: 10,
                textAlign: 'center',
                paddingHorizontal: 40,
              }}
            >
              We need access to your camera to scan barcodes on food products.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={{
                marginTop: 24,
                paddingHorizontal: 32,
                paddingVertical: 14,
                backgroundColor: '#6366F1',
                borderRadius: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>
                Grant Permission
              </Text>
            </Pressable>
            <Pressable onPress={handleClose} style={{ marginTop: 16 }}>
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14 }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'code93',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.title}>Scan Barcode</Text>
            <Pressable onPress={() => setTorch(!torch)} style={styles.torchButton}>
              {torch ? (
                <Flashlight size={24} color="#FBBF24" />
              ) : (
                <FlashlightOff size={24} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {/* Scan area */}
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.instruction}>
              {scanned ? 'Processing...' : 'Point at a barcode to scan'}
            </Text>
            {scanned && (
              <Pressable
                onPress={() => setScanned(false)}
                style={styles.scanAgainButton}
              >
                <Text style={styles.scanAgainText}>Tap to scan again</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scanAreaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#6366F1',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanAgainButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 10,
  },
  scanAgainText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default BarcodeScannerModal;
