import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../shared/services/logger';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { recognizeText, parseBillData, SAMPLE_BILLS, ParsedBillData } from '../../../shared/services/ocrService';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes } from '../../../shared/utils/typography';

interface OCRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (data: ParsedBillData) => void;
}

export function OCRScannerModal({ visible, onClose, onApply }: OCRScannerModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ParsedBillData | null>(null);
  const [editedResult, setEditedResult] = useState<ParsedBillData | null>(null);
  const [rawText, setRawText] = useState('');

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert(t('permissionNeeded'), t('cameraAccessRequired')); return; }
    const pic = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
      exif: false,
    });
    if (!pic.canceled && pic.assets[0]) {
      processImage(pic.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const pic = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsEditing: false,
      exif: false,
    });
    if (!pic.canceled && pic.assets[0]) {
      processImage(pic.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setScanning(true);
    try {
      const text = await recognizeText(uri, i18n.language);
      setRawText(text);
      const parsed = parseBillData(text);
      setResult(parsed);
      setEditedResult({ ...parsed });
    } catch (err: any) {
      logger.error('OCR scan error:', err);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setScanning(false);
    }
  };

  const handleDemoBill = (text: string) => {
    setScanning(true);
    setTimeout(() => {
      setRawText(text);
      const parsed = parseBillData(text);
      setResult(parsed);
      setEditedResult({ ...parsed });
      setScanning(false);
    }, 300);
  };

  const handleApply = () => {
    if (editedResult) {
      onApply(editedResult);
      onClose();
    }
  };

  const updateField = (key: keyof ParsedBillData, value: any) => {
    setEditedResult((r) => r ? { ...r, [key]: value } : null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('scanBill')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {scanning && (
            <View style={styles.scanningBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.primary, marginTop: 12, fontWeight: '600' }}>{t('scanning')}</Text>
            </View>
          )}

          {!result && !scanning && (
            <>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCamera} style={[styles.actionCard, { backgroundColor: colors.primary + '15', borderRadius: colors.radius }]}>
                  <Text style={{ fontSize: fontSizes.xxl }}>📷</Text>
                  <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 8 }}>{t('camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGallery} style={[styles.actionCard, { backgroundColor: '#3B82F6' + '15', borderRadius: colors.radius }]}>
                  <Text style={{ fontSize: fontSizes.xxl }}>🖼️</Text>
                  <Text style={{ color: '#3B82F6', fontWeight: '600', marginTop: 8 }}>{t('gallery')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>{t('demoBills')}</Text>
              {SAMPLE_BILLS.map((bill, i) => (
                <TouchableOpacity key={i} onPress={() => handleDemoBill(bill.text)}>
                  <Card style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{bill.name}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 4 }} numberOfLines={2}>{bill.text.slice(0, 80)}...</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )}

          {result && editedResult && !scanning && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>{t('extractedData')}</Text>
                <Badge
                  text={`${t('confidence')}: ${result.confidence}%`}
                  variant={result.confidence >= 60 ? 'success' : result.confidence >= 30 ? 'warning' : 'destructive'}
                />
              </View>

              <Input label={t('shopPartyName')} value={editedResult.shopName || ''} onChangeText={(v) => updateField('shopName', v)} />
              <Input label={t('billNumber')} value={editedResult.billNumber || ''} onChangeText={(v) => updateField('billNumber', v)} />
              <DatePickerInput label={t('date')} value={editedResult.date || ''} onChange={(v) => updateField('date', v)} />
              <Input label={t('amount')} value={editedResult.amount?.toString() || ''} onChangeText={(v) => updateField('amount', parseFloat(v) || 0)} keyboardType="decimal-pad" />
              <Input label={t('gstAmount')} value={editedResult.gstAmount?.toString() || ''} onChangeText={(v) => updateField('gstAmount', parseFloat(v) || 0)} keyboardType="decimal-pad" />
              <Input label={t('items')} value={editedResult.items || ''} onChangeText={(v) => updateField('items', v)} multiline />

              {rawText.length > 0 && (
                <TouchableOpacity
                  onPress={() => Alert.alert('Raw OCR Text', rawText)}
                  style={{ marginTop: 8, marginBottom: 4 }}
                >
                  <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: '600' }}>
                    {t('viewRawText') || 'View raw scanned text'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button title={t('scanAgain')} onPress={() => { setResult(null); setEditedResult(null); setRawText(''); }} variant="outline" style={{ flex: 1 }} />
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>{t('cancel')}</Text>
          </TouchableOpacity>
          {result && editedResult && (
            <TouchableOpacity onPress={handleApply} activeOpacity={0.7} style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A' }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>{t('applyToEntry')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: fontSizes.lg, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 40 },
  scanningBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, paddingVertical: 28, alignItems: 'center' },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '600', marginBottom: 12 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
