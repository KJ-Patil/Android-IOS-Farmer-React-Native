import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import type { CustomLedger } from '../../../shared/types/ledger';

interface CustomLedgersModalProps {
  visible: boolean;
  onClose: () => void;
}

type LedgerFormType = 'income' | 'expense' | 'both';

export function CustomLedgersModal({ visible, onClose }: CustomLedgersModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { customLedgers, fetchCustomLedgers, createCustomLedger, deleteCustomLedger } = useLedgerStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [nameMr, setNameMr] = useState('');
  const [type, setType] = useState<LedgerFormType>('both');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) fetchCustomLedgers();
  }, [visible]);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert(t('error'), t('enterName')); return; }
    setLoading(true);
    try {
      await createCustomLedger({ name: name.trim(), nameMr: nameMr.trim() || undefined, type, description: description.trim() || undefined });
      setShowForm(false);
      setName('');
      setNameMr('');
      setType('both');
      setDescription('');
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (ledger: CustomLedger) => {
    Alert.alert(t('delete'), `${t('delete')} "${ledger.name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteCustomLedger(ledger.id) },
    ]);
  };

  const types: LedgerFormType[] = ['income', 'expense', 'both'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('customLedgers')}</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{showForm ? '✕' : '+'}</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={[styles.formSection, { borderBottomColor: colors.border }]}>
            <Input label={t('name')} value={name} onChangeText={setName} placeholder={t('customLedgerPlaceholder')} />
            <Input label={`${t('name')} (मराठी)`} value={nameMr} onChangeText={setNameMr} placeholder={t('optional')} />

            <Text style={[styles.label, { color: colors.foreground }]}>{t('type')}</Text>
            <View style={styles.chipGrid}>
              {types.map((tp) => (
                <TouchableOpacity
                  key={tp}
                  onPress={() => setType(tp)}
                  style={[styles.chip, { borderColor: type === tp ? colors.primary : colors.border, backgroundColor: type === tp ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
                >
                  <Text style={{ color: type === tp ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(tp)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label={t('description')} value={description} onChangeText={setDescription} placeholder={t('optional')} />
            <Button title={t('save')} onPress={handleCreate} loading={loading} fullWidth />
          </View>
        )}

        <FlatList
          data={customLedgers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 40 }}>{t('noCustomLedgersYet')}</Text>}
          renderItem={({ item }) => (
            <Card style={{ marginTop: 8 }} padding={14}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
                  {item.nameMr && <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{item.nameMr}</Text>}
                  {item.description && <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>{item.description}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge text={item.type} variant={item.type === 'income' ? 'success' : item.type === 'expense' ? 'destructive' : 'info'} />
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '600' }}>{t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  formSection: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
