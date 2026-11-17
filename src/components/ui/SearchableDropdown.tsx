import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers/ThemeProvider';
import { ChevronDown, Search } from 'lucide-react-native';

interface SearchableDropdownProps {
  label: string;
  placeholder?: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  loading?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
  error?: string;
}

export function SearchableDropdown({
  label,
  placeholder,
  value,
  options,
  onSelect,
  loading = false,
  allowCustom = false,
  disabled = false,
  error,
}: SearchableDropdownProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const showCustom =
    allowCustom &&
    search.trim().length > 0 &&
    !filtered.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  const handleOpen = () => {
    if (disabled || loading) return;
    setSearch('');
    setVisible(true);
  };

  const handleSelect = (item: string) => {
    onSelect(item);
    setVisible(false);
  };

  return (
    <>
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.7}
          disabled={disabled}
          style={[
            styles.trigger,
            {
              borderColor: error ? colors.destructive : colors.border,
              backgroundColor: colors.card,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text
            style={{ flex: 1, color: value ? colors.foreground : colors.mutedFg, fontSize: 15 }}
            numberOfLines={1}
          >
            {value || placeholder || label}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ChevronDown size={16} color={colors.mutedFg} />
          )}
        </TouchableOpacity>
        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
      </View>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>{label}</Text>

            <View
              style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Search size={16} color={colors.mutedFg} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder={t('typeToSearch')}
                placeholderTextColor={colors.mutedFg}
                value={search}
                onChangeText={setSearch}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListHeaderComponent={
                showCustom ? (
                  <TouchableOpacity
                    onPress={() => handleSelect(search.trim())}
                    style={[styles.item, { borderBottomColor: colors.border }]}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>
                      {t('use')} {'"'}{search.trim()}{'"'}
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={[styles.item, { borderBottomColor: colors.border }]}
                >
                  <Text
                    style={{
                      color: item === value ? colors.primary : colors.foreground,
                      fontWeight: item === value ? '700' : '400',
                      fontSize: 15,
                    }}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !showCustom ? (
                  <View style={styles.empty}>
                    <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: 'center' }}>
                      {options.length === 0 && !search
                        ? allowCustom
                          ? t('typeToSearch')
                          : t('noResultsFound')
                        : t('noResultsFound')}
                    </Text>
                  </View>
                ) : undefined
              }
            />

            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15, textAlign: 'center' }}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  error: { fontSize: 12, marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  list: { flexGrow: 0, maxHeight: 280 },
  item: { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  empty: { paddingVertical: 32, alignItems: 'center' },
  cancelBtn: { borderWidth: 1, paddingVertical: 12, marginTop: 14 },
});
