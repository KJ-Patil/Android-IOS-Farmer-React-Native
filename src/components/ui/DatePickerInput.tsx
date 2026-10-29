import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers/ThemeProvider';
import { Button } from './Button';

interface DatePickerInputProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(dateStr: string) {
  const d = new Date(dateStr || Date.now());
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DatePickerInput({ label, value, onChange }: DatePickerInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const parsed = parseDate(value);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  const totalDays = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDayOfWeek).fill(null);

  for (let d = 1; d <= totalDays; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const handleOpen = () => {
    const p = parseDate(value);
    setYear(p.year);
    setMonth(p.month);
    setDay(p.day);
    setVisible(true);
  };

  const handleConfirm = () => {
    onChange(formatDate(year, month, day));
    setVisible(false);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setDay(1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setDay(1);
  };

  const displayValue = value || t('selectDate');

  return (
    <>
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <TouchableOpacity
          onPress={handleOpen}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={{ color: value ? colors.foreground : colors.mutedFg, fontSize: 15 }}>{displayValue}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth}><Text style={{ color: colors.primary, fontSize: 22, fontWeight: '600' }}>‹</Text></TouchableOpacity>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth}><Text style={{ color: colors.primary, fontSize: 22, fontWeight: '600' }}>›</Text></TouchableOpacity>
            </View>

            <View style={styles.weekHeader}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={[styles.weekDay, { color: colors.mutedFg }]}>{d}</Text>
              ))}
            </View>

            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((d, di) => (
                  <TouchableOpacity
                    key={di}
                    disabled={d === null}
                    onPress={() => d && setDay(d)}
                    style={[
                      styles.dayCell,
                      d === day ? { backgroundColor: colors.primary, borderRadius: 18 } : undefined,
                    ]}
                  >
                    <Text style={{ color: d === null ? 'transparent' : d === day ? colors.primaryFg : colors.foreground, fontSize: 14, fontWeight: d === day ? '700' : '400' }}>
                      {d ?? ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title={t('cancel')} onPress={() => setVisible(false)} variant="outline" style={{ flex: 1 }} />
              <Button title={t('ok')} onPress={handleConfirm} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 360, borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
});
