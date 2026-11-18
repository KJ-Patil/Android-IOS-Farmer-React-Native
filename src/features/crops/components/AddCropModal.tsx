import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { Plus } from 'lucide-react-native';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { fontSizes } from '../../../shared/utils/typography';

interface AddCropModalProps {
  visible: boolean;
  onClose: () => void;
  plotId: string;
}

const CROP_PRESETS = ['rice', 'wheat', 'sugarcane', 'soybean', 'cotton', 'onion', 'tomato', 'grapes', 'pomegranate', 'banana', 'custom'] as const;
const SEASONS = ['kharif', 'rabi', 'zaid'] as const;
const AREA_UNITS = ['acre', 'hectare', 'guntha'] as const;

export function AddCropModal({ visible, onClose, plotId }: AddCropModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { createCrop, getPlotRemainingArea } = usePlotStore();

  const remaining = getPlotRemainingArea(plotId);
  const { toNative } = useLocalizedFormat();
  const [loading, setLoading] = useState(false);
  const [cropDropdownOpen, setCropDropdownOpen] = useState(false);
  const [addingCustomCrop, setAddingCustomCrop] = useState(false);
  const [form, setForm] = useState({
    cropType: '',
    customCropType: '',
    variety: '',
    area: '',
    areaUnit: 'acre' as string,
    season: 'kharif' as string,
    sowingDate: '',
    expectedHarvestDate: '',
  });

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const cropType = form.cropType === 'custom' ? form.customCropType : form.cropType;
    if (!cropType.trim()) { Alert.alert(t('error'), t('selectCropType')); return; }
    if (!form.variety.trim()) { Alert.alert(t('error'), t('varietyRequired')); return; }

    const area = parseFloat(form.area);
    if (!area || area <= 0) { Alert.alert(t('error'), t('validAreaRequired')); return; }
    if (area > remaining) { Alert.alert(t('error'), t('areaExceedsRemaining', { remaining: remaining.toFixed(2) })); return; }
    if (!form.sowingDate.trim()) { Alert.alert(t('error'), t('sowingDateRequired')); return; }

    setLoading(true);
    try {
      await createCrop(plotId, {
        cropType,
        variety: form.variety.trim(),
        area,
        areaUnit: form.areaUnit,
        season: form.season as any,
        sowingDate: form.sowingDate,
        expectedHarvestDate: form.expectedHarvestDate || undefined,
        status: 'sown',
      });
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🌱 {t('addCrop')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginBottom: 16 }}>
            {t('remainingArea')}: {toNative(remaining.toFixed(2))}
          </Text>

          <Text style={[styles.label, { color: colors.foreground }]}>{t('cropType')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => { setCropDropdownOpen(!cropDropdownOpen); setAddingCustomCrop(false); }}
              style={[styles.dropdown, { flex: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: form.cropType ? colors.foreground : colors.mutedFg, fontSize: fontSizes.md }}>
                {form.cropType === 'custom' && form.customCropType
                  ? form.customCropType
                  : form.cropType ? t(form.cropType) : t('selectCropType')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{cropDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setAddingCustomCrop(!addingCustomCrop); setCropDropdownOpen(false); updateForm('cropType', 'custom'); }}
              style={[styles.addCropBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.7}
            >
              <Plus color="#FFFFFF" size={16} />
              <Text style={{ color: '#FFFFFF', fontSize: fontSizes.sm, fontWeight: '700', marginLeft: 4 }}>{t('custom')}</Text>
            </TouchableOpacity>
          </View>
          {cropDropdownOpen && (
            <View style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {CROP_PRESETS.filter((c) => c !== 'custom').map((crop) => (
                <TouchableOpacity
                  key={crop}
                  onPress={() => { updateForm('cropType', crop); setCropDropdownOpen(false); setAddingCustomCrop(false); }}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: colors.border },
                    form.cropType === crop && { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text style={{ color: form.cropType === crop ? colors.primary : colors.foreground, fontWeight: form.cropType === crop ? '700' : '500', fontSize: fontSizes.base }}>
                    {t(crop)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {addingCustomCrop && (
            <Input label={t('enterCropName')} value={form.customCropType} onChangeText={(v) => updateForm('customCropType', v)} placeholder={t('enterCropName')} />
          )}

          <Input label={t('variety')} value={form.variety} onChangeText={(v) => updateForm('variety', v)} placeholder={t('varietyPlaceholder')} />

          <View style={styles.fieldSection}>
            <Input label={t('area')} value={form.area} onChangeText={(v) => updateForm('area', v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" />
            <View style={styles.unitRow}>
              {AREA_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  onPress={() => updateForm('areaUnit', u)}
                  style={[styles.unitBtn, { borderColor: form.areaUnit === u ? colors.primary : colors.border, backgroundColor: form.areaUnit === u ? colors.primary + '15' : colors.card, borderRadius: colors.radius }]}
                >
                  <Text style={{ color: form.areaUnit === u ? colors.primary : colors.foreground, fontSize: fontSizes.sm, fontWeight: '600' }}>{t(u)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldSection}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t('season')}</Text>
            <View style={styles.unitRow}>
              {SEASONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateForm('season', s)}
                  style={[styles.unitBtn, { borderColor: form.season === s ? colors.primary : colors.border, backgroundColor: form.season === s ? colors.primary + '15' : colors.card, borderRadius: colors.radius }]}
                >
                  <Text style={{ color: form.season === s ? colors.primary : colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>{t(s)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <DatePickerInput label={t('sowingDate')} value={form.sowingDate} onChange={(v) => updateForm('sowingDate', v)} />
          <DatePickerInput label={t('expectedHarvest')} value={form.expectedHarvestDate} onChange={(v) => updateForm('expectedHarvestDate', v)} />

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>✕ {t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={loading} style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A', opacity: loading ? 0.6 : 1 }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>{loading ? '...' : `✓ ${t('save')}`}</Text>
          </TouchableOpacity>
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
  label: { fontSize: fontSizes.base, fontWeight: '500', marginBottom: 6 },
  fieldSection: { marginBottom: 0 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 16 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  addCropBtn: { flexDirection: 'row', height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dropdownList: { borderWidth: 1, borderRadius: 12, marginBottom: 16, maxHeight: 220, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  unitBtn: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: 'row', padding: 16, paddingBottom: 34, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
