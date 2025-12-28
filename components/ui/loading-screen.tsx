import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

export function LoadingScreen({ isDark: isDarkProp }: { isDark?: boolean }) {
    const { colors, isDark: themeIsDark } = useTheme();
    const isDark = isDarkProp ?? themeIsDark;

    const anim1 = useRef(new Animated.Value(0)).current;
    const anim2 = useRef(new Animated.Value(0)).current;
    const anim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const createAnimation = (anim: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                        delay: delay,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            );
        };

        Animated.parallel([
            createAnimation(anim1, 0),
            createAnimation(anim2, 200),
            createAnimation(anim3, 400),
        ]).start();
    }, []);

    const getBubbleStyle = (anim: Animated.Value) => ({
        transform: [{
            translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -15],
            })
        }],
        opacity: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.6, 1, 0.6],
        })
    });

    // Dynamic colors based on theme
    const backgroundColor = colors.background;
    const bubbleColor = colors.primary;

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <View style={styles.bubbleContainer}>
                <Animated.View style={[styles.bubble, { backgroundColor: bubbleColor, shadowColor: bubbleColor }, getBubbleStyle(anim1)]} />
                <Animated.View style={[styles.bubble, { backgroundColor: bubbleColor, shadowColor: bubbleColor }, getBubbleStyle(anim2)]} />
                <Animated.View style={[styles.bubble, { backgroundColor: bubbleColor, shadowColor: bubbleColor }, getBubbleStyle(anim3)]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubbleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 60,
    },
    bubble: {
        width: 16,
        height: 16,
        borderRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
});
