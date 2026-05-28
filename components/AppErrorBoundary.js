import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

/**
 * Top-level error boundary. If any descendant component throws during render,
 * we show a visible fallback instead of the whole screen going blank.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to the dev/browser console so the actual stack is visible.
    // (No-ops in production builds without console.)

    console.error('[AppErrorBoundary] Render crash:', error, info?.componentStack);
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ error: null });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message ?? String(this.state.error);
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body} numberOfLines={6}>
          {message}
        </Text>
        <Text style={styles.hint}>Reload the page to try again. If this keeps happening, share the error above.</Text>
        <Text
          style={styles.reload}
          accessibilityRole="button"
          onPress={this.handleReload}
        >
          Reload
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0b1830',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { color: '#fde68a', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  body: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 540,
  },
  hint: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 540 },
  reload: {
    marginTop: 14,
    paddingHorizontal: 26,
    paddingVertical: 10,
    color: '#fff8dd',
    fontWeight: '900',
    fontSize: 14,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
