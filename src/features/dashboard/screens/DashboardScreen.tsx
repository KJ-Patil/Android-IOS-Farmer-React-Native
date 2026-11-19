import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { useAuthStore } from '../../../shared/hooks/useAuthStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { useNotebookFarmStore, FarmType, NotebookFarm } from '../../../shared/hooks/useNotebookFarmStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { AddFarmModal } from '../../ledger/components/AddFarmModal';
import { EditFarmModal } from '../../ledger/components/EditFarmModal';
import { LinearGradient } from 'expo-linear-gradient';
import type { Transaction } from '../../../shared/types/ledger';
import {
  X,
  Sun,
  Sunset,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Droplets,
  MapPin,
  Navigation,
  Search as SearchIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes } from '../../../shared/utils/typography';

const FARM_EMOJI: Record<FarmType, string> = {
  dairy: '🐄',
  goat: '🐐',
  poultry: '🐔',
  fishery: '🐟',
  piggery: '🐷',
  sericulture: '🪱',
  apiary: '🐝',
  other: '🌾',
};

const ANIMAL_LABEL: Record<FarmType, string> = {
  dairy: 'cows',
  goat: 'goats',
  poultry: 'birds',
  fishery: 'fish',
  piggery: 'pigs',
  sericulture: 'trays',
  apiary: 'hives',
  other: 'animals',
};

function isDairyTransaction(tx: Transaction): boolean {
  return (
    tx.ledgerType === 'dairy' ||
    tx.incomeCategory === 'dairy' ||
    !!(tx.category && (tx.category.startsWith('dairy_') || tx.category.includes('dairy') || tx.category.includes('Dairy')))
  );
}

function getSelectionFinancials(
  txns: Transaction[],
  plotId: string,
  plotName: string,
  selectedCropId: string,
  crops: { id: string; cropType: string; variety?: string }[]
) {
  const pTxns = txns.filter(
    (tx) => tx.plotId === plotId || (plotName && tx.plotName === plotName)
  );

  if (selectedCropId === 'all') {
    const inc = pTxns.reduce((s, tx) => s + (tx.type === 'income' || !tx.type ? tx.amount || 0 : 0), 0);
    const exp = pTxns.reduce((s, tx) => s + (tx.type === 'expense' ? tx.amount || 0 : 0), 0);
    return { income: inc, expense: exp, profit: inc - exp };
  }

  const targetCrop = crops.find((c) => c.id === selectedCropId);
  const cropTxns = pTxns.filter((tx) => {
    if (tx.cropId && tx.cropId === selectedCropId) return true;
    if (targetCrop && tx.cropName) {
      const cn = tx.cropName.trim().toLowerCase();
      const ct = targetCrop.cropType.trim().toLowerCase();
      const cv = targetCrop.variety?.trim().toLowerCase();
      if (cn === ct || (cv && cn === cv)) return true;
    }
    return false;
  });

  const inc = cropTxns.reduce((s, tx) => s + (tx.type === 'income' || !tx.type ? tx.amount || 0 : 0), 0);
  const exp = cropTxns.reduce((s, tx) => s + (tx.type === 'expense' ? tx.amount || 0 : 0), 0);
  return { income: inc, expense: exp, profit: inc - exp };
}

export function DashboardScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const { transactions, fetchTransactions } = useLedgerStore();
  const { plots, fetchPlots, crops, fetchCrops } = usePlotStore();
  const { farms, fetchFarms } = useNotebookFarmStore();
  const { fmtCurrency, toNative } = useLocalizedFormat();

  const [addFarmVisible, setAddFarmVisible] = useState(false);
  const [editingFarm, setEditingFarm] = useState<NotebookFarm | null>(null);
  const [selectedCropByPlot, setSelectedCropByPlot] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(true);

  // Weather & location state
  const [tempC, setTempC] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [dailyWeather, setDailyWeather] = useState<any[]>([]);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [savedLocations, setSavedLocations] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<{ name: string; lat: number; lon: number; country: string; admin1: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searchingLocation, setSearchingLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const STORAGE_KEY_LOC = 'farmer_weather_location';
  const STORAGE_KEY_SAVED = 'farmer_saved_locations';

  const getWeatherInfo = (code: number) => {
    if (code === 0) return { label: 'Clear Sky', Icon: Sun, color: '#F59E0B' };
    if (code <= 3) return { label: 'Partly Cloudy', Icon: Cloud, color: '#94A3B8' };
    if (code <= 48) return { label: 'Foggy', Icon: CloudFog, color: '#94A3B8' };
    if (code <= 55) return { label: 'Drizzle', Icon: CloudDrizzle, color: '#60A5FA' };
    if (code <= 65) return { label: 'Rainy', Icon: CloudRain, color: '#3B82F6' };
    if (code <= 75) return { label: 'Snowy', Icon: CloudSnow, color: '#CBD5E1' };
    if (code <= 82) return { label: 'Rain Showers', Icon: CloudRain, color: '#2563EB' };
    if (code <= 95) return { label: 'Thunderstorm', Icon: CloudLightning, color: '#7C3AED' };
    return { label: 'Stormy', Icon: CloudLightning, color: '#7C3AED' };
  };

  const loadSavedLocations = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SAVED);
      if (raw) setSavedLocations(JSON.parse(raw));
      const active = await AsyncStorage.getItem(STORAGE_KEY_LOC);
      if (active) setWeatherLocation(JSON.parse(active));
    } catch {}
  }, []);

  const saveLocation = useCallback(async (loc: { name: string; lat: number; lon: number }) => {
    setWeatherLocation(loc);
    await AsyncStorage.setItem(STORAGE_KEY_LOC, JSON.stringify(loc));
    setSavedLocations((prev) => {
      const exists = prev.some((l) => l.name === loc.name);
      const updated = exists ? prev : [...prev, loc];
      AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeSavedLocation = useCallback(async (name: string) => {
    setSavedLocations((prev) => {
      const updated = prev.filter((l) => l.name !== name);
      AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const searchCity = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setLocationResults([]); return; }
    setSearchingLocation(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`
      );
      const data = await res.json();
      if (data.results) {
        setLocationResults(data.results.map((r: any) => ({
          name: r.name,
          lat: r.latitude,
          lon: r.longitude,
          country: r.country || '',
          admin1: r.admin1 || '',
        })));
      } else {
        setLocationResults([]);
      }
    } catch {
      setLocationResults([]);
    }
    setSearchingLocation(false);
  }, []);

  const useCurrentGPS = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Location permission required'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      let name = 'Current Location';
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (place) name = [place.city, place.district, place.region].filter(Boolean).join(', ') || 'Current Location';
      } catch {}
      await saveLocation({ name, lat: loc.coords.latitude, lon: loc.coords.longitude });
      setShowLocationPicker(false);
    } catch {}
  }, [saveLocation]);

  const fetchWeatherForLocation = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max&past_days=7&forecast_days=5&timezone=auto`
      );
      const data = await res.json();
      if (data.current_weather?.temperature != null) {
        setTempC(data.current_weather.temperature);
        setWeatherCode(data.current_weather.weathercode || 0);
      }
      if (data.daily) {
        const days: any[] = [];
        const today = new Date().toISOString().split('T')[0];
        for (let i = 0; i < data.daily.time.length; i++) {
          days.push({
            date: data.daily.time[i],
            maxTemp: data.daily.temperature_2m_max[i],
            minTemp: data.daily.temperature_2m_min[i],
            code: data.daily.weathercode[i],
            rain: data.daily.precipitation_sum[i],
            wind: data.daily.windspeed_10m_max[i],
            isToday: data.daily.time[i] === today,
            isPast: data.daily.time[i] < today,
          });
        }
        setDailyWeather(days);
      }
    } catch {}
  }, []);

  const fetchTemperature = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_LOC).catch(() => null);
    if (saved) {
      const loc = JSON.parse(saved);
      setWeatherLocation(loc);
      await fetchWeatherForLocation(loc.lat, loc.lon);
      return;
    }

    let lat = 19.076;
    let lon = 72.8777;
    let name = 'Mumbai';

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          lat = lastKnown.coords.latitude;
          lon = lastKnown.coords.longitude;
        } else {
          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          lat = current.coords.latitude;
          lon = current.coords.longitude;
        }
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (place) name = place.city || place.district || place.region || 'Your Location';
        } catch {}
      }
    } catch {}

    setWeatherLocation({ name, lat, lon });
    await fetchWeatherForLocation(lat, lon);
  }, [fetchWeatherForLocation]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchTransactions(), fetchPlots(), fetchFarms()]);
      setInitialLoading(false);
      loadSavedLocations();
      fetchTemperature();
    };
    init();
  }, [fetchTransactions, fetchPlots, fetchFarms, loadSavedLocations, fetchTemperature]);

  useEffect(() => {
    if (plots.length > 0) {
      plots.forEach((p) => {
        fetchCrops(p.id);
      });
    }
  }, [plots, fetchCrops]);

  // Compute financial metrics consistent with Ledger
  const totalRevenue = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + (tx.type === 'income' || !tx.type ? tx.amount || 0 : 0), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + (tx.type === 'expense' ? tx.amount || 0 : 0), 0);
  }, [transactions]);

  const incomeCount = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'income' || !tx.type).length;
  }, [transactions]);

  const expenseCount = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'expense').length;
  }, [transactions]);

  const summaries = useMemo(() => {
    const plotMap: Record<string, { income: number; expense: number }> = {};
    let dairyIncome = 0;
    let dairyExpense = 0;
    let hasDairy = false;

    for (const plot of plots) {
      plotMap[plot.id] = { income: 0, expense: 0 };
    }

    for (const tx of transactions) {
      const amt = tx.amount || 0;
      if (tx.plotId && plotMap[tx.plotId]) {
        if (tx.type === 'income') plotMap[tx.plotId].income += amt;
        else plotMap[tx.plotId].expense += amt;
      }

      if (isDairyTransaction(tx)) {
        hasDairy = true;
        if (tx.type === 'income') dairyIncome += amt;
        else dairyExpense += amt;
      }
    }

    const plotStats = plots.map((p) => {
      const plotCropsList = crops[p.id] || [];
      const mentionedCrops = plotCropsList.map((c) => {
        const isDone = c.status === 'harvested' || c.status === 'completed';
        return {
          id: c.id,
          cropType: c.cropType,
          variety: c.variety,
          area: c.area,
          areaUnit: c.areaUnit,
          rawStatus: c.status,
          isDone,
        };
      });

      return {
        id: p.id,
        name: p.name,
        gatNumber: p.gatNumber,
        area: p.area,
        areaUnit: p.areaUnit,
        soilType: p.soilType,
        income: plotMap[p.id]?.income || 0,
        expense: plotMap[p.id]?.expense || 0,
        crops: mentionedCrops,
      };
    });

    const farmStats = farms.map((f) => {
      const farmTxns = transactions.filter((tx) => tx.farmId === f.id);
      const income = farmTxns.filter((tx) => tx.type === 'income').reduce((s, tx) => s + (tx.amount || 0), 0);
      const expense = farmTxns.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + (tx.amount || 0), 0);
      return { id: f.id, name: f.name, type: f.type, animalCount: f.animalCount, income, expense };
    });

    return { plotStats, farmStats, dairyIncome, dairyExpense, hasDairy };
  }, [transactions, plots, farms, crops]);

  const plotFinancials = useMemo(() => {
    const result: Record<string, Record<string, { income: number; expense: number; profit: number }>> = {};
    for (const ps of summaries.plotStats) {
      result[ps.id] = {};
      result[ps.id]['all'] = getSelectionFinancials(transactions, ps.id, ps.name, 'all', ps.crops);
      for (const c of ps.crops) {
        result[ps.id][c.id] = getSelectionFinancials(transactions, ps.id, ps.name, c.id, ps.crops);
      }
    }
    return result;
  }, [transactions, summaries.plotStats]);

  const formatC = (v: number) => fmtCurrency(v);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t('goodMorning'), Icon: Sun, iconColor: '#FDE047' };
    if (hour < 17) return { text: t('goodAfternoon'), Icon: Sunset, iconColor: '#FB923C' };
    return { text: t('goodEvening'), Icon: Moon, iconColor: '#E2E8F0' };
  };

  const greeting = getGreeting();
  const firstName = user?.fullName?.split(' ')[0] || '';

  const langLocaleMap: Record<string, string> = {
    en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN',
    kn: 'kn-IN', bn: 'bn-IN', gu: 'gu-IN', ml: 'ml-IN', pa: 'pa-IN', od: 'or-IN',
  };
  const todayFormatted = toNative(new Date().toLocaleDateString(langLocaleMap[i18n.language] || 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));

  return (
    <ScreenLayout noPadding noTopInset>
      {initialLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#16A34A', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <greeting.Icon size={20} color={greeting.iconColor} />
              <Text style={styles.greetingText} numberOfLines={1}>
                {greeting.text}{firstName ? `, ${firstName}` : ''}
              </Text>
            </View>
            {tempC != null && (
              <TouchableOpacity
                onPress={() => setWeatherModalOpen(true)}
                activeOpacity={0.7}
                style={styles.tempBadge}
              >
                {React.createElement(getWeatherInfo(weatherCode).Icon, { size: 16, color: '#FDE047' })}
                <View style={{ maxWidth: 72 }}>
                  <Text style={styles.tempValue}>{Math.round(tempC)}°C</Text>
                  <Text style={styles.tempSub} numberOfLines={1}>
                    {weatherLocation?.name ? weatherLocation.name.split(',')[0].substring(0, 10) : `${Math.round(tempC * 9 / 5 + 32)}°F`}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.waveDate}>{todayFormatted}</Text>
        </LinearGradient>

        <View style={styles.contentPadding}>
          {/* KPI Grid: Revenue & Expenses */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalRevenue')}</Text>
              <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
                {formatC(totalRevenue)}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.mutedFg }]}>
                {toNative(incomeCount)} {t('entries')}
              </Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalExpenses')}</Text>
              <Text style={[styles.kpiValue, { color: colors.destructive }]}>
                {formatC(totalExpenses)}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.mutedFg }]}>
                {toNative(expenseCount)} {t('entries')}
              </Text>
            </View>
          </View>

          {/* My Farms */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('myFarms')}</Text>
            <TouchableOpacity
              onPress={() => setAddFarmVisible(true)}
              style={[styles.sectionActionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.sm }}>+ {t('add')}</Text>
            </TouchableOpacity>
          </View>

          {summaries.farmStats.length === 0 ? (
            <TouchableOpacity
              onPress={() => setAddFarmVisible(true)}
              style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: fontSizes.xxl, marginBottom: 4 }}>🐄</Text>
              <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.base }}>
                + {t('addFarm')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 2 }}>
                Dairy, Goat, Poultry, etc.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.kpiGrid}>
              {summaries.farmStats.map((fs) => {
                const farmObj = farms.find((f) => f.id === fs.id);
                return (
                  <TouchableOpacity
                    key={fs.id}
                    onPress={() => { if (farmObj) setEditingFarm(farmObj); }}
                    activeOpacity={0.7}
                    style={[styles.farmCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={styles.kpiEmoji}>{FARM_EMOJI[fs.type] || '🌾'}</Text>
                    <Text style={[styles.kpiName, { color: colors.foreground }]} numberOfLines={1}>
                      {fs.name}
                    </Text>
                    {fs.animalCount ? (
                      <View style={[styles.animalRow, { backgroundColor: colors.surfacePurpleText + '12' }]}>
                        <Text style={[styles.animalCount, { color: colors.surfacePurpleText }]}>{toNative(fs.animalCount)}</Text>
                        <Text style={[styles.animalLabel, { color: colors.surfacePurpleText }]}>{t(ANIMAL_LABEL[fs.type])}</Text>
                      </View>
                    ) : null}
                    <View style={styles.kpiAmounts}>
                      <Text style={styles.kpiIncome}>+{formatC(fs.income)}</Text>
                      <Text style={styles.kpiExpense}>-{formatC(fs.expense)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* My Plots */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('plots')}</Text>
              <View style={[styles.plotCountBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.plotCountText, { color: colors.primary }]}>{toNative(summaries.plotStats.length)}</Text>
              </View>
            </View>
          </View>

          {summaries.plotStats.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('PlotsTab')}
              activeOpacity={0.7}
              style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: fontSizes.xxl, marginBottom: 4 }}>🌱</Text>
              <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.base }}>
                + {t('addPlot') || t('plots')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 2 }}>
                {t('noPlotsFound') || 'No land plots recorded yet'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.plotListContainer}>
              {summaries.plotStats.map((ps) => {
                const activeCropId = selectedCropByPlot[ps.id] || 'all';
                const selectedCrop = activeCropId !== 'all' ? ps.crops.find((c) => c.id === activeCropId) : null;
                const fin = plotFinancials[ps.id]?.[activeCropId] || { income: 0, expense: 0, profit: 0 };

                return (
                  <TouchableOpacity
                    key={ps.id}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('PlotsTab', { screen: 'PlotDashboard', params: { plotId: ps.id } })}
                    style={[styles.plotCardDetailed, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {/* Plot Card Header */}
                    <View style={styles.plotHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: fontSizes.lg }}>🌱</Text>
                          <Text style={[styles.plotTitleText, { color: colors.foreground }]} numberOfLines={1}>
                            {ps.name}
                          </Text>
                          {ps.gatNumber ? (
                            <View style={[styles.gatPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                              <Text style={[styles.gatPillText, { color: colors.primary }]}>
                                {t('gatNumber')} #{toNative(ps.gatNumber)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.plotSubtitleText, { color: colors.mutedFg }]}>
                          {toNative(ps.area)} {t(ps.areaUnit || 'acre')} • {t(ps.soilType || 'medium')} {t('soil')}
                        </Text>
                      </View>
                    </View>

                    {/* Crop Selection Bar (Only Farmer-Mentioned Crops) */}
                    {ps.crops.length > 0 && (
                      <View style={styles.cropSelectorWrapper}>
                        <Text style={[styles.cropSelectorLabel, { color: colors.mutedFg }]}>
                          {t('selectCrop') || 'Select Crop'}:
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.cropChipsScrollRow}
                        >
                          {/* All Crops Option */}
                          <TouchableOpacity
                            onPress={() => setSelectedCropByPlot((prev) => ({ ...prev, [ps.id]: 'all' }))}
                            activeOpacity={0.7}
                            style={[
                              styles.cropPillBtn,
                              {
                                backgroundColor: activeCropId === 'all' ? colors.primary : colors.card,
                                borderColor: activeCropId === 'all' ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.cropPillBtnText,
                                { color: activeCropId === 'all' ? '#FFFFFF' : colors.foreground },
                              ]}
                            >
                              🌱 {t('allCrops')}
                            </Text>
                          </TouchableOpacity>

                          {/* Individual Mentioned Crops */}
                          {ps.crops.map((c) => {
                            const isSelected = activeCropId === c.id;
                            return (
                              <TouchableOpacity
                                key={c.id}
                                onPress={() => setSelectedCropByPlot((prev) => ({ ...prev, [ps.id]: c.id }))}
                                activeOpacity={0.7}
                                style={[
                                  styles.cropPillBtn,
                                  {
                                    backgroundColor: isSelected ? colors.primary : (c.isDone ? colors.surfaceNeutral : colors.surfaceSuccess),
                                    borderColor: isSelected ? colors.primary : (c.isDone ? colors.surfaceNeutralBorder : colors.surfaceSuccessBorder),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.cropPillBtnText,
                                    {
                                      color: isSelected ? '#FFFFFF' : (c.isDone ? colors.surfaceNeutralText : colors.surfaceSuccessText),
                                    },
                                  ]}
                                >
                                  🌾 {t(c.cropType) || c.cropType} {c.variety ? `(${c.variety})` : ''}
                                </Text>
                                <View
                                  style={[
                                    styles.miniStatusDot,
                                    { backgroundColor: isSelected ? '#FFFFFF' : (c.isDone ? colors.surfaceDoneText : colors.success) },
                                  ]}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Active Selected Scope & Status Banner */}
                    <View style={[styles.selectedScopeBanner, { backgroundColor: colors.muted + '20' }]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.selectedScopeTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {selectedCrop
                            ? `🌾 ${t(selectedCrop.cropType) || selectedCrop.cropType} ${selectedCrop.variety ? '(' + selectedCrop.variety + ')' : ''}`
                            : `🌱 ${ps.name} (${t('allCrops')})`}
                        </Text>
                        <Text style={{ fontSize: fontSizes.xs, color: colors.mutedFg, marginTop: 1 }}>
                          {selectedCrop
                            ? (selectedCrop.area ? `${toNative(selectedCrop.area)} ${t(selectedCrop.areaUnit || 'acre')}` : '')
                            : `${toNative(ps.crops.length)} ${t('crops')}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.cropStatusBadge,
                          {
                            backgroundColor: selectedCrop
                              ? (selectedCrop.isDone ? colors.surfaceDone : colors.surfaceSuccess)
                              : colors.primary + '18',
                            borderColor: selectedCrop
                              ? (selectedCrop.isDone ? colors.surfaceDoneBorder : colors.success)
                              : colors.primary + '30',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cropStatusBadgeText,
                            {
                              color: selectedCrop
                                ? (selectedCrop.isDone ? colors.surfaceDoneText : colors.surfaceSuccessText)
                                : colors.primary,
                            },
                          ]}
                        >
                          {selectedCrop
                            ? (selectedCrop.isDone ? `✓ ${t('done') || 'Done'}` : `● ${t('goingLive') || 'Going Live'}`)
                            : `${toNative(ps.crops.length)} ${t('crops')}`}
                        </Text>
                      </View>
                    </View>

                    {/* Income & Expense Display for Selected Crop / Scope */}
                    <View style={[styles.plotIncomeExpenseBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.plotIncomeCol}>
                        <Text style={[styles.plotBarLabel, { color: colors.mutedFg }]}>{t('income')}</Text>
                        <Text style={[styles.plotBarValue, { color: '#16A34A' }]}>+{formatC(fin.income)}</Text>
                      </View>
                      <View style={[styles.plotBarDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.plotIncomeCol}>
                        <Text style={[styles.plotBarLabel, { color: colors.mutedFg }]}>{t('expense')}</Text>
                        <Text style={[styles.plotBarValue, { color: colors.destructive }]}>-{formatC(fin.expense)}</Text>
                      </View>
                      <View style={[styles.plotBarDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.plotIncomeCol}>
                        <Text style={[styles.plotBarLabel, { color: colors.mutedFg }]}>{t('netProfit')}</Text>
                        <Text style={[styles.plotBarValue, { color: fin.profit >= 0 ? '#16A34A' : colors.destructive }]}>
                          {fin.profit >= 0 ? '+' : ''}{formatC(fin.profit)}
                        </Text>
                      </View>
                    </View>

                    {ps.crops.length === 0 && (
                      <View style={[styles.noCropNotice, { backgroundColor: colors.muted + '15', marginTop: 4 }]}>
                        <Text style={[styles.noCropText, { color: colors.mutedFg }]}>
                          {t('noCropsMentioned') || 'No crops mentioned yet for this plot'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {summaries.hasDairy && (
                <View
                  style={[styles.dairyCard, { backgroundColor: colors.card, borderColor: colors.warning }]}
                >
                  <Text style={styles.kpiEmoji}>🥛</Text>
                  <Text style={[styles.kpiName, { color: colors.foreground }]}>
                    {t('dairyFarming')}
                  </Text>
                  <View style={styles.kpiAmounts}>
                    <Text style={styles.kpiIncome}>+{formatC(summaries.dairyIncome)}</Text>
                    <Text style={styles.kpiExpense}>-{formatC(summaries.dairyExpense)}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
      )}

      {/* Weather Detail Modal */}
      <Modal visible={weatherModalOpen} animationType="slide" onRequestClose={() => { setWeatherModalOpen(false); setShowLocationPicker(false); }}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0, backgroundColor: colors.overlay }]}>
          <View style={[styles.weatherModal, { backgroundColor: colors.card }]}>
            <View style={styles.dragHandle} />
            <View style={styles.weatherModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weatherModalTitle, { color: colors.foreground }]}>Weather</Text>
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(!showLocationPicker)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                >
                  <MapPin size={14} color={colors.primary} />
                  <Text style={{ fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600' }}>
                    {weatherLocation?.name || 'Select Location'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { setWeatherModalOpen(false); setShowLocationPicker(false); }}>
                <X color={colors.mutedFg} size={22} />
              </TouchableOpacity>
            </View>

            {showLocationPicker && (
              <View style={[styles.locationPickerBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.locationSearchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <SearchIcon size={16} color={colors.mutedFg} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search city or village..."
                    placeholderTextColor={colors.mutedFg}
                    value={locationSearch}
                    onChangeText={(q) => { setLocationSearch(q); searchCity(q); }}
                    style={{ flex: 1, fontSize: fontSizes.base, color: colors.foreground }}
                  />
                  {locationSearch.length > 0 && (
                    <TouchableOpacity onPress={() => { setLocationSearch(''); setLocationResults([]); }}>
                      <X size={16} color={colors.mutedFg} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={useCurrentGPS}
                  style={[styles.locationOption, { borderBottomColor: colors.border }]}
                >
                  <Navigation size={16} color={colors.primary} />
                  <Text style={{ fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600' }}>Use GPS Current Location</Text>
                </TouchableOpacity>

                {locationResults.map((loc) => (
                  <TouchableOpacity
                    key={`${loc.lat}-${loc.lon}`}
                    onPress={() => {
                      saveLocation({ name: `${loc.name}, ${loc.admin1}`, lat: loc.lat, lon: loc.lon });
                      fetchWeatherForLocation(loc.lat, loc.lon);
                      setShowLocationPicker(false);
                      setLocationSearch('');
                      setLocationResults([]);
                    }}
                    style={[styles.locationOption, { borderBottomColor: colors.border }]}
                  >
                    <MapPin size={14} color={colors.mutedFg} />
                    <Text style={{ fontSize: fontSizes.sm, color: colors.foreground }}>{loc.name}, {loc.admin1} ({loc.country})</Text>
                  </TouchableOpacity>
                ))}

                {savedLocations.length > 0 && locationResults.length === 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={{ fontSize: fontSizes.xs, fontWeight: '700', color: colors.mutedFg, marginBottom: 4 }}>SAVED LOCATIONS</Text>
                    {savedLocations.map((loc) => (
                      <View key={loc.name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                          onPress={() => {
                            saveLocation(loc);
                            fetchWeatherForLocation(loc.lat, loc.lon);
                            setShowLocationPicker(false);
                          }}
                          style={[styles.locationOption, { borderBottomColor: colors.border, flex: 1 }]}
                        >
                          <MapPin size={14} color={colors.mutedFg} />
                          <Text style={{ fontSize: fontSizes.sm, color: colors.foreground }}>{loc.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeSavedLocation(loc.name)}
                          style={{ padding: 6 }}
                        >
                          <X size={14} color={colors.mutedFg} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {tempC != null && (
                <View style={[styles.weatherCurrentCard, { backgroundColor: colors.primary + '12' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: fontSizes.xxxl, fontWeight: '900', color: colors.foreground }}>
                        {Math.round(tempC)}°C
                      </Text>
                      <Text style={{ fontSize: fontSizes.base, color: colors.mutedFg, marginTop: 2 }}>
                        {getWeatherInfo(weatherCode).label}
                      </Text>
                    </View>
                    {React.createElement(getWeatherInfo(weatherCode).Icon, { size: 48, color: getWeatherInfo(weatherCode).color })}
                  </View>
                </View>
              )}

              {dailyWeather.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.weatherSectionLabel, { color: colors.mutedFg }]}>{t('past7Days')}</Text>
                  {dailyWeather.filter((d) => d.isPast).map((day) => {
                    const info = getWeatherInfo(day.code);
                    const dayDate = new Date(day.date);
                    const dayName = dayDate.toLocaleDateString(langLocaleMap[i18n.language] || 'en-IN', { weekday: 'short', day: 'numeric' });
                    return (
                      <View key={day.date} style={[styles.weatherDayRow, { borderBottomColor: colors.border }]}>
                        <Text style={{ width: 80, fontSize: fontSizes.sm, color: colors.mutedFg }}>{toNative(dayName)}</Text>
                        <info.Icon size={16} color={info.color} />
                        <Text style={{ flex: 1, fontSize: fontSizes.sm, color: colors.foreground, marginLeft: 4 }} numberOfLines={1}>{info.label}</Text>
                        <Text style={{ fontSize: fontSizes.sm, color: colors.foreground, fontWeight: '600' }}>
                          {toNative(Math.round(day.minTemp))}° - {toNative(Math.round(day.maxTemp))}°
                        </Text>
                        {day.rain > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 }}>
                            <Droplets size={11} color="#3B82F6" />
                            <Text style={{ fontSize: fontSizes.xs, color: '#3B82F6' }}>{toNative(day.rain.toFixed(1))}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {dailyWeather.filter((d) => d.isToday).map((day) => {
                    const info = getWeatherInfo(day.code);
                    return (
                      <View key={day.date} style={[styles.weatherTodayRow, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                        <Text style={{ width: 80, fontSize: fontSizes.sm, fontWeight: '800', color: colors.primary }}>{t('today')}</Text>
                        <info.Icon size={18} color={info.color} />
                        <Text style={{ flex: 1, fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary, marginLeft: 4 }}>{info.label}</Text>
                        <Text style={{ fontSize: fontSizes.sm, fontWeight: '800', color: colors.primary }}>
                          {toNative(Math.round(day.minTemp))}° - {toNative(Math.round(day.maxTemp))}°
                        </Text>
                      </View>
                    );
                  })}

                  <Text style={[styles.weatherSectionLabel, { color: colors.mutedFg, marginTop: 14 }]}>{t('next4Days')}</Text>
                  {dailyWeather.filter((d) => !d.isPast && !d.isToday).map((day) => {
                    const info = getWeatherInfo(day.code);
                    const dayDate = new Date(day.date);
                    const dayName = dayDate.toLocaleDateString(langLocaleMap[i18n.language] || 'en-IN', { weekday: 'short', day: 'numeric' });
                    return (
                      <View key={day.date} style={[styles.weatherDayRow, { borderBottomColor: colors.border }]}>
                        <Text style={{ width: 80, fontSize: fontSizes.sm, color: colors.mutedFg }}>{toNative(dayName)}</Text>
                        <info.Icon size={16} color={info.color} />
                        <Text style={{ flex: 1, fontSize: fontSizes.sm, color: colors.foreground, marginLeft: 4 }} numberOfLines={1}>{info.label}</Text>
                        <Text style={{ fontSize: fontSizes.sm, color: colors.foreground, fontWeight: '600' }}>
                          {toNative(Math.round(day.minTemp))}° - {toNative(Math.round(day.maxTemp))}°
                        </Text>
                        {day.rain > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 6 }}>
                            <Droplets size={11} color="#3B82F6" />
                            <Text style={{ fontSize: fontSizes.xs, color: '#3B82F6' }}>{toNative(day.rain.toFixed(1))}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {addFarmVisible && (
        <AddFarmModal
          visible
          onClose={() => { setAddFarmVisible(false); fetchFarms(); }}
        />
      )}
      {editingFarm && (
        <EditFarmModal
          farm={editingFarm}
          onClose={() => { setEditingFarm(null); fetchFarms(); }}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  headerContainer: { width: '100%', paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexShrink: 1, minWidth: 0 },
  greetingText: { fontSize: fontSizes.lg, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3, flexShrink: 1 },
  tempBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13 },
  tempValue: { fontSize: fontSizes.md, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 },
  tempSub: { fontSize: fontSizes.xs, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.2, lineHeight: 13 },
  weatherModal: { width: '100%', maxWidth: 440, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  weatherModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  weatherModalTitle: { fontSize: fontSizes.lg, fontWeight: '800', letterSpacing: -0.3 },
  weatherCurrentCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  weatherSectionLabel: { fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  weatherDayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  weatherTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  locationPickerBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  locationSearchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  locationOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  waveDate: { fontSize: fontSizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  contentPadding: { paddingHorizontal: 16, marginTop: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  kpiCard: { width: '48.5%' as any, marginBottom: 10, minHeight: 96, borderRadius: 20, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiLabel: { fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  kpiValue: { fontSize: fontSizes.xl, fontWeight: '800', marginVertical: 4, letterSpacing: -0.5 },
  kpiSub: { fontSize: fontSizes.sm, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '800' },
  sectionActionBtn: { paddingHorizontal: 12, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { width: '100%', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginBottom: 12 },
  farmCard: { width: '48.5%' as any, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  kpiEmoji: { fontSize: fontSizes.xxl },
  kpiName: { fontSize: fontSizes.base, fontWeight: '700', marginTop: 6 },
  animalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  animalCount: { fontSize: fontSizes.base, fontWeight: '900' },
  animalLabel: { fontSize: fontSizes.xs, fontWeight: '600' },
  kpiAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  kpiIncome: { color: '#16A34A', fontSize: fontSizes.sm, fontWeight: '700' },
  kpiExpense: { color: '#DC2626', fontSize: fontSizes.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', alignSelf: 'center', marginBottom: 12 },
  plotCountBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  plotCountText: { fontSize: fontSizes.sm, fontWeight: '800' },
  plotListContainer: { width: '100%', marginBottom: 6 },
  plotCardDetailed: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  plotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plotTitleText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  gatPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  gatPillText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  plotSubtitleText: {
    fontSize: fontSizes.sm,
    marginTop: 4,
  },
  plotIncomeExpenseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  plotIncomeCol: {
    alignItems: 'center',
    flex: 1,
  },
  plotBarDivider: {
    width: 1,
    height: 24,
  },
  plotBarLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  plotBarValue: {
    fontSize: fontSizes.base,
    fontWeight: '800',
  },
  plotCropsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 10,
  },
  plotCropsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plotCropsHeading: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noCropNotice: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  noCropText: {
    fontSize: fontSizes.sm,
    fontStyle: 'italic',
  },
  cropSelectorWrapper: {
    marginTop: 10,
    marginBottom: 6,
  },
  cropSelectorLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  cropChipsScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  cropPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  cropPillBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  miniStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedScopeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  selectedScopeTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
  },
  cropStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  cropStatusBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dairyCard: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
  },
});
