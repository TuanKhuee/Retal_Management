import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MoreVertical,
  ShieldCheck,
  Phone,
  MessageCircle,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  History,
  CheckCircle,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { tokens } from '../../../theme/tokens';
import { formatMoney } from '../../../utils/format';
import { useTenantDetail, useTenants } from '../api/landlordApi';

export function TenantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tenantsList } = useTenants();
  const tenantId = (id as string) || tenantsList?.[0]?._id || tenantsList?.[0]?.id || 'tenant-003';

  const [showCccd, setShowCccd] = useState(false);

  const { data: tenant, isLoading } = useTenantDetail(tenantId);

  if (isLoading && !tenant) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const tenantData = tenant || {
    _id: tenantId,
    fullName: 'Trần Anh Tuấn',
    phone: '0988 123 456',
    email: 'anhtuan.tran@gmail.com',
    cccdNumber: '079201001234',
    cccdMasked: '•••• •••• 1234',
    dateOfBirth: '15/09/1998',
    hometown: 'Hải Châu, Đà Nẵng',
    currentRoom: 'Phòng 204 • MoonLight Riverside',
    trustScore: '100%',
    currentDebt: 0,
    emergencyContact: {
      fullName: 'Trần Văn Hưng (Bố)',
      phone: '0903 556 778',
      relationship: 'Phụ huynh',
    },
    history: [
      {
        contractCode: 'HD-2024-082',
        room: 'Phòng 204',
        period: '08/2024 - 07/2025',
        status: 'Đang thuê',
      },
      {
        contractCode: 'HD-2023-019',
        room: 'Phòng 102',
        period: '08/2023 - 07/2024',
        status: 'Đã hoàn cọc',
      },
    ],
  };

  const displayedCccd = showCccd
    ? tenantData.cccdNumber || tenantData.idCard?.number || '079201001234'
    : tenantData.cccdMasked || '•••• •••• 1234';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ khách thuê</Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hero Profile Card */}
        <View style={styles.heroProfileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLAjbOoQoRcFtKP2LYyFwNU-cyubcdoL29TnU0p82HLdw-6RRRn9Bjk21nhYeO_7oDf_yItxFDw3Za9DkNTCOr85DQiPynxE4p8KD2ZyDLhihnRC9YakPkTdQKpip7W-jpl9WNxAR4KOxE7AZAKS0gcrv3OmetIyjlKWGujxtMn5JsQfrGJD0zGKXoDlSbiUp2MMmD9mUVe3CMRKlxJ2tjkSUAYJXcHsbQ0UFhAvs',
                }}
                style={styles.avatarImg}
              />
              <View style={styles.verifiedStarPill}>
                <ShieldCheck size={11} color="#ffffff" />
              </View>
            </View>

            <View style={styles.profileTextInfo}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.tenantFullName}>{tenantData.fullName}</Text>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>Trưởng phòng</Text>
                </View>
              </View>
              <Text style={styles.currentRoomText}>{tenantData.currentRoom}</Text>
              <View style={styles.statusRow}>
                <View style={styles.activeRentTag}>
                  <View style={styles.greenDot} />
                  <Text style={styles.activeRentTagText}>Đang thuê hợp lệ</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Contact Action Bar */}
          <View style={styles.contactBar}>
            <View style={styles.phoneLabelWrap}>
              <Phone size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.phoneText}>{tenantData.phone}</Text>
            </View>
            <View style={styles.contactButtonsRow}>
              <TouchableOpacity
                style={styles.contactActionBtn}
                onPress={() => Linking.openURL(`tel:${tenantData.phone}`)}
              >
                <Phone size={15} color={colors.primary} />
                <Text style={styles.contactActionBtnText}>Gọi điện</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactActionBtn, styles.zaloBtn]}
                onPress={() => Linking.openURL(`https://zalo.me/${tenantData.phone.replace(/\D/g, '')}`)}
              >
                <MessageCircle size={15} color="#ffffff" />
                <Text style={styles.zaloBtnText}>Zalo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. Legal & CCCD Security Card (AES-256 decrypted) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <CreditCard size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionCardTitle}>Pháp lý & CCCD</Text>
                <Text style={styles.sectionCardSub}>Dữ liệu mã hóa AES-256 GCM (NĐ 13)</Text>
              </View>
            </View>
            <View style={styles.verifiedKycBadge}>
              <ShieldCheck size={13} color={colors.secondary} />
              <Text style={styles.verifiedKycText}>Đã xác minh</Text>
            </View>
          </View>

          {/* CCCD Protected Display Box */}
          <View style={styles.cccdBox}>
            <View style={styles.cccdRow}>
              <Text style={styles.cccdLabel}>Số định danh CCCD</Text>
              <View style={styles.cccdRightGroup}>
                <Text style={styles.cccdNumberText}>{displayedCccd}</Text>
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowCccd(!showCccd)}
                >
                  {showCccd ? (
                    <>
                      <EyeOff size={14} color={colors.primary} />
                      <Text style={styles.eyeToggleText}>Ẩn số</Text>
                    </>
                  ) : (
                    <>
                      <Eye size={14} color={colors.primary} />
                      <Text style={styles.eyeToggleText}>Hiện số</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.boxDivider} />

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Ngày sinh</Text>
                <Text style={styles.metaValue}>{tenantData.dateOfBirth}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Quê quán</Text>
                <Text style={styles.metaValue}>{tenantData.hometown}</Text>
              </View>
            </View>
          </View>

          {/* CCCD Photos Scan Preview */}
          <View style={styles.cccdPhotosGrid}>
            <View style={styles.cccdPhotoCard}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJf4BV8-HBWQcYrNJwTw8JALhWCRvL4ms2mjycV-e8KmfhmKEt9Msaq_0DjxOw5zGC2bwo4abamvz9lojAOUpg-PyM-8IcHADh8Es_K3If8BNfo55HYmdtBIK_31utH6Uzi-BhTndKPEMBkeZVCgXvV188BB9GMxG32P2BuWIWWwiZ9Zqc531--Pc_rLqiIcH7jx1SfnynpmyKcUgdUvfu3k2dkbu0om_15E0q-ug',
                }}
                style={styles.cccdImg}
              />
              <View style={styles.photoOverlay}>
                <CheckCircle size={12} color="#ffffff" />
                <Text style={styles.photoOverlayText}>Mặt trước</Text>
              </View>
            </View>

            <View style={styles.cccdPhotoCard}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKHFIrPWMcjnETF5J5rKwCcx5pW_tATY02BWaVRW2o1ww1il43bxmwYkqIooQH7NLoCl2zYYeJIIENuBIwEzA-Yw-Za6IA668X3a95iztO5rqzWVqF7_ztfBsMCg1ww1fH6PhvishzyMbCEvnq62XZ8PMnEIESf781GEM7cqjvWtMyPzfDyP2tmV0kJE0ovlb7x8ZhkvvByAd4da5Ki6m5D6O-OFbx7ZibKjHV10g',
                }}
                style={styles.cccdImg}
              />
              <View style={styles.photoOverlay}>
                <CheckCircle size={12} color="#ffffff" />
                <Text style={styles.photoOverlayText}>Mặt sau</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Financial & Trust Status */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#ffdf9f' }]}>
                <Wallet size={18} color={colors.secondary} />
              </View>
              <Text style={styles.sectionCardTitle}>Công nợ & Thanh toán</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>Tín nhiệm {tenantData.trustScore}</Text>
            </View>
          </View>

          <View style={styles.debtBanner}>
            <View>
              <Text style={styles.debtBannerLabel}>Công nợ hiện tại</Text>
              <Text style={styles.debtBannerAmount}>{formatMoney(tenantData.currentDebt)}</Text>
            </View>
            <View style={styles.debtStatusPill}>
              <CheckCircle size={14} color="#2e7d32" />
              <Text style={styles.debtStatusPillText}>Đã đóng đúng hạn</Text>
            </View>
          </View>
        </View>

        {/* 5. Emergency Contact */}
        {tenantData.emergencyContact && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Liên hệ khẩn cấp</Text>
            <View style={styles.emergencyRow}>
              <View>
                <Text style={styles.emergencyName}>{tenantData.emergencyContact.fullName}</Text>
                <Text style={styles.emergencyPhone}>{tenantData.emergencyContact.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => Linking.openURL(`tel:${tenantData.emergencyContact?.phone}`)}
              >
                <Phone size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 6. Rental History */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <History size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>Lịch sử thuê phòng</Text>
            </View>
          </View>

          <View style={styles.historyList}>
            {tenantData.history?.map((item, idx) => (
              <View key={idx} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyCode}>HĐ #{item.contractCode}</Text>
                  <Text style={styles.historyRoom}>{item.room} • {item.period}</Text>
                </View>
                <View style={styles.historyStatusBadge}>
                  <Text style={styles.historyStatusText}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    height: 56,
    paddingHorizontal: tokens.spacing.margin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.margin,
    paddingTop: tokens.spacing.md,
    paddingBottom: 40,
    gap: tokens.spacing.md,
  },
  heroProfileCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  verifiedStarPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextInfo: {
    flex: 1,
    gap: 3,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tenantFullName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roleTag: {
    backgroundColor: '#e2dfff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  currentRoomText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  activeRentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  activeRentTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  phoneLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radii.sm,
    ...tokens.shadows.sm,
  },
  contactActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  zaloBtn: {
    backgroundColor: colors.primary,
  },
  zaloBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: tokens.radii.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionCardSub: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  verifiedKycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffdf9f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedKycText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
  },
  cccdBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  cccdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cccdLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  cccdRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cccdNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 1,
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eyeToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  boxDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  cccdPhotosGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: 4,
  },
  cccdPhotoCard: {
    flex: 1,
    height: 100,
    borderRadius: tokens.radii.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceContainer,
  },
  cccdImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 27, 43, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  photoOverlayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  trustBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  debtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  debtBannerLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  debtBannerAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  debtStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  debtStatusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  emergencyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emergencyPhone: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  callIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyList: {
    gap: tokens.spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
  },
  historyCode: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  historyRoom: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  historyStatusBadge: {
    backgroundColor: '#e2dfff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});
