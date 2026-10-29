import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useInventoryStore } from '../../../shared/hooks/useInventoryStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { PurchaseStockModal } from '../components/PurchaseStockModal';
import { IssueToCropModal } from '../components/IssueToCropModal';
import { AddCustomItemModal } from '../components/AddCustomItemModal';
import { Package, ShoppingCart, TrendingDown, Plus, Search, LayoutList } from 'lucide-react-native';
import { WaveHeader } from '../../../components/ui/WaveHeader';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tPaymentMode } from '../../../shared/utils/helpers';

type TabKey = 'stock' | 'purchase' | 'issues' | 'master';
const ITEM_TYPES = ['all', 'fertilizer', 'seed', 'pesticide', 'other'] as const;

export function InventoryScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { items, purchases, consumptions, fetchItems, fetchPurchases, fetchConsumptions, isLoading } =
    useInventoryStore();

  const [activeTab, setActiveTab] = useState<TabKey>('stock');
  const [purchaseVisible, setPurchaseVisible] = useState(false);
  const [issueVisible, setIssueVisible] = useState(false);
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const isNonEnglish = i18n.language !== 'en';
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  useEffect(() => {
    fetchItems();
    fetchPurchases();
    fetchConsumptions();
  }, []);

  const tabDefs: { key: TabKey; label: string; Icon: typeof Package }[] = [
    { key: 'stock', label: t('liveStock'), Icon: Package },
    { key: 'purchase', label: t('purchaseRegister'), Icon: ShoppingCart },
    { key: 'issues', label: t('materialIssues'), Icon: TrendingDown },
    { key: 'master', label: t('inputMaster'), Icon: LayoutList },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType = selectedType === 'all' || item.type === selectedType;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.nameMr && item.nameMr.includes(q));
      return matchType && matchSearch;
    });
  }, [items, selectedType, search]);

  const inStockItems = useMemo(() => {
    return filteredItems.filter((i) => (i.currentStock || 0) > 0);
  }, [filteredItems]);

  const [selectedItemForAction, setSelectedItemForAction] = useState<string | undefined>(undefined);

  const handleOpenPurchase = (itemId?: string) => {
    setSelectedItemForAction(itemId);
    setPurchaseVisible(true);
  };

  const handleOpenIssue = (itemId?: string) => {
    setSelectedItemForAction(itemId);
    setIssueVisible(true);
  };

  const summaryMetrics = useMemo(() => {
    let totalStockValue = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      totalStockValue += item.totalValue || (item.currentStock * item.purchaseRate);
      if ((item.currentStock || 0) > 0) inStockCount++;
      else outOfStockCount++;
    });

    let monthPurchasesTotal = 0;
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    purchases.forEach((p) => {
      if (p.date?.startsWith(currentMonthStr)) {
        monthPurchasesTotal += Number(p.totalAmount) || 0;
      }
    });

    let monthIssuedTotal = 0;
    consumptions.forEach((c) => {
      if (c.date?.startsWith(currentMonthStr)) {
        monthIssuedTotal += Number(c.totalExpense || c.totalAmount) || 0;
      }
    });

    return {
      totalStockValue,
      totalItemsCount: items.length,
      inStockCount,
      outOfStockCount,
      monthPurchasesTotal,
      monthIssuedTotal,
    };
  }, [items, purchases, consumptions]);

  return (
    <ScreenLayout noPadding noTopInset>
      <WaveHeader
        title={t('inventory')}
        stats={[
          { value: fmtCurrency(summaryMetrics.totalStockValue), label: t('stock') || 'Stock' },
          { value: toNative(summaryMetrics.inStockCount), label: t('itemsInStock') || 'In Stock' },
          { value: toNative(summaryMetrics.outOfStockCount), label: t('outOfStock') || 'Out' },
        ]}
        gradientFrom="#7C3AED"
        gradientTo="#5B21B6"
      />
      {/* Subtabs Bar */}
      <View style={[styles.tabBarOuter, { backgroundColor: colors.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContent}
        >
          {tabDefs.map((tab) => {
            const isActive = activeTab === tab.key;
            const iconColor = isActive ? '#FFFFFF' : colors.mutedFg;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <tab.Icon size={15} color={iconColor} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isActive ? '#FFFFFF' : colors.mutedFg,
                    marginLeft: 5,
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {/* TAB 1: LIVE STOCK */}
        {activeTab === 'stock' && (
          <FlatList
            data={inStockItems.length > 0 ? inStockItems : filteredItems}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ marginTop: 12, marginBottom: 8 }}>
                {/* KPI Cards */}
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: '#DBEAFE' }]}>
                      <Package color="#2563EB" size={18} />
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                      {fmtCurrency(summaryMetrics.totalStockValue)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalStockValue')}</Text>
                    <Text style={[styles.kpiSub, { color: '#2563EB' }]}>
                      {toNative(summaryMetrics.inStockCount)} {t('itemsInStock')}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
                      <ShoppingCart color="#16A34A" size={18} />
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                      {fmtCurrency(summaryMetrics.monthPurchasesTotal)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('monthlyPurchases')}</Text>
                    <Text style={[styles.kpiSub, { color: '#16A34A' }]}>
                      {toNative(purchases.length)} {t('purchasesCount')}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: '#FFEDD5' }]}>
                      <TrendingDown color="#EA580C" size={18} />
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                      {fmtCurrency(summaryMetrics.monthIssuedTotal)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('issuedToCrops')}</Text>
                    <Text style={[styles.kpiSub, { color: '#EA580C' }]}>
                      {toNative(consumptions.length)} {t('issuesCount')}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: '#E2E8F0' }]}>
                      <Package color="#64748B" size={18} />
                    </View>
                    <Text style={[styles.kpiValue, { color: colors.foreground }]}>
                      {toNative(summaryMetrics.totalItemsCount)}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('stockHealth')}</Text>
                    <Text style={[styles.kpiSub, { color: '#D97706' }]}>
                      {toNative(summaryMetrics.outOfStockCount)} {t('outOfStock')}
                    </Text>
                  </View>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleOpenPurchase()}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, { backgroundColor: '#2563EB', shadowColor: '#2563EB' }]}
                  >
                    <ShoppingCart color="#FFFFFF" size={15} />
                    <Text style={styles.actionBtnText}>{t('purchaseStock')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpenIssue()}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, { backgroundColor: '#DC2626', shadowColor: '#DC2626' }]}
                  >
                    <TrendingDown color="#FFFFFF" size={15} />
                    <Text style={styles.actionBtnText}>{t('issueToCrop')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAddItemVisible(true)}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A' }]}
                  >
                    <Plus color="#FFFFFF" size={15} />
                    <Text style={styles.actionBtnText}>{t('new')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Search & Category Filter */}
                <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Search color={colors.mutedFg} size={16} />
                  <TextInput
                    placeholder={t('searchInventoryPlaceholder')}
                    placeholderTextColor={colors.mutedFg}
                    value={search}
                    onChangeText={setSearch}
                    style={[styles.searchInput, { color: colors.foreground }]}
                  />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {ITEM_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedType(type)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: selectedType === type ? colors.primary : colors.border,
                          backgroundColor: selectedType === type ? colors.primary + '15' : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: selectedType === type ? colors.primary : colors.mutedFg,
                        }}
                      >
                        {type === 'all' ? (t('all') || 'All') : t(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 32 }}>
                {t('noData')}
              </Text>
            }
            renderItem={({ item }) => (
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                      {isNonEnglish && item.nameMr ? item.nameMr : item.name}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                      {item.nameMr && !isNonEnglish ? item.nameMr : item.notes || ''}
                    </Text>
                    <View style={{ marginTop: 4 }}>
                      <Badge text={t(item.type) || item.type} variant="info" />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: (item.currentStock || 0) > 0 ? colors.primary : colors.destructive,
                        fontWeight: '800',
                        fontSize: 16,
                      }}
                    >
                      {toNative(item.currentStock || 0)} {t(item.unit)}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                      {fmtCurrency(item.purchaseRate || 0)}/{t(item.unit)}
                    </Text>
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 1 }}>
                      {fmtCurrency((item.currentStock || 0) * (item.purchaseRate || 0))}
                    </Text>
                  </View>
                </View>

                {/* Quick actions for this item */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8 }}>
                  <Button
                    title={`+ ${t('buy')}`}
                    onPress={() => handleOpenPurchase(item.id)}
                    variant="outline"
                    size="sm"
                  />
                  <Button
                    title={t('issue')}
                    onPress={() => handleOpenIssue(item.id)}
                    disabled={(item.currentStock || 0) <= 0}
                    size="sm"
                  />
                </View>
              </Card>
            )}
          />
        )}

        {/* TAB 2: PURCHASE REGISTER */}
        {activeTab === 'purchase' && (
          <FlatList
            data={purchases}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ marginVertical: 12 }}>
                <Button
                  title={`+ ${t('purchaseStock')}`}
                  onPress={() => setPurchaseVisible(true)}
                  fullWidth
                />
              </View>
            }
            ListEmptyComponent={
              <Card style={{ padding: 24, alignItems: 'center' }}>
                <ShoppingCart color={colors.mutedFg} size={32} />
                <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 8 }}>
                  {t('noPurchasesRecorded')}
                </Text>
              </Card>
            }
            renderItem={({ item: p }) => (
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                      {p.itemName}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                      {fmtDMY(p.date)} • {p.supplierName || t('generalSupplier')}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 1 }}>
                      {toNative(p.quantity)} × {fmtCurrency(p.rate || 0)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 15 }}>
                      {fmtCurrency(p.totalAmount || 0)}
                    </Text>
                    <Badge text={tPaymentMode(p.paymentMode, t)} />
                  </View>
                </View>
              </Card>
            )}
          />
        )}

        {/* TAB 3: MATERIAL ISSUES */}
        {activeTab === 'issues' && (
          <FlatList
            data={consumptions}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ marginVertical: 12 }}>
                <Button
                  title={`+ ${t('issueToCrop')}`}
                  onPress={() => setIssueVisible(true)}
                  fullWidth
                />
              </View>
            }
            ListEmptyComponent={
              <Card style={{ padding: 24, alignItems: 'center' }}>
                <TrendingDown color={colors.mutedFg} size={32} />
                <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 8 }}>
                  {t('noMaterialsIssued')}
                </Text>
              </Card>
            }
            renderItem={({ item: c }) => (
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                      {c.itemName}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                      {fmtDMY(c.date)} • {c.cropName || t('crops')} ({c.plotName || t('plots')})
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 15 }}>
                      {toNative(c.quantity)} {c.unit ? t(c.unit) : ''}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
          />
        )}

        {/* TAB 4: INPUT MASTER */}
        {activeTab === 'master' && (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View style={{ marginVertical: 12 }}>
                <Button
                  title={`+ ${t('addItem')}`}
                  onPress={() => setAddItemVisible(true)}
                  fullWidth
                />
              </View>
            }
            renderItem={({ item }) => (
              <Card style={{ marginBottom: 8 }} padding={14}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                      {isNonEnglish && item.nameMr ? item.nameMr : item.name}
                    </Text>
                    {item.nameMr && !isNonEnglish ? (
                      <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 1 }}>{item.nameMr}</Text>
                    ) : null}
                    {item.notes ? (
                      <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>{item.notes}</Text>
                    ) : null}
                  </View>
                  <Badge text={t(item.type) || item.type} variant="info" />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
                    {t('rate')}: {fmtCurrency(item.purchaseRate || 0)}/{t(item.unit)}
                  </Text>
                  <Text style={{ color: (item.currentStock || 0) > 0 ? colors.primary : colors.destructive, fontWeight: '700', fontSize: 12 }}>
                    {t('stock')}: {toNative(item.currentStock || 0)} {t(item.unit)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      <PurchaseStockModal
        visible={purchaseVisible}
        initialItemId={selectedItemForAction}
        onClose={() => {
          setPurchaseVisible(false);
          setSelectedItemForAction(undefined);
          fetchItems();
          fetchPurchases();
        }}
      />
      <IssueToCropModal
        visible={issueVisible}
        initialItemId={selectedItemForAction}
        onClose={() => {
          setIssueVisible(false);
          setSelectedItemForAction(undefined);
          fetchItems();
          fetchConsumptions();
        }}
      />
      <AddCustomItemModal
        visible={addItemVisible}
        onClose={() => {
          setAddItemVisible(false);
          fetchItems();
        }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: { paddingVertical: 10, borderBottomWidth: 0 },
  tabContent: { paddingHorizontal: 14, gap: 8 },
  tabPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  content: { flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%' as any, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 } as any, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10 },
  kpiValue: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 26 },
  kpiLabel: { fontSize: 11, fontWeight: '600' as const, marginTop: 3, textTransform: 'uppercase' as const, letterSpacing: 0.8, lineHeight: 14 },
  kpiSub: { fontSize: 12, fontWeight: '700' as const, marginTop: 6, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, elevation: 3, shadowOffset: { width: 0, height: 2 } as any, shadowOpacity: 0.3, shadowRadius: 4 },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 42, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterScroll: { marginVertical: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
