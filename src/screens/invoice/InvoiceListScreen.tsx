import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchInvoicesThunk } from '../../redux/slices/invoiceSlice';
import { InvoiceEntity } from '../../types/database';
import { CalculationService } from '../../services/CalculationService';
import { useNavigation } from '@react-navigation/native';

export const InvoiceListScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const { invoices, isLoading } = useAppSelector(state => state.invoices);
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'paid' | 'partial'>('all');

  useEffect(() => {
    dispatch(fetchInvoicesThunk());
  }, [dispatch]);

  const onRefresh = () => {
    dispatch(fetchInvoicesThunk());
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerAddress && inv.customerAddress.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      selectedFilter === 'all' ? true : inv.paymentStatus === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const renderInvoiceCard = ({ item }: { item: InvoiceEntity }) => {
    const getBadgeVariant = () => {
      switch (item.paymentStatus) {
        case 'paid':
          return 'success';
        case 'partial':
          return 'warning';
        case 'pending':
        default:
          return 'danger';
      }
    };

    const getStatusLabel = () => {
      switch (item.paymentStatus) {
        case 'paid':
          return isMarathi ? 'पूर्ण जमा' : 'Paid';
        case 'partial':
          return isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance';
        case 'pending':
        default:
          return isMarathi ? 'देणे बाकी' : 'Not Paid';
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}
        style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.invoiceNumberContainer}>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>{item.date}</Text>
          </View>
          <Badge
            label={getStatusLabel()}
            variant={getBadgeVariant()}
            size="sm"
          />
        </View>

        <View style={styles.customerRow}>
          <Icon name="user" size={16} color={colors.primary} />
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName}
          </Text>
        </View>

        {item.customerAddress ? (
          <View style={styles.addressRow}>
            <Icon name="location" size={14} color={colors.textMuted} />
            <Text style={styles.customerAddress} numberOfLines={1}>
              {item.customerAddress}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>{isMarathi ? 'एकूण रक्कम' : 'Grand Total'}</Text>
          <Text style={styles.totalValue}>
            {CalculationService.formatIndianCurrency(item.grandTotal)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'सर्व इनव्हॉइस' : 'Invoices'}
        subtitle={
          isMarathi
            ? `${invoices.length} इनव्हॉइस तयार झाले आहेत`
            : `${invoices.length} generated from billing`
        }
      />

      {/* Search & Status Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.gray500} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              isMarathi
                ? 'ग्राहक किंवा इनव्हॉइस नंबर शोधा...'
                : 'Search by invoice # or customer...'
            }
            placeholderTextColor={colors.gray400}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={16} color={colors.gray500} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.tabFilters}>
          {(['all', 'pending', 'partial', 'paid'] as const).map(tab => {
            let tabLabel = tab.toUpperCase();
            if (tab === 'all') tabLabel = isMarathi ? 'सर्व' : 'All';
            if (tab === 'pending') tabLabel = isMarathi ? 'बाकी' : 'Pending';
            if (tab === 'partial') tabLabel = isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance';
            if (tab === 'paid') tabLabel = isMarathi ? 'जमा' : 'Paid';

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedFilter(tab)}
                style={[
                  styles.tabFilterBtn,
                  selectedFilter === tab && styles.tabFilterBtnActive,
                ]}>
                <Text
                  style={[
                    styles.tabFilterText,
                    selectedFilter === tab && styles.tabFilterTextActive,
                  ]}>
                  {tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Invoices FlatList */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={item => item.id}
        renderItem={renderInvoiceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="fileText" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>
              {isMarathi ? 'कोणतेही इनव्हॉइस आढळले नाही' : 'No Invoices Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {invoices.length === 0
                ? isMarathi
                  ? 'बिलिंग टॅबमध्ये पहिले कोटेशन जतन करा आणि इनव्हॉइस आपोआप तयार होईल.'
                  : 'Save your first quotation in the Billing tab to automatically generate invoices.'
                : isMarathi
                  ? 'कोणतेही इनव्हॉइस शोध परिणामांशी जुळत नाही.'
                  : 'No invoices match your current search and filter criteria.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  filterSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  tabFilters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabFilterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabFilterBtnActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  tabFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabFilterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  invoiceNumberContainer: {},
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  invoiceDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  customerAddress: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
