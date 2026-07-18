import React from 'react';
import { StyleSheet, View, Animated, Platform } from 'react-native';
import { Colors, Brand, Spacing } from '../constants/theme';

export const LoadingSkeleton: React.FC = () => {
  const theme = Colors.light;
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    const startShimmer = () => {
      animatedValue.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startShimmer();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <View>
          <Animated.View style={[styles.shimmer, { width: 100, height: 16, opacity, backgroundColor: '#E5E7EB', borderRadius: 4 }]} />
          <Animated.View style={[styles.shimmer, { width: 140, height: 28, opacity, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 8 }]} />
        </View>
        <Animated.View style={[styles.shimmer, { width: 44, height: 44, borderRadius: 22, opacity, backgroundColor: '#E5E7EB' }]} />
      </View>

      {/* Card Skeleton */}
      <Animated.View style={[styles.card, { opacity, backgroundColor: '#E5E7EB', borderRadius: Brand.borderRadius.xl }]} />

      {/* Block Skeleton */}
      <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderRadius: Brand.borderRadius.xl }]}>
        <Animated.View style={[styles.shimmer, { width: 180, height: 20, opacity, backgroundColor: '#E5E7EB', borderRadius: 4 }]} />
        <Animated.View style={[styles.shimmer, { width: '100%', height: 14, opacity, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 8 }]} />
        <Animated.View style={[styles.shimmer, { width: '80%', height: 14, opacity, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 6 }]} />
        <Animated.View style={[styles.shimmer, { width: 150, height: 48, opacity, backgroundColor: '#E5E7EB', borderRadius: 24, marginTop: 16 }]} />
      </View>

      {/* List Skeleton */}
      <View style={styles.list}>
        <Animated.View style={[styles.shimmer, { width: 80, height: 18, opacity, backgroundColor: '#E5E7EB', borderRadius: 4 }]} />
        <View style={styles.listItem}>
          <Animated.View style={[styles.shimmer, { width: 44, height: 44, borderRadius: 8, opacity, backgroundColor: '#E5E7EB' }]} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Animated.View style={[styles.shimmer, { width: 120, height: 16, opacity, backgroundColor: '#E5E7EB', borderRadius: 4 }]} />
            <Animated.View style={[styles.shimmer, { width: 80, height: 12, opacity, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: 6 }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    marginTop: Platform.OS === 'ios' ? 20 : 10,
  },
  shimmer: {
    // Pure placeholder layout
  },
  card: {
    height: 180,
    alignSelf: 'stretch',
    marginBottom: Spacing.four,
  },
  block: {
    padding: Spacing.four,
    alignSelf: 'stretch',
    height: 160,
    marginBottom: Spacing.four,
  },
  list: {
    alignSelf: 'stretch',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
