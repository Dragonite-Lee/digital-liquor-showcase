import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrushFrame } from '@/components/BrushFrame';
import { currentAccount } from '@/lib/auth';
import { buyPack, PACKS, type Pack, packNote, WELCOME_CREDITS } from '@/lib/credits';
import { useCellar } from '@/store';
import { font, paper, space } from '@/theme';

const PAPER = require('../../../assets/ui/paper.png');

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 변환권 충전: 남은 장수, (로그인 안 했으면) 로그인하고 10장 받기, 묶음 4개.
 * 변환권이 없는데 "그리기"를 눌렀을 때, 그리고 계정 화면에서 연다.
 */
export function CreditSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const credits = useCellar((s) => s.credits);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    currentAccount()
      .then((a) => setLinked(a.linked))
      .catch(() => setLinked(null));
  }, [visible]);

  const buy = async (pack: Pack) => {
    setBuying(pack.id);
    try {
      if (await buyPack(pack)) onClose();
    } finally {
      setBuying(null);
    }
  };

  const login = () => {
    onClose();
    router.push('/login');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]}>
        <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.grip} />
        <Text style={styles.title} accessibilityRole="header">
          변환권
        </Text>
        <Text style={styles.balance}>남은 변환권 {credits ?? 0}장 · 그림 한 장에 1장</Text>

        {linked === false && (
          <Pressable onPress={login} accessibilityRole="button" style={({ pressed }) => [styles.welcome, pressed && styles.pressed]}>
            <BrushFrame radius={12} seed={41} />
            <Text style={styles.welcomeTitle}>로그인하면 변환권 {WELCOME_CREDITS}장을 드려요</Text>
            <Text style={styles.welcomeBody}>Apple·Google 계정마다 한 번 · 폰을 바꿔도 남은 장수가 이어져요</Text>
          </Pressable>
        )}

        <View style={styles.list}>
          {PACKS.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => buy(p)}
              disabled={buying !== null}
              accessibilityRole="button"
              accessibilityLabel={`${p.credits}회 변환권, ${p.price}`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && styles.pressed]}
            >
              <View style={styles.rowCopy}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowTitle}>{p.credits}회 변환권</Text>
                  {p.popular && <Text style={styles.badge}>인기</Text>}
                </View>
                <Text style={styles.rowNote}>{packNote(p)}</Text>
              </View>
              {buying === p.id ? <ActivityIndicator color={paper.ink} /> : <Text style={styles.price}>{p.price}</Text>}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10} style={styles.later}>
          <Text style={styles.laterLabel}>다음에</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(40,30,25,0.45)' },
  sheet: {
    backgroundColor: paper.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: space.l,
    paddingTop: space.s,
    gap: space.m,
  },
  grip: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(65,56,54,0.3)' },
  title: { fontFamily: font.hand, fontSize: 22, color: paper.ink, textAlign: 'center' },
  balance: { fontFamily: font.hand, fontSize: 15, color: paper.inkSoft, textAlign: 'center', marginTop: -8 },
  welcome: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', gap: 4 },
  welcomeTitle: { fontFamily: font.hand, fontSize: 17, color: paper.accent },
  welcomeBody: { fontFamily: font.hand, fontSize: 13, color: paper.ink },
  list: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: space.m },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(65,56,54,0.25)' },
  rowCopy: { flex: 1, gap: 3 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontFamily: font.hand, fontSize: 18, color: paper.ink },
  badge: {
    fontFamily: font.hand,
    fontSize: 12,
    color: paper.accent,
    borderWidth: 1,
    borderColor: paper.accent,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  rowNote: { fontFamily: font.hand, fontSize: 13, color: paper.inkSoft },
  price: { fontFamily: font.hand, fontSize: 19, color: paper.ink },
  later: { alignSelf: 'center', padding: space.xs },
  laterLabel: { fontFamily: font.hand, fontSize: 16, color: paper.inkSoft },
  pressed: { opacity: 0.55 },
});
