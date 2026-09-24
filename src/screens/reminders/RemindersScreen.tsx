import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchRemindersThunk,
  addReminderThunk,
  toggleReminderStatusThunk,
  deleteReminderThunk,
  setReminderFilter,
} from '../../redux/slices/reminderSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { ReminderEntity } from '../../types/database';
import { useNavigation } from '@react-navigation/native';

export const RemindersScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const { reminders, filter, isLoading } = useAppSelector(state => state.reminders);
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00 AM');
  const [type, setType] = useState<'client' | 'personal'>('client');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    dispatch(fetchRemindersThunk());
  }, [dispatch]);

  const filteredReminders = reminders.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'शीर्षक आवश्यक' : 'Missing Title',
          message: isMarathi
            ? 'कृपया स्मरणपत्रासाठी शीर्षक प्रविष्ट करा.'
            : 'Please enter a title for the reminder.',
        }),
      );
      return;
    }

    const newReminder: ReminderEntity = {
      id: 'rem_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      date: date.trim() || new Date().toISOString().split('T')[0],
      time: time.trim() || '10:00 AM',
      type,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dispatch(addReminderThunk(newReminder));
    dispatch(
      showFeedback({
        type: 'success',
        title: isMarathi ? 'स्मरणपत्र तयार झाले' : 'Reminder Created',
        message: isMarathi
          ? 'तुमचे स्मरणपत्र यशस्वीरित्या जोडले गेले आहे.'
          : 'Your reminder has been scheduled successfully.',
      }),
    );

    setModalVisible(false);
    setTitle('');
    setDescription('');
  };

  const handleToggle = (id: string) => {
    dispatch(toggleReminderStatusThunk(id));
  };

  const handleDelete = (id: string) => {
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'स्मरणपत्र हटवायचे का?' : 'Delete Reminder?',
        message: isMarathi
          ? 'तुम्हाला नक्की हे स्मरणपत्र हटवायचे आहे का?'
          : 'Are you sure you want to remove this reminder?',
        confirmText: isMarathi ? 'हटवा' : 'Delete',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: () => {
          dispatch(deleteReminderThunk(id));
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'स्मरणपत्रे व कामे' : 'Reminders'}
        subtitle={
          isMarathi
            ? 'ग्राहक पाठपुरावा व वैयक्तिक कामे'
            : 'Client follow-ups & personal tasks'
        }
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'add',
          onPress: () => setModalVisible(true),
        }}
      />

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {(['pending', 'completed', 'all'] as const).map(tab => {
          let label = tab.charAt(0).toUpperCase() + tab.slice(1);
          if (tab === 'pending') label = isMarathi ? 'अपूर्ण' : 'Pending';
          if (tab === 'completed') label = isMarathi ? 'पूर्ण' : 'Completed';
          if (tab === 'all') label = isMarathi ? 'सर्व' : 'All';

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => dispatch(setReminderFilter(tab))}
              style={[
                styles.tabBtn,
                filter === tab && styles.tabBtnActive,
              ]}>
              <Text
                style={[
                  styles.tabText,
                  filter === tab && styles.tabTextActive,
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredReminders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'completed';
          const priorityVariant =
            item.priority === 'high'
              ? 'danger'
              : item.priority === 'medium'
              ? 'warning'
              : 'neutral';

          return (
            <View style={[styles.card, isCompleted && styles.cardCompleted]}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  onPress={() => handleToggle(item.id)}
                  style={styles.checkboxTouch}>
                  <View
                    style={[
                      styles.checkbox,
                      isCompleted && styles.checkboxActive,
                    ]}>
                    {isCompleted && (
                      <Icon name="check" size={14} color={colors.textLight} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.cardTitle,
                      isCompleted && styles.cardTitleCompleted,
                    ]}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.cardDescription}>{item.description}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}>
                  <Icon name="trash" size={16} color={colors.gray400} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Icon name="calendar" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item.date}</Text>
                  <Icon name="clock" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{item.time}</Text>
                </View>

                <View style={styles.badgeGroup}>
                  <Badge
                    label={
                      item.type === 'client'
                        ? isMarathi ? 'ग्राहक' : 'Client'
                        : isMarathi ? 'वैयक्तिक' : 'Personal'
                    }
                    variant={item.type === 'client' ? 'primary' : 'info'}
                    size="sm"
                  />
                  <Badge
                    label={
                      item.priority === 'low'
                        ? isMarathi ? 'कमी' : 'Low'
                        : item.priority === 'medium'
                        ? isMarathi ? 'मध्यम' : 'Medium'
                        : isMarathi ? 'उच्च' : 'High'
                    }
                    variant={priorityVariant}
                    size="sm"
                  />
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="clock" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>
              {isMarathi ? 'कोणतेही स्मरणपत्र नाही' : 'No Reminders Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isMarathi
                ? 'ग्राहक पाठपुरावा किंवा वैयक्तिक कामांसाठी वरील "+ स्मरणपत्र जोडा" बटणावर टॅप करा.'
                : 'Tap the "+ Add Reminder" button to set client callbacks or personal schedule alerts.'}
            </Text>
          </View>
        }
      />

      {/* Add Reminder Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isMarathi ? 'नवीन स्मरणपत्र' : 'New Reminder'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Input
                label={isMarathi ? 'स्मरणपत्र शीर्षक' : 'Reminder Title'}
                value={title}
                onChangeText={setTitle}
                placeholder={
                  isMarathi
                    ? 'उदा. पाईप डिलिव्हरीसाठी हणबरवाडी साईटवर कॉल'
                    : 'e.g. Call Hanbarwadi site for pipe delivery'
                }
                required
              />

              <Input
                label={isMarathi ? 'तपशील' : 'Description'}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  isMarathi
                    ? 'फोन नंबर किंवा इतर महत्त्वाची माहिती'
                    : 'Details or phone numbers'
                }
                multiline
                numberOfLines={2}
              />

              <View style={styles.rowTwo}>
                <View style={styles.halfCol}>
                  <Input
                    label={isMarathi ? 'तारीख' : 'Date'}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.halfCol}>
                  <Input
                    label={isMarathi ? 'वेळ' : 'Time'}
                    value={time}
                    onChangeText={setTime}
                    placeholder={isMarathi ? 'उदा. १०:३० AM' : 'e.g. 10:30 AM'}
                  />
                </View>
              </View>

              {/* Type Selector */}
              <Text style={styles.selectorLabel}>
                {isMarathi ? 'स्मरणपत्र प्रकार' : 'Reminder Type'}
              </Text>
              <View style={styles.selectorRow}>
                <TouchableOpacity
                  onPress={() => setType('client')}
                  style={[
                    styles.selectorBtn,
                    type === 'client' && styles.selectorBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.selectorBtnText,
                      type === 'client' && styles.selectorBtnTextActive,
                    ]}>
                    {isMarathi ? 'ग्राहक स्मरणपत्र' : 'Client Reminder'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setType('personal')}
                  style={[
                    styles.selectorBtn,
                    type === 'personal' && styles.selectorBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.selectorBtnText,
                      type === 'personal' && styles.selectorBtnTextActive,
                    ]}>
                    {isMarathi ? 'वैयक्तिक स्मरणपत्र' : 'Personal Reminder'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Priority Selector */}
              <Text style={styles.selectorLabel}>
                {isMarathi ? 'प्राधान्य' : 'Priority'}
              </Text>
              <View style={styles.selectorRow}>
                {(['low', 'medium', 'high'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.selectorBtn,
                      priority === p && styles.selectorBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.selectorBtnText,
                        priority === p && styles.selectorBtnTextActive,
                      ]}>
                      {p === 'low'
                        ? isMarathi ? 'कमी' : 'LOW'
                        : p === 'medium'
                        ? isMarathi ? 'मध्यम' : 'MEDIUM'
                        : isMarathi ? 'उच्च' : 'HIGH'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={isMarathi ? 'स्मरणपत्र जतन करा' : 'Schedule Reminder'}
                onPress={handleSaveReminder}
                icon="save"
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textLight,
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
  cardCompleted: {
    opacity: 0.65,
    backgroundColor: colors.gray50,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxTouch: {
    padding: 2,
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: spacing.xs,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 4,
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
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {},
  rowTwo: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectorBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectorBtnTextActive: {
    color: colors.textLight,
  },
  saveBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
