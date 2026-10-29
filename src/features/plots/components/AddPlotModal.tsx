import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';


interface AddPlotModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOIL_TYPES = ['black', 'medium', 'light'] as const;
const IRRIGATION_TYPES = ['well', 'borewell', 'river', 'canal', 'pipeline', 'rainfed'] as const;
const WATER_TYPES = ['perennial', 'seasonal'] as const;
const AREA_UNITS = ['acre', 'hectare', 'guntha'] as const;

export function AddPlotModal({ visible, onClose }: AddPlotModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { createPlot, isDuplicateGatNumber } = usePlotStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gatNumber: '',
    area: '',
    areaUnit: 'acre' as typeof AREA_UNITS[number],
    soilType: 'black' as typeof SOIL_TYPES[number],
    irrigationType: 'well' as string,
    waterAvailability: 'perennial' as 'perennial' | 'seasonal',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateForm = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };


  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!form.name.trim()) errs.name = t('plotNameRequired');
      if (!form.gatNumber.trim()) errs.gatNumber = t('gatNumberRequired');
      if (isDuplicateGatNumber(form.gatNumber)) errs.gatNumber = t('gatNumberExists');
      if (!form.area || parseFloat(form.area) <= 0) errs.area = t('validAreaRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(step + 1);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await createPlot({
        name: form.name.trim(),
        gatNumber: form.gatNumber.trim(),
        area: parseFloat(form.area),
        areaUnit: form.areaUnit,
        soilType: form.soilType,
        irrigationType: form.irrigationType,
        waterAvailability: form.waterAvailability,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setForm({ name: '', gatNumber: '', area: '', areaUnit: 'acre', soilType: 'black', irrigationType: 'well', waterAvailability: 'perennial' });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderSelector = (
    options: readonly string[],
    selected: string,
    onSelect: (v: string) => void
  ) => (
    <View style={styles.optionGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          style={[
            styles.optionChip,
            {
              borderColor: selected === opt ? colors.primary : colors.border,
              backgroundColor: selected === opt ? colors.primary + '15' : colors.card,
              borderRadius: 8,
            },
          ]}
        >
          <Text style={{ color: selected === opt ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 13 }}>
            {t(opt)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('addPlot')}</Text>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('step')} {step}/3</Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: colors.primary }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('plotDetails')}</Text>
              <Input label={t('plotName')} value={form.name} onChangeText={(v) => updateForm('name', v)} error={errors.name} placeholder={t('plotNamePlaceholder')} />
              <Input label={t('gatNumber')} value={form.gatNumber} onChangeText={(v) => updateForm('gatNumber', v)} error={errors.gatNumber} placeholder={t('gatNumberPlaceholder')} />
              <Input label={t('area')} value={form.area} onChangeText={(v) => updateForm('area', v.replace(/[^0-9.]/g, ''))} error={errors.area} keyboardType="decimal-pad" placeholder="0.00" />
              <Text style={[styles.label, { color: colors.foreground }]}>{t('areaUnit')}</Text>
              {renderSelector(AREA_UNITS, form.areaUnit, (v) => updateForm('areaUnit', v))}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('soilType')}</Text>
              {renderSelector(SOIL_TYPES, form.soilType, (v) => updateForm('soilType', v))}

              <Text style={[styles.stepTitle, { color: colors.foreground, marginTop: 24 }]}>{t('irrigationType')}</Text>
              {renderSelector(IRRIGATION_TYPES, form.irrigationType, (v) => updateForm('irrigationType', v))}

              <Text style={[styles.stepTitle, { color: colors.foreground, marginTop: 24 }]}>{t('waterAvailability')}</Text>
              {renderSelector(WATER_TYPES, form.waterAvailability, (v) => updateForm('waterAvailability', v))}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('preview')}</Text>
              <Card>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('plotName')}</Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{form.name}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('gatNumber')}</Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{form.gatNumber}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('area')}</Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{form.area} {t(form.areaUnit)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('soilType')}</Text>
                  <Badge text={t(form.soilType)} variant="info" />
                </View>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('irrigationType')}</Text>
                  <Badge text={t(form.irrigationType)} variant="success" />
                </View>
                <View style={styles.previewRow}>
                  <Text style={{ color: colors.mutedFg }}>{t('waterAvailability')}</Text>
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>{t(form.waterAvailability)}</Text>
                </View>
              </Card>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {step > 1 && (
            <Button title={t('back')} onPress={() => setStep(step - 1)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
          )}
          {step < 3 ? (
            <Button title={t('next')} onPress={handleNext} style={{ flex: 1 }} />
          ) : (
            <Button title={t('save')} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  progressBar: { height: 3, marginHorizontal: 16 },
  progressFill: { height: '100%' },
  scroll: { padding: 16, paddingBottom: 40 },
  stepTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 16, minWidth: '30%', alignItems: 'center' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#E5E5E520' },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
});
