import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { BookOpen, BarChart3, Settings, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface FloatingDockProps {
    state: {
        index: number;
        routes: Array<{ key: string; name: string; params?: any }>;
    };
    descriptors: Record<string, { options: any }>;
    navigation: {
        emit: (event: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
        navigate: (name: string, params?: any) => void;
    };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DOCK_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function FloatingDock({ state, descriptors, navigation }: FloatingDockProps | any) {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();

    const getIcon = (routeName: string, isFocused: boolean, size: number) => {
        const color = isFocused ? colors.primary : colors.textSecondary;
        switch (routeName) {
            case 'index':
                return <BookOpen size={size} color={color} strokeWidth={isFocused ? 2.3 : 1.8} />;
            case 'team':
                return <Users size={size} color={color} strokeWidth={isFocused ? 2.3 : 1.8} />;
            case 'analytics':
                return <BarChart3 size={size} color={color} strokeWidth={isFocused ? 2.3 : 1.8} />;
            case 'settings':
                return <Settings size={size} color={color} strokeWidth={isFocused ? 2.3 : 1.8} />;
            default:
                return <BookOpen size={size} color={color} strokeWidth={isFocused ? 2.3 : 1.8} />;
        }
    };

    return (
        <View style={[styles.container, { bottom: Math.max(insets.bottom + 12, 20) }]}>
            <View style={styles.dockShadow}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 45 : 90}
                    style={[
                        styles.blurContainer,
                        {
                            backgroundColor: isDark ? 'rgba(26, 26, 24, 0.90)' : (Platform.OS === 'android' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.92)'),
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
                        }
                    ]}
                    tint={isDark ? 'dark' : 'light'}
                >
                    {/* Top Edge Refraction Highlight */}
                    <View
                        style={[
                            styles.topSheen,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(255, 255, 255, 0.65)',
                            }
                        ]}
                    />

                    <View style={styles.dock}>
                        {state.routes.map((route: any, index: number) => {
                            const { options } = descriptors[route.key];
                            const isFocused = state.index === index;

                            if ((options as any).href === null) return null;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!isFocused && !event.defaultPrevented) {
                                    if (Platform.OS !== 'web') {
                                        try {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        } catch (e) {
                                            // ignore
                                        }
                                    }
                                    navigation.navigate(route.name);
                                }
                            };

                            return (
                                <TabButton
                                    key={route.key}
                                    isFocused={isFocused}
                                    onPress={onPress}
                                    icon={getIcon(route.name, isFocused, 22)}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            );
                        })}
                    </View>
                </BlurView>
            </View>
        </View>
    );
}

function TabButton({ isFocused, onPress, icon, colors, isDark }: any) {
    const scale = useSharedValue(1);
    const pillOpacity = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.06 : 1, {
            damping: 14,
            stiffness: 280,
        });
        pillOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 180 });
    }, [isFocused]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedPillStyle = useAnimatedStyle(() => ({
        opacity: pillOpacity.value,
        transform: [{ scale: withSpring(isFocused ? 1 : 0.85, { damping: 15, stiffness: 300 }) }],
    }));

    return (
        <AnimatedTouchableOpacity
            onPress={onPress}
            style={[styles.tabButton, animatedContainerStyle]}
            activeOpacity={0.75}
        >
            <View style={styles.tabContentWrapper}>
                {/* Active Soft Glow Pill Behind Icon */}
                <Animated.View
                    style={[
                        styles.activePill,
                        {
                            backgroundColor: isDark
                                ? 'rgba(16, 185, 129, 0.16)'
                                : 'rgba(16, 185, 129, 0.12)',
                            borderColor: isDark
                                ? 'rgba(16, 185, 129, 0.25)'
                                : 'rgba(16, 185, 129, 0.20)',
                        },
                        animatedPillStyle,
                    ]}
                />

                <View style={styles.iconContainer}>
                    {icon}
                </View>

                {/* Micro Emerald Dot Indicator */}
                <Animated.View
                    style={[
                        styles.activeIndicator,
                        {
                            backgroundColor: colors.primary,
                            opacity: isFocused ? 1 : 0,
                            transform: [{ scale: isFocused ? 1 : 0 }],
                        }
                    ]}
                />
            </View>
        </AnimatedTouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        width: DOCK_WIDTH,
        zIndex: 1000,
    },
    dockShadow: {
        borderRadius: 36,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
            web: {
                boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
            } as any,
        }),
    },
    blurContainer: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 36,
        borderWidth: 1,
        overflow: 'hidden',
    },
    topSheen: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        height: 1,
        borderRadius: 1,
    },
    dock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    tabContentWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 58,
        height: 48,
    },
    activePill: {
        position: 'absolute',
        width: 54,
        height: 42,
        borderRadius: 22,
        borderWidth: 1,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 2,
    },
});
