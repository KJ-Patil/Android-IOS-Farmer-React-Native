import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { parseBillData, SAMPLE_BILLS, ParsedBillData } from '../../../shared/services/ocrService';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';

interface OCRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (data: ParsedBillData) => void;
}

export function OCRScannerModal({ visible, onClose, onApply }: OCRScannerModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ParsedBillData | null>(null);
  const [editedResult, setEditedResult] = useState<ParsedBillData | null>(null);

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert(t('permissionNeeded'), t('cameraAccessRequired')); return; }
    const pic = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!pic.canceled && pic.assets[0]) {
      processImage(pic.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const pic = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!pic.canceled && pic.assets[0]) {
      processImage(pic.assets[0].uri);
    }
  };

  const processImage = async (_uri: string) => {
    setScanning(true);
    // In production, use ML Kit text recognition here.
    // For now, simulate OCR processing delay.
    setTimeout(() => {
      const simulated = SAMPLE_BILLS[0].text;
      const parsed = parseBillData(simulated);
      setResult(parsed);
      setEditedResult({ ...parsed });
      setScanning(false);
    }, 1500);
  };

  const handleDemoBill = (text: string) => {
    setScanning(true);
    setTimeout(() => {
      const parsed = parseBillData(text);
      setResult(parsed);
      setEditedResult({ ...parsed });
      setScanning(false);
    }, 500);
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('scanBill')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
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
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 8 }}>{t('camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGallery} style={[styles.actionCard, { backgroundColor: colors.info + '15', borderRadius: colors.radius }]}>
                  <Text style={{ fontSize: 28 }}>🖼️</Text>
                  <Text style={{ color: colors.info, fontWeight: '600', marginTop: 8 }}>{t('gallery')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>{t('demoBills')}</Text>
              {SAMPLE_BILLS.map((bill, i) => (
                <TouchableOpacity key={i} onPress={() => handleDemoBill(bill.text)}>
                  <Card style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{bill.name}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{bill.text.slice(0, 80)}...</Text>
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

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button title={t('scanAgain')} onPress={() => { setResult(null); setEditedResult(null); }} variant="outline" style={{ flex: 1 }} />
                <Button title={t('applyToEntry')} onPress={handleApply} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  scanningBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, paddingVertical: 28, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
});
