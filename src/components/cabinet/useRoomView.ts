import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import { cancelAnimation, useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';

import { ROOM_H } from './layout';

const MAX_ZOOM = 3.2;
const TAP_ZOOM = 2.2;
const EASE = { duration: 260 };

/**
 * 진열장 방을 보는 시점. 밀면 걷고(관성 있음), 두 손가락으로 확대하고,
 * 두 번 누르면 그 자리를 확대하거나 전체 보기로 돌아온다.
 * 배율 1은 장 전체가 세로로 한눈에 들어오는 크기다.
 */
export function useRoomView(roomW: number) {
  const [view, setView] = useState({ w: 0, h: 0 });
  const fit = view.h ? view.h / ROOM_H : 1;
  const viewW = view.w;
  const viewH = view.h;

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // 방이 화면보다 작으면 가운데에, 크면 가장자리 밖으로 밀려나지 않게
  const boundX = (x: number, z: number) => {
    'worklet';
    const w = roomW * fit * z;
    return w <= viewW ? (viewW - w) / 2 : Math.min(0, Math.max(viewW - w, x));
  };
  const boundY = (y: number, z: number) => {
    'worklet';
    const h = ROOM_H * fit * z;
    return h <= viewH ? (viewH - h) / 2 : Math.min(0, Math.max(viewH - h, y));
  };
  const stop = () => {
    'worklet';
    cancelAnimation(tx);
    cancelAnimation(ty);
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: stop,
    onUpdate: (e) => {
      'worklet';
      tx.value = boundX(tx.value + e.changeX, zoom.value);
      ty.value = boundY(ty.value + e.changeY, zoom.value);
    },
    onDeactivate: (e) => {
      'worklet';
      // 손을 떼도 걷던 방향으로 조금 더 미끄러진다
      const w = roomW * fit * zoom.value;
      if (w > viewW) tx.value = withDecay({ velocity: e.velocityX, clamp: [viewW - w, 0] });
      const h = ROOM_H * fit * zoom.value;
      if (h > viewH) ty.value = withDecay({ velocity: e.velocityY, clamp: [viewH - h, 0] });
    },
  });

  const pinch = usePinchGesture({
    onBegin: stop,
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(MAX_ZOOM, Math.max(1, zoom.value * e.scaleChange));
      const k = next / zoom.value;
      zoom.value = next;
      // 두 손가락 사이 지점이 제자리에 있도록
      tx.value = boundX(e.focalX - (e.focalX - tx.value) * k, next);
      ty.value = boundY(e.focalY - (e.focalY - ty.value) * k, next);
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      const next = zoom.value > 1.05 ? 1 : TAP_ZOOM;
      const k = next / zoom.value;
      zoom.value = withTiming(next, EASE);
      tx.value = withTiming(boundX(e.x - (e.x - tx.value) * k, next), EASE);
      ty.value = withTiming(boundY(e.y - (e.y - ty.value) * k, next), EASE);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch, doubleTap);

  const roomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: fit * zoom.value }],
  }));

  // 앞쪽에 걸린 펜던트 조명은 벽보다 빨리 지나가 걷는 느낌을 준다. 확대하면 가리지 않게 사라진다.
  const lampsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value * 1.4 }],
    opacity: Math.max(0, 1 - (zoom.value - 1) * 2.5),
  }));

  // "전체 보기" 버튼은 확대했을 때만 보인다
  const resetStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (zoom.value - 1.05) * 6)) }));

  const zoomOut = () => {
    zoom.value = withTiming(1, EASE);
    tx.value = withTiming(boundX(tx.value, 1), EASE);
    ty.value = withTiming(boundY(0, 1), EASE);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ w: width, h: height });
  };

  return {
    ready: view.h > 0,
    /** 펜던트 조명을 몇 개 걸지 정할 때 쓰는, 배율 1에서의 방 너비(px) */
    fittedWidth: roomW * fit,
    gesture,
    roomStyle,
    lampsStyle,
    resetStyle,
    zoomOut,
    onLayout,
  };
}
