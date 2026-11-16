import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { X, ChevronRight, Check, MapPin, Layers, Droplets, Sparkles } from 'lucide-react-native';

interface AddPlotModalProps {
  visible: boolean;
  onClose: () => void;
}

const SOIL_TYPES = ['black', 'medium', 'light'] as const;
const IRRIGATION_TYPES = ['well', 'borewell', 'river', 'canal', 'pipeline', 'rainfed'] as const;
const WATER_TYPES = ['perennial', 'seasonal'] as const;
const AREA_UNITS = ['acre', 'hectare', 'guntha'] as const;

const SOIL_EMOJI: Record<string, string> = { black: '⬛', medium: '🟤', light: '🟡' };
const IRRIGATION_EMOJI: Record<string, string> = { well: '🪣', borewell: '🔧', river: '🏞️', canal: '🚿', pipeline: '🔌', rainfed: '🌧️' };
const WATER_EMOJI: Record<string, string> = { perennial: '💧', seasonal: '☁️' };

const STEP_ICONS = ['📋', '🌱', '✅'];
const STEP_LABELS_KEYS = ['plotDetails', 'soilAndWater', 'preview'];

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

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((s, idx) => (
        <React.Fragment key={s}>
          <TouchableOpacity
            onPress={() => { if (s < step) setStep(s); }}
            activeOpacity={s < step ? 0.7 : 1}
            style={[
              styles.stepCircle,
              {
                backgroundColor: s <= step ? colors.primary : colors.muted,
                shadowColor: s === step ? colors.primary : 'transparent',
                shadowOpacity: s === step ? 0.4 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: s === step ? 6 : 0,
              },
            ]}
          >
            {s < step ? (
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
            ) : (
              <Text style={{ fontSize: 16 }}>{STEP_ICONS[idx]}</Text>
            )}
          </TouchableOpacity>
          {idx < 2 && (
            <View style={[styles.stepLine, { backgroundColor: s < step ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderVisualSelector = (
    options: readonly string[],
    selected: string,
    onSelect: (v: string) => void,
    emojiMap: Record<string, string>,
    columns: 2 | 3 = 3,
  ) => (
    <View style={[styles.visualGrid, columns === 2 && { justifyContent: 'center', gap: 12 }]}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            style={[
              styles.visualCard,
              {
                backgroundColor: isSelected ? colors.primary + '12' : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
                borderWidth: isSelected ? 2 : 1,
                width: columns === 2 ? '45%' : '30%',
                shadowColor: isSelected ? colors.primary : '#000',
                shadowOpacity: isSelected ? 0.2 : 0.06,
                shadowRadius: isSelected ? 10 : 4,
                shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                elevation: isSelected ? 6 : 2,
              },
            ]}
          >
            <Text style={styles.visualEmoji}>{emojiMap[opt] || '🔹'}</Text>
            <Text
              style={[
                styles.visualLabel,
                {
                  color: isSelected ? colors.primary : colors.foreground,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {t(opt)}
            </Text>
            {isSelected && (
              <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                <Check size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('addPlot')}</Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
              {t(STEP_LABELS_KEYS[step - 1])}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Step Indicator */}
        <View style={[styles.stepContainer, { backgroundColor: colors.card }]}>
          {renderStepIndicator()}
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%`, backgroundColor: colors.primary }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Plot Details */}
          {step === 1 && (
            <View>
              <View style={styles.stepHeaderRow}>
                <Text style={{ fontSize: 28 }}>🌾</Text>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('plotDetails')}</Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('enterPlotBasicInfo') || 'Enter your plot basic information'}</Text>
                </View>
              </View>

              <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={styles.inputRow}>
                  <MapPin color={colors.primary} size={18} />
                  <Text style={[styles.inputIcon, { color: colors.foreground }]}>{t('plotName')}</Text>
                </View>
                <Input
                  value={form.name}
                  onChangeText={(v) => updateForm('name', v)}
                  error={errors.name}
                  placeholder={t('plotNamePlaceholder')}
                />

                <View style={styles.inputRow}>
                  <Text style={{ fontSize: 16 }}>🔢</Text>
                  <Text style={[styles.inputIcon, { color: colors.foreground }]}>{t('gatNumber')}</Text>
                </View>
                <Input
                  value={form.gatNumber}
                  onChangeText={(v) => updateForm('gatNumber', v)}
                  error={errors.gatNumber}
                  placeholder={t('gatNumberPlaceholder')}
                />

                <View style={styles.inputRow}>
                  <Text style={{ fontSize: 16 }}>📐</Text>
                  <Text style={[styles.inputIcon, { color: colors.foreground }]}>{t('area')}</Text>
                </View>
                <Input
                  value={form.area}
                  onChangeText={(v) => updateForm('area', v.replace(/[^0-9.]/g, ''))}
                  error={errors.area}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />

                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t('areaUnit')}</Text>
                <View style={styles.unitRow}>
                  {AREA_UNITS.map((u) => {
                    const sel = form.areaUnit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => updateForm('areaUnit', u)}
                        activeOpacity={0.7}
                        style={[
                          styles.unitChip,
                          {
                            backgroundColor: sel ? colors.primary : colors.muted,
                            shadowColor: sel ? colors.primary : 'transparent',
                            shadowOpacity: sel ? 0.3 : 0,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: sel ? 4 : 0,
                          },
                        ]}
                      >
                        <Text style={{ color: sel ? '#FFFFFF' : colors.foreground, fontWeight: '700', fontSize: 14 }}>
                          {t(u)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Soil & Irrigation */}
          {step === 2 && (
            <View>
              <View style={styles.stepHeaderRow}>
                <Text style={{ fontSize: 28 }}>🌱</Text>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('soilAndWater') || 'Soil & Water'}</Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('selectSoilWaterInfo') || 'Select soil and water details'}</Text>
                </View>
              </View>

              {/* Soil Type */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Layers color="#F59E0B" size={20} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('soilType')}</Text>
                </View>
                {renderVisualSelector(SOIL_TYPES, form.soilType, (v) => updateForm('soilType', v), SOIL_EMOJI, 3)}
              </View>

              {/* Irrigation */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Droplets color="#3B82F6" size={20} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('irrigationType')}</Text>
                </View>
                {renderVisualSelector(IRRIGATION_TYPES, form.irrigationType, (v) => updateForm('irrigationType', v), IRRIGATION_EMOJI, 3)}
              </View>

              {/* Water Availability */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Sparkles color="#10B981" size={20} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('waterAvailability')}</Text>
                </View>
                {renderVisualSelector(WATER_TYPES, form.waterAvailability, (v) => updateForm('waterAvailability', v), WATER_EMOJI, 2)}
              </View>
            </View>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <View>
              <View style={styles.stepHeaderRow}>
                <Text style={{ fontSize: 28 }}>✅</Text>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>{t('preview')}</Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('reviewAndSave') || 'Review your plot details and save'}</Text>
                </View>
              </View>

              <View style={[styles.previewCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
                {/* Plot name hero */}
                <View style={[styles.previewHero, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={{ fontSize: 36 }}>🌾</Text>
                  <Text style={[styles.previewName, { color: colors.foreground }]}>{form.name}</Text>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                    {t('gatNumber')}: {form.gatNumber}
                  </Text>
                </View>

                {/* Details rows */}
                <View style={styles.previewBody}>
                  <View style={[styles.previewItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.previewLeft}>
                      <Text style={{ fontSize: 18 }}>📐</Text>
                      <Text style={{ color: colors.mutedFg, fontSize: 14 }}>{t('area')}</Text>
                    </View>
                    <Text style={[styles.previewValue, { color: colors.foreground }]}>
                      {form.area} {t(form.areaUnit)}
                    </Text>
                  </View>

                  <View style={[styles.previewItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.previewLeft}>
                      <Text style={{ fontSize: 18 }}>{SOIL_EMOJI[form.soilType]}</Text>
                      <Text style={{ color: colors.mutedFg, fontSize: 14 }}>{t('soilType')}</Text>
                    </View>
                    <View style={[styles.previewBadge, { backgroundColor: '#F59E0B' + '18' }]}>
                      <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 13 }}>{t(form.soilType)}</Text>
                    </View>
                  </View>

                  <View style={[styles.previewItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.previewLeft}>
                      <Text style={{ fontSize: 18 }}>{IRRIGATION_EMOJI[form.irrigationType]}</Text>
                      <Text style={{ color: colors.mutedFg, fontSize: 14 }}>{t('irrigationType')}</Text>
                    </View>
                    <View style={[styles.previewBadge, { backgroundColor: '#3B82F6' + '18' }]}>
                      <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 13 }}>{t(form.irrigationType)}</Text>
                    </View>
                  </View>

                  <View style={[styles.previewItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.previewLeft}>
                      <Text style={{ fontSize: 18 }}>{WATER_EMOJI[form.waterAvailability]}</Text>
                      <Text style={{ color: colors.mutedFg, fontSize: 14 }}>{t('waterAvailability')}</Text>
                    </View>
                    <View style={[styles.previewBadge, { backgroundColor: '#10B981' + '18' }]}>
                      <Text style={{ color: '#047857', fontWeight: '700', fontSize: 13 }}>{t(form.waterAvailability)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}
          >
            <X color="#FFFFFF" size={18} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{t('cancel')}</Text>
          </TouchableOpacity>

          {step < 3 ? (
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.7}
              style={[styles.nextBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A' }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{t('next')}</Text>
              <ChevronRight color="#FFFFFF" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={loading}
              style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A', opacity: loading ? 0.6 : 1 }]}
            >
              <Check color="#FFFFFF" size={20} strokeWidth={3} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
                {loading ? '...' : t('save')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  stepContainer: {
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
  },
  progressBar: { height: 3 },
  progressFill: { height: '100%' },
  scroll: { padding: 16, paddingBottom: 30 },

  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  stepTitle: { fontSize: 20, fontWeight: '800' },

  // Step 1
  formCard: {
    borderRadius: 16,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inputIcon: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Step 2
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  visualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  visualCard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    position: 'relative',
  },
  visualEmoji: { fontSize: 26, marginBottom: 6 },
  visualLabel: { fontSize: 12, textAlign: 'center' },
  checkDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step 3
  previewCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  previewHero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  previewName: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  previewBody: { padding: 16 },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  previewLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewValue: { fontSize: 15, fontWeight: '700' },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  nextBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
