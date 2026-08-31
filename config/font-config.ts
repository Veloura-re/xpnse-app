// Font configuration for Space Grotesk app-wide typography
export interface FontOption {
    id: string;
    name: string;
    family: string;
    displayText: string;
    style: 'serif' | 'sans-serif' | 'display';
}

export const AVAILABLE_FONTS: FontOption[] = [
    {
        id: 'space-grotesk',
        name: 'Space Grotesk',
        family: 'SpaceGrotesk_700Bold',
        displayText: 'Space Grotesk (Default)',
        style: 'sans-serif',
    },
];

export const DEFAULT_FONT = 'space-grotesk';

export function getFontFamily(fontId?: string, weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | string): string | undefined {
    if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
        return 'SpaceGrotesk_700Bold';
    }
    if (weight === 'semibold' || weight === '600') {
        return 'SpaceGrotesk_600SemiBold';
    }
    if (weight === 'medium' || weight === '500') {
        return 'SpaceGrotesk_500Medium';
    }
    if (weight === 'light' || weight === '300') {
        return 'SpaceGrotesk_300Light';
    }
    return 'SpaceGrotesk_400Regular';
}

export function getFontOption(fontId?: string): FontOption {
    return AVAILABLE_FONTS[0];
}
