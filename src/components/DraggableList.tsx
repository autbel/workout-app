import { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isDragging: boolean) => React.ReactNode;
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

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const resetDrag = () => {
    cancelLongPress();
    dragY.setValue(0);
    activeKeyRef.current = null;
    startIndexRef.current = -1;
    setActiveKey(null);
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
              activeKeyRef.current = key;
              setActiveKey(key);
            }, 500);
          },
          onPanResponderMove: (_, { dy }) => {
            if (activeKeyRef.current !== key) return;
            dragY.setValue(dy);
          },
          onPanResponderRelease: (_, { dy }) => {
            cancelLongPress();
            if (activeKeyRef.current === key) {
              const startIndex = startIndexRef.current;
              const delta = Math.round(dy / itemHeight);
              const currentData = dataRef.current;
              const newIndex = Math.max(0, Math.min(currentData.length - 1, startIndex + delta));
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

  // Remove cached panResponders for deleted items
  const currentKeys = new Set(data.map(keyExtractor));
  panRespondersRef.current.forEach((_, k) => {
    if (!currentKeys.has(k)) panRespondersRef.current.delete(k);
  });

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item);
        const isDragging = activeKey === key;
        const pr = getOrCreatePanResponder(key);

        return (
          <Animated.View
            key={key}
            style={[
              isDragging && styles.dragging,
              isDragging && { transform: [{ translateY: dragY }] },
            ]}
            {...pr.panHandlers}
          >
            {renderItem(item, index, isDragging)}
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
