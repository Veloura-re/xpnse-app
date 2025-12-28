import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { X, ChevronRight, Check, BookOpen, Users, TrendingUp, Settings, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/theme-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { getFontFamily } from '@/config/font-config';

interface VirtualGuideModalProps {
    visible: boolean;
    onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GUIDE_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Vaulta',
        description: 'Your complete solution for managing business finances, tracking cash flow, and collaborating with your team.',
        icon: <Sparkles size={48} color="#fff" />,
        colors: ['#10b981', '#059669'] as readonly [string, string, ...string[]],
        darkColors: ['#10b981', '#059669'] as readonly [string, string, ...string[]],
    },
    {
        id: 'business',
        title: 'Create Your Business',
        description: 'Start by creating a business profile. This is your workspace where you can manage books, team members, and settings.',
        icon: <Settings size={48} color="#fff" />,
        colors: ['#059669', '#047857'] as readonly [string, string, ...string[]],
        darkColors: ['#059669', '#047857'] as readonly [string, string, ...string[]],
    },
    {
        id: 'books',
        title: 'Manage Books',
        description: 'Create books for different periods or projects. Customize settings like Payment Mode and Categories for each book.',
        icon: <BookOpen size={48} color="#fff" />,
        colors: ['#059669', '#10b981'] as readonly [string, string, ...string[]],
        darkColors: ['#10b981', '#34d399'] as readonly [string, string, ...string[]],
    },
    {
        id: 'entries',
        title: 'Track Cash Flow',
        description: 'Record "Cash In" and "Cash Out" entries with details like attachments and categories to keep organized.',
        icon: <TrendingUp size={48} color="#fff" />,
        colors: ['#34d399', '#6ee7b7'] as readonly [string, string, ...string[]],
        darkColors: ['#34d399', '#6ee7b7'] as readonly [string, string, ...string[]],
    },
    {
        id: 'team',
        title: 'Collaborate with Team',
        description: 'Invite partners or viewers by email. They get instant access to the business once invited - no acceptance required!',
        icon: <Users size={48} color="#fff" />,
        colors: ['#059669', '#10b981'] as readonly [string, string, ...string[]],
        darkColors: ['#059669', '#10b981'] as readonly [string, string, ...string[]],
    },
];



export function VirtualGuideModal({ visible, onClose }: VirtualGuideModalProps) {
    const insets = useSafeAreaInsets();
    const { theme, deviceFont } = useTheme();
    const isDark = theme === 'dark';
    const [currentStep, setCurrentStep] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    // Animation definition
    const progress = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            progress.value = withTiming(1, { duration: 100 });
        } else {
            progress.value = 0;
            setCurrentStep(0);
        }
    }, [visible]);

    const handleNext = () => {
        if (currentStep < GUIDE_STEPS.length - 1) {
            scrollRef.current?.scrollTo({
                x: (currentStep + 1) * SCREEN_WIDTH,
                animated: true,
            });
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const handleScroll = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const step = Math.round(contentOffsetX / SCREEN_WIDTH);
        if (step !== currentStep) {
            setCurrentStep(step);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <View
                    style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)' }]}
                />

                {/* Dark mode overlay for extra depth */}
                {isDark && <View style={styles.darkOverlay} />}

                <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.paginationDots}>
                            {GUIDE_STEPS.map((_, index) => (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: isDark ? '#fff' : '#0f172a',
                                            opacity: currentStep === index ? 1 : 0.2,
                                            width: currentStep === index ? 24 : 8,
                                        }
                                    ]}
                                />
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={20} color={isDark ? '#fff' : '#0f172a'} />
                        </TouchableOpacity>
                    </View>

                    {/* Content Scroll */}
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        scrollEventThrottle={16}
                    >
                        {GUIDE_STEPS.map((step, index) => (
                            <View key={step.id} style={styles.stepContainer}>
                                <Animated.View
                                    entering={ZoomIn.delay(300).duration(100)}
                                    style={[styles.iconWrapper]}
                                >
                                    <LinearGradient
                                        colors={isDark ? step.darkColors : step.colors}
                                        style={styles.iconGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        {step.icon}
                                    </LinearGradient>
                                    {/* Glow effect */}
                                    <View style={[
                                        styles.glow,
                                        { backgroundColor: isDark ? step.darkColors[0] : step.colors[0] }
                                    ]} />
                                </Animated.View>

                                <Animated.View entering={FadeInDown.delay(400).duration(100)} style={styles.textContainer}>
                                    <Text style={[
                                        styles.title,
                                        {
                                            fontFamily: getFontFamily(deviceFont),
                                            color: isDark ? '#fff' : '#1e293b'
                                        }
                                    ]}>
                                        {step.title}
                                    </Text>
                                    <Text style={[
                                        styles.description,
                                        { color: isDark ? '#cbd5e1' : '#64748b' }
                                    ]}>
                                        {step.description}
                                    </Text>
                                </Animated.View>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Bottom Action */}
                    <Animated.View entering={FadeInUp.delay(600).duration(100)} style={styles.footer}>
                        <TouchableOpacity
                            style={styles.buttonWrapper}
                            onPress={handleNext}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#10b981', '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>
                                    {currentStep === GUIDE_STEPS.length - 1 ? 'Get Started' : 'Next'}
                                </Text>
                                {currentStep < GUIDE_STEPS.length - 1 ? (
                                    <ChevronRight size={20} color="white" />
                                ) : (
                                    <Check size={20} color="white" />
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    paginationDots: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
    },
    stepContainer: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        marginBottom: 48,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        transform: [{ rotate: '-5deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    glow: {
        position: 'absolute',
        width: '90%',
        height: '90%',
        borderRadius: 40,
        opacity: 0.4,
        transform: [{ scale: 1.2 }],
        zIndex: 1,
    },
    textContainer: {
        alignItems: 'center',
        gap: 16,
    },
    title: {
        fontSize: 32,
        textAlign: 'center',
        letterSpacing: -0.5,
        lineHeight: 38,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    footer: {
        paddingHorizontal: 32,
    },
    buttonWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    button: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
