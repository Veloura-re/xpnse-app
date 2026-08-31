import React, { useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    runOnJS,
    interpolate,
    Extrapolation,
    withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
    TrendingUp,
    TrendingDown,
    BookOpen,
    Bell,
    AlertTriangle,
    Users,
    Trash2,
    CheckCircle,
    Info,
} from 'lucide-react-native';
import { Notification } from '@/providers/notification-provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PILL_WIDTH_COLLAPSED = 126;
const PILL_HEIGHT_COLLAPSED = 34;
const PILL_WIDTH_EXPANDED = SCREEN_WIDTH - 32;
const PILL_HEIGHT_EXPANDED = 80;
const AUTO_DISMISS_MS = 4200;

// ─── helpers ────────────────────────────────────────────────────────────────

function getNotifStyle(type?: Notification['type'], title?: string) {
    const t = title?.toLowerCase() ?? '';

    if (type === 'success' || t.includes('received') || t.includes('cash in') || t.includes('money received')) {
        return { color: '#10b981', bg: 'rgba(16,185,129,0.18)', Icon: TrendingUp };
    }
    if (type === 'error' || t.includes('paid') || t.includes('cash out') || t.includes('money paid')) {
        return { color: '#f43f5e', bg: 'rgba(244,63,94,0.18)', Icon: TrendingDown };
    }
    if (type === 'warning' || t.includes('deleted') || t.includes('removed')) {
        return { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', Icon: Trash2 };
    }
    if (t.includes('book')) {
        return { color: '#6366f1', bg: 'rgba(99,102,241,0.18)', Icon: BookOpen };
    }
    if (t.includes('team') || t.includes('invited') || t.includes('role') || t.includes('left')) {
        return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)', Icon: Users };
    }
    if (type === 'info') {
        return { color: '#38bdf8', bg: 'rgba(56,189,248,0.18)', Icon: Info };
    }
    return { color: '#64748b', bg: 'rgba(100,116,139,0.18)', Icon: Bell };
}

function truncate(str: string, max: number) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── component ──────────────────────────────────────────────────────────────

interface Props {
    notification: Notification | null;
    onDismiss: () => void;
}

export function DynamicIslandNotification({ notification, onDismiss }: Props) {
    const insets = useSafeAreaInsets();
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Shared animated values
    const progress = useSharedValue(0);   // 0 = hidden/collapsed, 1 = expanded
    const opacity  = useSharedValue(0);
    const scale    = useSharedValue(0.4);
    const wiggle   = useSharedValue(0);

    const clearTimer = () => {
        if (dismissTimer.current) {
            clearTimeout(dismissTimer.current);
            dismissTimer.current = null;
        }
    };

    const dismiss = useCallback(() => {
        clearTimer();
        progress.value = withTiming(0, { duration: 280 });
        opacity.value  = withDelay(80, withTiming(0, { duration: 200 }));
        scale.value    = withTiming(0.5, { duration: 280 });
        // Call parent after animation
        setTimeout(onDismiss, 360);
    }, [onDismiss]);

    useEffect(() => {
        if (!notification) return;

        clearTimer();

        // Entrance: pop in from Dynamic Island position
        opacity.value  = withTiming(1, { duration: 160 });
        scale.value    = withSpring(1, { damping: 18, stiffness: 300 });
        progress.value = withSpring(1, { damping: 20, stiffness: 220 });

        // Haptic pop
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Wiggle after expanding
        wiggle.value = withDelay(
            380,
            withSequence(
                withTiming(4, { duration: 60 }),
                withTiming(-4, { duration: 60 }),
                withTiming(3, { duration: 50 }),
                withTiming(-3, { duration: 50 }),
                withTiming(0, { duration: 40 })
            )
        );

        // Auto dismiss
        dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);

        return () => clearTimer();
    }, [notification?.id]);

    // ── animated styles ────────────────────────────────────────────────────

    const containerStyle = useAnimatedStyle(() => {
        const w = interpolate(
            progress.value,
            [0, 1],
            [PILL_WIDTH_COLLAPSED, PILL_WIDTH_EXPANDED],
            Extrapolation.CLAMP,
        );
        const h = interpolate(
            progress.value,
            [0, 1],
            [PILL_HEIGHT_COLLAPSED, PILL_HEIGHT_EXPANDED],
            Extrapolation.CLAMP,
        );
        const r = interpolate(
            progress.value,
            [0, 1],
            [PILL_HEIGHT_COLLAPSED / 2, 26],
            Extrapolation.CLAMP,
        );

        return {
            width: w,
            height: h,
            borderRadius: r,
            opacity: opacity.value,
            transform: [
                { scale: scale.value },
                { translateX: wiggle.value },
            ],
        };
    });

    const iconContainerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(progress.value, [0.5, 1], [0.5, 1], Extrapolation.CLAMP) }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
        transform: [{ translateY: interpolate(progress.value, [0.5, 1], [6, 0], Extrapolation.CLAMP) }],
    }));

    const dotStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
        transform: [{ scale: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP) }],
    }));

    if (!notification) return null;

    const { color, bg, Icon } = getNotifStyle(notification.type, notification.title);

    // Position: just below Dynamic Island / notch area
    const topOffset = insets.top + (Platform.OS === 'ios' ? 8 : 10);

    return (
        <View
            style={[styles.wrapper, { top: topOffset }]}
            pointerEvents="box-none"
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={dismiss}
                style={styles.touchArea}
            >
                <Animated.View style={[styles.pill, containerStyle]}>
                    {/* Collapsed dot indicator */}
                    <Animated.View style={[styles.collapsedDot, { backgroundColor: color }, dotStyle]} />

                    {/* Expanded content */}
                    <Animated.View style={[styles.expandedContent, iconContainerStyle]}>
                        {/* Icon */}
                        <View style={[styles.iconBg, { backgroundColor: bg }]}>
                            <Icon size={20} color={color} strokeWidth={2.2} />
                        </View>

                        {/* Text */}
                        <Animated.View style={[styles.textBlock, textStyle]}>
                            <Text style={styles.title} numberOfLines={1}>
                                {truncate(notification.title, 28)}
                            </Text>
                            <Text style={styles.message} numberOfLines={2}>
                                {truncate(notification.message, 68)}
                            </Text>
                        </Animated.View>

                        {/* Live dot */}
                        <View style={[styles.liveDot, { backgroundColor: color }]} />
                    </Animated.View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'box-none',
    } as any,
    touchArea: {
        alignItems: 'center',
    },
    pill: {
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 18,
        elevation: 20,
        // Glass border
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    collapsedDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    expandedContent: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 12,
        width: '100%',
    },
    iconBg: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    textBlock: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontFamily: 'SpaceGrotesk_700Bold',
        color: '#f8fafc',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    message: {
        fontFamily: 'SpaceGrotesk_400Regular',
        color: '#94a3b8',
        fontSize: 11.5,
        lineHeight: 15,
        fontWeight: '400',
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        flexShrink: 0,
        opacity: 0.85,
    },
});
