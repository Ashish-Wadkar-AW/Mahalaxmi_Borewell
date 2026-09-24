import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchQuotationsThunk,
  setSearchQuery,
  setStatusFilter,
} from '../../redux/slices/quotationSlice';
import { QuotationEntity, QuotationStatus } from '../../types/database';

export const QuotationListScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');
  const { quotations, searchQuery, statusFilter, isLoading } = useAppSelector(
    state => state.quotations,
  );

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      console.log('[QUOTATION][LIST][LOAD]');
      console.log('[QUOTATION][LIST][OPEN]');
      dispatch(fetchQuotationsThunk());
    }, [dispatch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchQuotationsThunk());
    setRefreshing(false);
  };

  const getBadgeVariant = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'invoiced':
        return 'info';
      case 'completed':
        return 'primary';
      case 'in_progress':
        return 'warning';
      case 'rejected':
        return 'danger';
      case 'sent':
        return 'info';
      case 'draft':
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved':
        return isMarathi ? 'मंजूर' : 'Approved';
      case 'invoiced':
        return isMarathi ? 'इनव्हॉइस झाले' : 'Converted';
      case 'completed':
        return isMarathi ? 'पूर्ण झाले' : 'Completed';
      case 'in_progress':
        return isMarathi ? 'काम चालू' : 'In Progress';
      case 'rejected':
        return isMarathi ? 'नाकारले' : 'Rejected';
      case 'sent':
        return isMarathi ? 'पाठवले' : 'Sent';
      case 'draft':
      default:
        return isMarathi ? 'ड्राफ्ट' : 'Draft';
    }
  };

  const filterOptions: { key: 'all' | QuotationStatus; labelMr: string; labelEn: string }[] = [
    { key: 'all', labelMr: 'सर्व', labelEn: 'All' },
    { key: 'draft', labelMr: 'ड्राफ्ट', labelEn: 'Draft' },
    { key: 'sent', labelMr: 'पाठवले', labelEn: 'Sent' },
    { key: 'approved', labelMr: 'मंजूर', labelEn: 'Approved' },
    { key: 'in_progress', labelMr: 'काम चालू', labelEn: 'In Progress' },
    { key: 'completed', labelMr: 'पूर्ण', labelEn: 'Completed' },
    { key: 'invoiced', labelMr: 'इनव्हॉइस झाले', labelEn: 'Converted' },
  ];

  const filteredQuotations = quotations.filter(q => {
    const qNum = q.quotationNumber || q.billNumber || '';
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.customerPhone && q.customerPhone.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'all' ||
      q.status === statusFilter ||
      (!q.status && statusFilter === 'draft');

    return matchesSearch && matchesStatus;
  });

  const renderItem = ({ item }: { item: QuotationEntity }) => {
    const qNumber = item.quotationNumber || item.billNumber || 'Q-001';
    const isPaid = item.paymentStatus === 'paid';
    const isPartial = item.paymentStatus === 'partial';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.card}
        onPress={() => {
          console.log('[QUOTATION][DETAIL][OPEN]', {
            quotationId: item.id,
          });
          navigation.navigate('QuotationDetail', {
            quotation: item,
            quotationId: item.id,
          });
        }}>
        <View style={styles.cardHeader}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{qNumber}</Text>
          </View>
          <View style={styles.badgeRow}>
            <Badge
              label={
                isPaid
                  ? isMarathi ? 'पूर्ण जमा' : 'Paid'
                  : isPartial
                  ? isMarathi ? 'अॅडव्हान्स' : 'Advance'
                  : isMarathi ? 'देणे बाकी' : 'Not Paid'
              }
              variant={isPaid ? 'success' : isPartial ? 'warning' : 'danger'}
              size="sm"
            />
            <Badge
              label={getStatusLabel(item.status)}
              variant={getBadgeVariant(item.status) as any}
              size="sm"
            />
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          {item.customerPhone ? (
            <Text style={styles.customerPhone}>📞 {item.customerPhone}</Text>
          ) : null}
          {item.customerAddress ? (
            <Text style={styles.customerAddress} numberOfLines={1}>
              📍 {item.customerAddress}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>{isMarathi ? 'दिनांक' : 'Date'}</Text>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>{isMarathi ? 'एकूण अंदाज' : 'Total Estimate'}</Text>
            <Text style={styles.amountText}>
              ₹ {item.totalAmount ? item.totalAmount.toLocaleString('en-IN') : '0.00'}
            </Text>
            {isPartial ? (
              <Text style={styles.paymentSubtext}>
                {isMarathi ? 'जमा:' : 'Paid:'} ₹{(item.paidAmount || 0).toLocaleString('en-IN')} | {isMarathi ? 'बाकी:' : 'Bal:'} ₹{(item.remainingAmount || 0).toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'कोटेशन यादी' : 'Quotations'}
        subtitle={
          isMarathi
            ? `एकूण ${filteredQuotations.length} कोटेशन्स`
            : `${filteredQuotations.length} total quotations`
        }
        rightElement={
          <TouchableOpacity
            style={styles.newQuoteBtn}
            onPress={() => navigation.navigate('BillingTab', { screen: 'CustomerInformation' })}>
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newQuoteBtnText}>
              {isMarathi ? 'नवीन' : 'New'}
            </Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isMarathi
                ? 'ग्राहक नाव, फोन किंवा कोटेशन नं. शोधा...'
                : 'Search by customer, phone or quote #...'
            }
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={text => dispatch(setSearchQuery(text))}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Icon name="close" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterScrollWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={item => item.key}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  statusFilter === item.key && styles.filterPillActive,
                ]}
                onPress={() => dispatch(setStatusFilter(item.key))}>
                <Text
                  style={[
                    styles.filterPillText,
                    statusFilter === item.key && styles.filterPillTextActive,
                  ]}>
                  {isMarathi ? item.labelMr : item.labelEn}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Quotations List */}
        <FlatList
          data={filteredQuotations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isLoading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="fileText" size={56} color={colors.gray300} />
              <Text style={styles.emptyTitle}>
                {isMarathi ? 'कोणतेही कोटेशन आढळले नाही' : 'No Quotations Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? isMarathi
                    ? 'शोध निकष बदलून पुन्हा प्रयत्न करा'
                    : 'Try different search terms'
                  : isMarathi
                    ? 'नवीन कोटेशन तयार करण्यासाठी वर "नवीन" बटण दाबा.'
                    : 'Tap "+ New" above to create your first quotation.'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F4EC',
  },
  container: {
    flex: 1,
  },
  newQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    ...shadows.sm,
  },
  newQuoteBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#D4C6AB',
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.textPrimary,
  },
  filterScrollWrapper: {
    marginVertical: spacing.xs,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    marginRight: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2D7C3',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numberBadge: {
    backgroundColor: '#FAF7F0',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#D4C6AB',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  cardBody: {
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0EAD6',
    paddingTop: spacing.xs,
    marginTop: 2,
  },
  dateCol: {},
  dateLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: '600',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B7791F',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
});
