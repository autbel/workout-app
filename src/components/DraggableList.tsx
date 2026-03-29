import { useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (
    item: T,
    index: number,
    isDragging: boolean,
    onMoveUp: (() => void) | null,
    onMoveDown: (() => void) | null,
  ) => React.ReactNode;
  onReorder: (newData: T[]) => void;
  itemHeight?: number;
}

export default function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  itemHeight = 52,
}: DraggableListProps<T>) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  // Always-current refs so PanResponder closures don't go stale
  const dataRef = useRef(data);
  const onReorderRef = useRef(onReorder);
  const keyExtractorRef = useRef(keyExtractor);
  dataRef.current = data;
  onReorderRef.current = onReorder;
  keyExtractorRef.current = keyExtractor;

  const panRespondersRef = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const startIndexRef = useRef(-1);

  // Per-item animated offsets for live drag preview and button moves
  const itemOffsetsRef = useRef<Map<string, Animated.Value>>(new Map());
  const pendingIndexRef = useRef<number>(-1);

  // Pending FLIP data for ▲▼ button moves
  const pendingFlipRef = useRef<{ fromKey: string; toKey: string; direction: number } | null>(null);

  // FLIP animation: runs after layout commits so compensating offset and
  // new layout position are applied in the same native frame (no flash).
  useLayoutEffect(() => {
    if (!pendingFlipRef.current) return;
    const { fromKey, toKey, direction } = pendingFlipRef.current;
    pendingFlipRef.current = null;

    if (!itemOffsetsRef.current.has(fromKey)) {
      itemOffsetsRef.current.set(fromKey, new Animated.Value(0));
    }
    if (!itemOffsetsRef.current.has(toKey)) {
      itemOffsetsRef.current.set(toKey, new Animated.Value(0));
    }
    const fromOffset = itemOffsetsRef.current.get(fromKey)!;
    const toOffset = itemOffsetsRef.current.get(toKey)!;

    // Items are now at new layout positions.
    // Set offsets so they appear at their OLD positions (Invert step of FLIP).
    fromOffset.setValue(-direction * itemHeight);
    toOffset.setValue(direction * itemHeight);

    // Animate to 0 — items slide smoothly to their actual new positions (Play step).
    Animated.parallel([
      Animated.spring(fromOffset, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 0 }),
      Animated.spring(toOffset, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 0 }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, itemHeight]);

  const getOrCreateOffset = (key: string): Animated.Value => {
    if (!itemOffsetsRef.current.has(key)) {
      itemOffsetsRef.current.set(key, new Animated.Value(0));
    }
    return itemOffsetsRef.current.get(key)!;
  };

  const updateOffsets = (startIndex: number, newPendingIndex: number) => {
    const currentData = dataRef.current;
    currentData.forEach((item, i) => {
      const k = keyExtractorRef.current(item);
      if (k === activeKeyRef.current) return;
      const offset = getOrCreateOffset(k);
      let toValue = 0;
      if (newPendingIndex > startIndex) {
        if (i > startIndex && i <= newPendingIndex) toValue = -itemHeight;
      } else if (newPendingIndex < startIndex) {
        if (i >= newPendingIndex && i < startIndex) toValue = itemHeight;
      }
      Animated.spring(offset, { toValue, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
    });
    pendingIndexRef.current = newPendingIndex;
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const resetDrag = () => {
    cancelLongPress();
    dragY.setValue(0);
    itemOffsetsRef.current.forEach((v) => v.setValue(0));
    pendingIndexRef.current = -1;
    activeKeyRef.current = null;
    startIndexRef.current = -1;
    setActiveKey(null);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const currentData = dataRef.current;
    const fromKey = keyExtractorRef.current(currentData[fromIndex]);
    const toKey = keyExtractorRef.current(currentData[toIndex]);

    // Record FLIP data before triggering reorder (useLayoutEffect picks it up after re-render)
    pendingFlipRef.current = { fromKey, toKey, direction: toIndex - fromIndex };

    const next = [...currentData];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderRef.current(next);
  };

  const getOrCreatePanResponder = (key: string) => {
    if (!panRespondersRef.current.has(key)) {
      panRespondersRef.current.set(
        key,
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => activeKeyRef.current === key,
          onPanResponderGrant: () => {
            cancelLongPress();
            const currentIndex = dataRef.current.findIndex(
              (item) => keyExtractorRef.current(item) === key,
            );
            longPressTimerRef.current = setTimeout(() => {
              dragY.setValue(0);
              startIndexRef.current = currentIndex;
              pendingIndexRef.current = currentIndex;
              activeKeyRef.current = key;
              setActiveKey(key);
            }, 500);
          },
          onPanResponderMove: (_, { dy }) => {
            if (activeKeyRef.current !== key) return;
            dragY.setValue(dy);
            const startIndex = startIndexRef.current;
            const currentData = dataRef.current;
            const rawIndex = Math.round(dy / itemHeight);
            const newPendingIndex = Math.max(0, Math.min(currentData.length - 1, startIndex + rawIndex));
            if (newPendingIndex !== pendingIndexRef.current) {
              updateOffsets(startIndex, newPendingIndex);
            }
          },
          onPanResponderRelease: (_, { dy }) => {
            cancelLongPress();
            if (activeKeyRef.current === key) {
              const startIndex = startIndexRef.current;
              const delta = Math.round(dy / itemHeight);
              const currentData = dataRef.current;
              const newIndex = Math.max(0, Math.min(currentData.length - 1, startIndex + delta));
              // Reset all offsets instantly (visual position is already correct from live preview)
              itemOffsetsRef.current.forEach((v) => v.setValue(0));
              pendingIndexRef.current = -1;
              if (newIndex !== startIndex) {
                const next = [...currentData];
                const [moved] = next.splice(startIndex, 1);
                next.splice(newIndex, 0, moved);
                onReorderRef.current(next);
              }
            }
            resetDrag();
          },
          onPanResponderTerminate: () => {
            resetDrag();
          },
        }),
      );
    }
    return panRespondersRef.current.get(key)!;
  };

  // Remove cached entries for deleted items
  const currentKeys = new Set(data.map(keyExtractor));
  panRespondersRef.current.forEach((_, k) => {
    if (!currentKeys.has(k)) panRespondersRef.current.delete(k);
  });
  itemOffsetsRef.current.forEach((_, k) => {
    if (!currentKeys.has(k)) itemOffsetsRef.current.delete(k);
  });

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item);
        const isDragging = activeKey === key;
        const pr = getOrCreatePanResponder(key);
        const onMoveUp = index > 0 ? () => moveItem(index, index - 1) : null;
        const onMoveDown = index < data.length - 1 ? () => moveItem(index, index + 1) : null;

        return (
          <Animated.View
            key={key}
            style={[
              isDragging && styles.dragging,
              { transform: [{ translateY: isDragging ? dragY : getOrCreateOffset(key) }] },
            ]}
            {...pr.panHandlers}
          >
            {renderItem(item, index, isDragging, onMoveUp, onMoveDown)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dragging: {
    zIndex: 999,
    elevation: 8,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
