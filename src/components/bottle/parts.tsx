import type React from 'react';
import { Image } from 'expo-image';
import { type ReactNode, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandIcon } from '@/components/HandIcon';
import { font, paper, space } from '@/theme';

// 피그마 "술병 진열하기" 화면(병 상세·촬영 뒤 확인)이 함께 쓰는 조각들.

const PAPER = require('../../../assets/ui/paper.png');

/** 종이 배경 + 가운데 제목 + 오른쪽 닫기 */
export function PaperScreen({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.side} />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={12} style={styles.side}>
          <HandIcon name="close" size={23} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

/** 구역 제목 ("테마를 선택해 주세요" 등) */
export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

/** 병 이름: 큰 손글씨 + 연필 아이콘. 연필을 누르면 이름 칸에 바로 커서가 간다. */
export function NameField({
  value,
  onChange,
  placeholder = '병 이름',
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  busy?: boolean;
}) {
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <View style={styles.nameRow}>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(65,56,54,0.45)"
        style={styles.name}
        accessibilityLabel="병 이름"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
      />
      {busy ? (
        <ActivityIndicator color={paper.ink} />
      ) : (
        <Pressable onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="이름 고치기" hitSlop={10}>
          <HandIcon name="pen" size={24} />
        </Pressable>
      )}
    </View>
  );
}

export function SmallText({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'accent' | 'soft' }) {
  return <Text style={[styles.small, tone === 'accent' && styles.accent, tone === 'soft' && styles.soft]}>{children}</Text>;
}

/** 기록(메모) 상자 */
export function MemoBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.memo}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="기록을 남겨 주세요"
        placeholderTextColor={paper.ink}
        style={styles.memoInput}
        multiline
        textAlignVertical="top"
        accessibilityLabel="기록"
        maxLength={500}
      />
    </View>
  );
}

/** 밑줄 친 손글씨 버튼 ("삭제하기", "다시 찍기") */
export function UnderlineButton({ label, onPress, hint }: { label: string; onPress: () => void; hint?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint={hint} hitSlop={8} style={styles.underlineHit}>
      {({ pressed }) => <Text style={[styles.underline, pressed && { opacity: 0.5 }]}>{label}</Text>}
    </Pressable>
  );
}

export const formStyles = StyleSheet.create({
  /** 병 그림 자리 (피그마 272px) */
  stage: { height: 272, alignItems: 'center', justifyContent: 'flex-end' },
  bottle: { width: 200, height: 272 },
  /** 본문: 좌우 16, 위아래 24, 구역 사이 20 */
  body: { paddingHorizontal: 16, paddingTop: 24, gap: 20 },
  /** 구역 안: 제목과 내용 사이 12 */
  option: { gap: 12 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: paper.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  side: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.hand, fontSize: 18, color: paper.ink, textAlign: 'center' },
  section: { fontFamily: font.hand, fontSize: 16, color: paper.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  name: { flex: 1, fontFamily: font.hand, fontSize: 20, color: paper.ink, padding: 0, margin: 0 },
  small: { fontFamily: font.hand, fontSize: 14, color: paper.ink },
  accent: { color: paper.accent },
  soft: { color: paper.inkSoft },
  memo: { height: 160, padding: 12, backgroundColor: 'rgba(255,255,255,0.8)' },
  memoInput: { flex: 1, fontFamily: font.hand, fontSize: 16, lineHeight: 24, color: paper.ink, padding: 0 },
  underlineHit: { alignSelf: 'flex-start' },
  underline: { fontFamily: font.hand, fontSize: 20, color: paper.ink, textDecorationLine: 'underline' },
});
