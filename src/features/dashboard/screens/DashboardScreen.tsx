import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  useWindowDimensions,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { useAppStore } from '../../../shared/hooks/useAppStore';
import { useAuthStore } from '../../../shared/hooks/useAuthStore';
import { db } from '../../../shared/services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AreaChart } from '../../../components/ui/AreaChart';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  Users,
  RefreshCw,
  Plus,
  X,
  Sun,
  Sunset,
  Moon,
  Thermometer,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Droplets,
  Wind,
  ChevronRight,
  MapPin,
  Navigation,
  Search as SearchIcon,
} from 'lucide-react-native';

const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;

const CROPS_LIST = ['Wheat', 'Cotton', 'Soybean', 'Rice', 'Sugarcane'];

export function DashboardScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const user = useAuthStore((s) => s.user);
  const { transactions, fetchTransactions } = useLedgerStore();
  const { isOnline, syncQueueCount } = useAppStore();
  const { fmtCurrency, fmtNum, fmtDMY, toNative } = useLocalizedFormat();

  // Weather & location state
  const [tempC, setTempC] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [dailyWeather, setDailyWeather] = useState<any[]>([]);
  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [savedLocations, setSavedLocations] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<{ name: string; lat: number; lon: number; country: string; admin1: string }[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
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
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=en&format=json`
      );
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

  // Quick transaction modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFarmer, setModalFarmer] = useState('');
  const [modalCrop, setModalCrop] = useState('Wheat');
  const [modalAmount, setModalAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransactions();
    loadSavedLocations();
    fetchTemperature();
  }, []);

  // Compute metrics identical to FarmerLedger
  const totalRevenue = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
  }, [transactions]);

  const uniqueFarmers = useMemo(() => {
    const names = transactions
      .map((tx) => tx.partyName)
      .filter((n): n is string => Boolean(n && n.trim()));
    return new Set(names).size || (transactions.length > 0 ? 1 : 0);
  }, [transactions]);

  // Aggregate monthly trend data from transactions for the AreaChart
  const getTxDateString = (tx: any): string => {
    if (typeof tx.date === 'string') return tx.date;
    if (typeof tx.timestamp === 'string') return tx.timestamp.split('T')[0];
    if (tx.timestamp && typeof tx.timestamp.toDate === 'function') {
      return tx.timestamp.toDate().toISOString().split('T')[0];
    }
    return '';
  };

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxns = transactions.filter((tx) => getTxDateString(tx).startsWith(key));
      const inc = monthTxns
        .filter((tx) => tx.type === 'income' || !tx.type)
        .reduce((s, tx) => s + (tx.amount || 0), 0);
      const exp = monthTxns
        .filter((tx) => tx.type === 'expense')
        .reduce((s, tx) => s + (tx.amount || 0), 0);

      result.push({
        label: months[d.getMonth()],
        income: inc,
        expense: exp,
      });
    }
    return result;
  }, [transactions]);

  const recentTxns = transactions.slice(0, 5);

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

  const handleAddTransaction = async () => {
    if (!modalFarmer.trim() || !modalAmount.trim()) {
      Alert.alert(t('required'), t('enterFarmerNameAndAmount'));
      return;
    }
    const amt = parseFloat(modalAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(t('invalid'), t('enterValidPositiveAmount'));
      return;
    }

    setSubmitting(true);
    try {
      const userMobile = user?.mobileNumber || '9130057189';
      const newTxData = {
        farmer: modalFarmer.trim(),
        crop: modalCrop,
        amount: amt,
        timestamp: new Date().toISOString(),
      };

      const txsRef = collection(db, 'users', userMobile, 'transactions');
      await addDoc(txsRef, newTxData);

      setModalFarmer('');
      setModalAmount('');
      setModalOpen(false);
      await fetchTransactions();
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('failedToSaveTransaction'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout noPadding noTopInset>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#16A34A', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}
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

          <View style={styles.waveStatRow}>
            <View style={styles.waveStatItem}>
              <Text style={styles.waveStatValue}>{formatC(totalRevenue)}</Text>
              <Text style={styles.waveStatLabel}>{t('revenue')}</Text>
            </View>
            <View style={styles.waveStatDivider} />
            <View style={styles.waveStatItem}>
              <Text style={styles.waveStatValue}>{toNative(uniqueFarmers)}</Text>
              <Text style={styles.waveStatLabel}>{t('farmers')}</Text>
            </View>
            <View style={styles.waveStatDivider} />
            <View style={styles.waveStatItem}>
              <Text style={styles.waveStatValue}>{toNative(transactions.length)}</Text>
              <Text style={styles.waveStatLabel}>{t('entries')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentPadding}>

        {/* 4 KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalRevenue')}</Text>
              <TrendingUp color="#16A34A" size={18} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>
              {formatC(totalRevenue)}
            </Text>
            <Text style={[styles.kpiSub, { color: '#16A34A' }]}>
              {toNative(transactions.length)} {t('recentLedger')}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('activeFarmers')}</Text>
              <Users color="#2563EB" size={18} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>{toNative(uniqueFarmers)}</Text>
            <Text style={[styles.kpiSub, { color: '#2563EB' }]}>{t('uniqueFarmerRecords')}</Text>
          </View>

          <View style={[styles.kpiCard, { width: '100%', backgroundColor: colors.card }]}>
            <View style={styles.kpiHeader}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('offlineQueue')}</Text>
              <RefreshCw color={syncQueueCount > 0 ? '#D97706' : '#16A34A'} size={18} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>{toNative(syncQueueCount)}</Text>
            <Text style={[styles.kpiSub, { color: syncQueueCount > 0 ? '#D97706' : '#16A34A' }]}>
              {syncQueueCount > 0 ? t('awaitingInternet') : t('allDataSynced')}
            </Text>
          </View>
        </View>

        {/* Revenue Trend Chart */}
        <Card style={styles.chartCard} padding={16}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t('revenueTrend')}
            </Text>
            <Text style={[styles.chartDesc, { color: colors.mutedFg }]}>
              {t('revenueTrendDesc')}
            </Text>
          </View>
          <View style={styles.chartWrapper}>
            <AreaChart data={chartData} width={Math.min(screenWidth - 48, 640)} height={170} />
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{t('revenue')} (₹)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
              <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{t('expenses')} (₹)</Text>
            </View>
          </View>
        </Card>

        {/* Recent Ledger Feed matching FarmerLedger */}
        <Card style={styles.feedCard} padding={16}>
          <View style={styles.feedHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {t('recentLedger')}
              </Text>
              <Text style={[styles.chartDesc, { color: colors.mutedFg }]}>
                {t('realTimeJournal')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalOpen(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Plus color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>

          {recentTxns.length === 0 ? (
            <Text style={{ color: colors.mutedFg, textAlign: 'center', marginVertical: 24 }}>
              {t('noData')}
            </Text>
          ) : (
            recentTxns.map((txn, index) => {
              const farmerTitle = txn.partyName || (txn as any).farmer || t('generalFarmer');
              const cropOrCategory = txn.category ? tCategory(txn.category, t) : (txn as any).crop || t('general');
              const dateStr = fmtDMY(getTxDateString(txn)) || t('today');
              return (
                <View
                  key={txn.id || index}
                  style={[
                    styles.txnRow,
                    { borderBottomColor: colors.border },
                    index === recentTxns.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txnFarmer, { color: colors.foreground }]}>
                      {farmerTitle}
                    </Text>
                    <Text style={[styles.txnMeta, { color: colors.mutedFg }]}>
                      {cropOrCategory} • {dateStr}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.txnAmount,
                        { color: txn.type === 'expense' ? colors.destructive : colors.primary },
                      ]}
                    >
                      {txn.type === 'expense' ? '-' : '+'}
                      {formatC(txn.amount)}
                    </Text>
                    <Badge
                      text={tPaymentMode(txn.paymentMode, t)}
                      variant={txn.type === 'expense' ? 'destructive' : 'success'}
                    />
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Weather Detail Modal */}
      <Modal visible={weatherModalOpen} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <View style={[styles.weatherModal, { backgroundColor: colors.card }]}>
            <View style={styles.weatherModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weatherModalTitle, { color: colors.foreground }]}>Weather</Text>
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(!showLocationPicker)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  activeOpacity={0.7}
                >
                  <MapPin size={13} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {weatherLocation?.name || 'Set Location'}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 11 }}> • Tap to change</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { setWeatherModalOpen(false); setShowLocationPicker(false); }}>
                <X color={colors.mutedFg} size={22} />
              </TouchableOpacity>
            </View>

            {showLocationPicker && (
              <View style={[styles.locationPickerBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={[styles.locationSearchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <SearchIcon size={16} color={colors.mutedFg} />
                  <TextInput
                    placeholder="Search city (e.g. Pune, Nashik)"
                    placeholderTextColor={colors.mutedFg}
                    value={locationSearch}
                    onChangeText={(text) => { setLocationSearch(text); searchCity(text); }}
                    style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.foreground, paddingVertical: 0 }}
                    autoFocus
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
                  activeOpacity={0.7}
                >
                  <Navigation size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', flex: 1 }}>Use Current GPS Location</Text>
                </TouchableOpacity>

                {locationResults.map((loc, idx) => (
                  <TouchableOpacity
                    key={`${loc.lat}-${loc.lon}-${idx}`}
                    onPress={async () => {
                      await saveLocation({ name: `${loc.name}, ${loc.admin1}`, lat: loc.lat, lon: loc.lon });
                      await fetchWeatherForLocation(loc.lat, loc.lon);
                      setLocationSearch('');
                      setLocationResults([]);
                      setShowLocationPicker(false);
                    }}
                    style={[styles.locationOption, { borderBottomColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <MapPin size={14} color={colors.mutedFg} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>{loc.name}</Text>
                      <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{[loc.admin1, loc.country].filter(Boolean).join(', ')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {savedLocations.length > 0 && locationResults.length === 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedFg, letterSpacing: 0.8, marginBottom: 6 }}>SAVED LOCATIONS</Text>
                    {savedLocations.map((loc) => (
                      <TouchableOpacity
                        key={loc.name}
                        onPress={async () => {
                          await saveLocation(loc);
                          await fetchWeatherForLocation(loc.lat, loc.lon);
                          setShowLocationPicker(false);
                        }}
                        style={[styles.locationOption, { borderBottomColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        <MapPin size={14} color={weatherLocation?.name === loc.name ? colors.primary : colors.mutedFg} />
                        <Text style={{
                          color: weatherLocation?.name === loc.name ? colors.primary : colors.foreground,
                          fontSize: 14,
                          fontWeight: weatherLocation?.name === loc.name ? '700' : '500',
                          flex: 1,
                        }}>
                          {loc.name}
                        </Text>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); removeSavedLocation(loc.name); }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={14} color={colors.mutedFg} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {tempC != null && (
              <View style={[styles.weatherCurrentCard, { backgroundColor: colors.primary + '12' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {React.createElement(getWeatherInfo(weatherCode).Icon, { size: 36, color: getWeatherInfo(weatherCode).color })}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.foreground, letterSpacing: -1 }}>
                      {toNative(Math.round(tempC))}°C
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.mutedFg, fontWeight: '600' }}>
                      {toNative(Math.round(tempC * 9 / 5 + 32))}°F • {getWeatherInfo(weatherCode).label}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {dailyWeather.filter(d => d.isPast).length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.weatherSectionLabel, { color: colors.mutedFg }]}>{t('past7Days')}</Text>
                  {dailyWeather.filter(d => d.isPast).map((day) => {
                    const info = getWeatherInfo(day.code);
                    const dateObj = new Date(day.date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString(langLocaleMap[i18n.language] || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <View key={day.date} style={[styles.weatherDayRow, { borderBottomColor: colors.border }]}>
                        <View style={{ width: 90 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{dayName}</Text>
                        </View>
                        <info.Icon size={18} color={info.color} />
                        <Text style={{ fontSize: 11, color: colors.mutedFg, width: 65 }} numberOfLines={1}>{info.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{toNative(Math.round(day.maxTemp))}°</Text>
                          <Text style={{ fontSize: 13, color: colors.mutedFg }}>/</Text>
                          <Text style={{ fontSize: 13, color: colors.mutedFg }}>{toNative(Math.round(day.minTemp))}°</Text>
                        </View>
                        {day.rain > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 8 }}>
                            <Droplets size={11} color="#3B82F6" />
                            <Text style={{ fontSize: 11, color: '#3B82F6' }}>{toNative(day.rain.toFixed(1))}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {dailyWeather.filter(d => d.isToday).map((day) => {
                const info = getWeatherInfo(day.code);
                return (
                  <View key={day.date} style={[styles.weatherTodayRow, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>{t('today').toUpperCase()}</Text>
                    <info.Icon size={18} color={info.color} />
                    <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '600', flex: 1 }}>{info.label}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{toNative(Math.round(day.maxTemp))}°</Text>
                    <Text style={{ fontSize: 13, color: colors.mutedFg }}> / {toNative(Math.round(day.minTemp))}°</Text>
                  </View>
                );
              })}

              {dailyWeather.filter(d => !d.isPast && !d.isToday).length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.weatherSectionLabel, { color: colors.mutedFg }]}>{t('next4Days')}</Text>
                  {dailyWeather.filter(d => !d.isPast && !d.isToday).map((day) => {
                    const info = getWeatherInfo(day.code);
                    const dateObj = new Date(day.date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString(langLocaleMap[i18n.language] || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <View key={day.date} style={[styles.weatherDayRow, { borderBottomColor: colors.border }]}>
                        <View style={{ width: 90 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>{dayName}</Text>
                        </View>
                        <info.Icon size={18} color={info.color} />
                        <Text style={{ fontSize: 11, color: colors.mutedFg, width: 65 }} numberOfLines={1}>{info.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{toNative(Math.round(day.maxTemp))}°</Text>
                          <Text style={{ fontSize: 13, color: colors.mutedFg }}>/</Text>
                          <Text style={{ fontSize: 13, color: colors.mutedFg }}>{toNative(Math.round(day.minTemp))}°</Text>
                        </View>
                        {day.rain > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 8 }}>
                            <Droplets size={11} color="#3B82F6" />
                            <Text style={{ fontSize: 11, color: '#3B82F6' }}>{toNative(day.rain.toFixed(1))}</Text>
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

      {/* Quick Add Transaction Modal identical to FarmerLedger */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding={20}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t('addTransaction')}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X color={colors.mutedFg} size={20} />
              </TouchableOpacity>
            </View>

            <Input
              label={t('farmer')}
              placeholder={t('farmerNamePlaceholder')}
              value={modalFarmer}
              onChangeText={setModalFarmer}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>{t('crop')}</Text>
            <View style={styles.cropSelector}>
              {CROPS_LIST.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setModalCrop(c)}
                  style={[
                    styles.cropChip,
                    {
                      borderColor: modalCrop === c ? colors.primary : colors.border,
                      backgroundColor: modalCrop === c ? colors.primary + '15' : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: modalCrop === c ? colors.primary : colors.foreground,
                      fontWeight: '600',
                      fontSize: 12,
                    }}
                  >
                    {t(c.toLowerCase()) || c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label={t('amount')}
              placeholder={t('amountPlaceholder')}
              value={modalAmount}
              onChangeText={setModalAmount}
              keyboardType="number-pad"
            />

            <View style={styles.modalActions}>
              <Button
                title={t('cancel')}
                variant="outline"
                onPress={() => setModalOpen(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title={t('save')}
                onPress={handleAddTransaction}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  headerContainer: { width: '100%', paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  greetingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexShrink: 1, minWidth: 0 },
  greetingText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3, flexShrink: 1 },
  tempBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13 },
  tempValue: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 20 },
  tempSub: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.2, lineHeight: 13 },
  weatherModal: { width: '100%', maxWidth: 440, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  weatherModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  weatherModalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  weatherCurrentCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  weatherSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  weatherDayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  weatherTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  locationPickerBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  locationSearchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  locationOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  waveDate: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  waveStatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6 },
  waveStatItem: { flex: 1, alignItems: 'center' },
  waveStatValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  waveStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  waveStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  contentPadding: { paddingHorizontal: 16, marginTop: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  kpiCard: { width: '48.5%' as any, marginBottom: 10, minHeight: 96, borderRadius: 24, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  kpiValue: { fontSize: 22, fontWeight: '800', marginVertical: 4, letterSpacing: -0.5 },
  kpiSub: { fontSize: 13, fontWeight: '600' },
  chartCard: { marginBottom: 16 },
  chartHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  chartDesc: { fontSize: 13, marginTop: 2 },
  chartWrapper: { alignItems: 'center', marginVertical: 8 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 3, borderRadius: 2 },
  feedCard: { marginBottom: 20 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  txnFarmer: { fontSize: 14, fontWeight: '700' },
  txnMeta: { fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  cropSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  cropChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
