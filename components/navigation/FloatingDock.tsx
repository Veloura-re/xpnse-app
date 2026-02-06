import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/providers/theme-provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
    interpolateColor
} from 'react-native-reanimated';
import { BookOpen, BarChart3, Settings, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DOCK_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function FloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
    const { isDark, colors } = useTheme();
    const insets = useSafeAreaInsets();
    const activeIndex = state.index;

    const getIcon = (routeName: string, color: string, size: number) => {
        switch (routeName) {
            case 'index':
                return <BookOpen size={size} color={color} />;
            case 'team':
                return <Users size={size} color={color} />;
            case 'analytics':
                return <BarChart3 size={size} color={color} />;
            case 'settings':
                return <Settings size={size} color={color} />;
            default:
                return <BookOpen size={size} color={color} />;
        }
    };

    return (
        <View style={[styles.container, { bottom: insets.bottom + 16 }]}>
            <BlurView
                intensity={Platform.OS === 'ios' ? 40 : 80}
                style={[
                    styles.blurContainer,
                    {
                        backgroundColor: isDark ? 'rgba(10, 10, 10, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                        borderColor: isDark ? 'rgba(44, 51, 51, 0.5)' : 'rgba(226, 232, 240, 0.8)',
                    }
                ]}
                tint={isDark ? 'dark' : 'light'}
            >
                <View style={styles.dock}>
                    {state.routes.map((route, index) => {
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
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <TabButton
                                key={route.key}
                                isFocused={isFocused}
                                onPress={onPress}
                                icon={getIcon(route.name, isFocused ? colors.primary : colors.textSecondary, 24)}
                                colors={colors}
                            />
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}

function TabButton({ isFocused, onPress, icon, colors }: any) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.2 : 1, {
            damping: 10,
            stiffness: 100,
        });
        opacity.value = withTiming(isFocused ? 1 : 0.6);
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const activeIndicatorStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isFocused ? 1 : 0),
        transform: [{ scale: withSpring(isFocused ? 1 : 0) }],
    }));

    return (
        <AnimatedTouchableOpacity
            onPress={onPress}
            style={[styles.tabButton, animatedStyle]}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {icon}
                <Animated.View
                    style={[
                        styles.activeIndicator,
                        { backgroundColor: colors.primary },
                        activeIndicatorStyle
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
    blurContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    dock: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -12,
        width: 4,
        height: 4,
        borderRadius: 2,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 5,
    },
});
