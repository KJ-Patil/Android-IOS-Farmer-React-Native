import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AddCropModal } from '../../crops/components/AddCropModal';
import { ArrowLeft, Sprout } from 'lucide-react-native';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';

export function PlotDashboardScreen({ route, navigation }: any) {
  const { plotId } = route.params;
  const [addCropVisible, setAddCropVisible] = useState(false);
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { plots, crops, fetchCrops, getPlotRemainingArea } = usePlotStore();
  const { fmtDMY, toNative } = useLocalizedFormat();

  const plot = plots.find((p) => p.id === plotId);
  const plotCrops = crops[plotId] || [];
  const remaining = getPlotRemainingArea(plotId);
  const usedArea = plot ? plot.area - remaining : 0;

  useEffect(() => {
    fetchCrops(plotId);
  }, [plotId]);

  if (!plot) return null;

  const occupancyPercent = plot.area > 0 ? (usedArea / plot.area) * 100 : 0;

  return (
    <ScreenLayout>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Header with Back button matching FarmerLedger */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.8}
          >
            <ArrowLeft color={colors.foreground} size={18} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{plot.name}</Text>
              <View style={[styles.gatBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.gatText, { color: colors.primary }]}>{t('gatNumber')} #{toNative(plot.gatNumber)}</Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
              {t('plotDashboardSubtitle')}
            </Text>
          </View>
        </View>

        {/* Plot Specifications Card */}
        <Card style={{ marginTop: 14 }}>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('gatNumber')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{toNative(plot.gatNumber)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('area')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {toNative(plot.area)} {t(plot.areaUnit || 'acre')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('soilType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {t(plot.soilType) || plot.soilType}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('irrigationType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{t(plot.irrigationType) || plot.irrigationType}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={{ color: colors.mutedFg }}>{t('waterAvailability')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>
              {t(plot.waterAvailability) || plot.waterAvailability}
            </Text>
          </View>
        </Card>

        {/* Area Occupancy Progress */}
        <Card style={{ marginTop: 14 }} padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t('areaOccupancy')}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(occupancyPercent, 100)}%`,
                  backgroundColor: occupancyPercent > 100 ? colors.destructive : colors.primary,
                },
              ]}
            />
          </View>
          <View style={styles.areaStats}>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {t('usedArea')}: <Text style={{ fontWeight: '700', color: colors.foreground }}>{toNative(usedArea.toFixed(2))}</Text>
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {t('remainingArea')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{toNative(remaining.toFixed(2))}</Text>
            </Text>
          </View>
        </Card>

        {/* Crops Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t('crops')} ({toNative(plotCrops.length)})
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
              {t('activeAndHarvestedCrops')}
            </Text>
          </View>
          <Button
            title={t('addCrop')}
            onPress={() => setAddCropVisible(true)}
            size="sm"
            disabled={remaining <= 0}
          />
        </View>

        {remaining <= 0 && (
          <Text style={{ color: colors.warning, fontSize: 12, marginBottom: 8 }}>
            {t('areaExceeded')}
          </Text>
        )}

        {plotCrops.length === 0 ? (
          <Card style={{ padding: 24, alignItems: 'center' }}>
            <Sprout color={colors.mutedFg} size={32} />
            <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 8 }}>
              {t('noCropsInPlot')}
            </Text>
          </Card>
        ) : (
          plotCrops.map((crop) => (
            <TouchableOpacity
              key={crop.id}
              onPress={() => navigation.navigate('CropDashboard', { plotId, cropId: crop.id })}
              activeOpacity={0.8}
            >
              <Card style={{ marginBottom: 10 }} padding={14}>
                <View style={styles.cropRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cropName, { color: colors.foreground }]}>
                      {t(crop.cropType)} {crop.variety ? `— ${crop.variety}` : ''}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 3 }}>
                      {toNative(crop.area)} {t(crop.areaUnit || 'acre')} • {t(crop.season.toLowerCase()) || crop.season} • {fmtDMY(crop.sowingDate)}
                    </Text>
                  </View>
                  <Badge
                    text={t(crop.status) || crop.status}
                    variant={
                      crop.status === 'harvested' || crop.status === 'completed'
                        ? 'success'
                        : crop.status === 'flowering'
                        ? 'warning'
                        : 'info'
                    }
                  />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <AddCropModal
        visible={addCropVisible}
        plotId={plotId}
        onClose={() => {
          setAddCropVisible(false);
          fetchCrops(plotId);
        }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  gatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  gatText: { fontSize: 13, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  areaStats: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  cropRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cropName: { fontSize: 15, fontWeight: '700' },
});
