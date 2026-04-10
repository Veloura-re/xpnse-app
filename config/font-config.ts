// Font configuration for app-wide font customization
export interface FontOption {
    id: string;
    name: string;
    family: string;
    displayText: string;
    style: 'serif' | 'sans-serif' | 'display';
}

export const AVAILABLE_FONTS: FontOption[] = [
    {
        id: 'inter',
        name: 'Inter',
        family: 'Inter_400Regular',
        displayText: 'Clean & Universal',
        style: 'sans-serif',
    },
    {
        id: 'abril',
        name: 'Abril Fatface',
        family: 'AbrilFatface_400Regular',
        displayText: 'Vintage & Dramatic',
        style: 'serif',
    },
    {
        id: 'playfair',
        name: 'Playfair Display',
        family: 'PlayfairDisplay_700Bold',
        displayText: 'Classic & Elegant',
        style: 'serif',
    },
    {
        id: 'bebas',
        name: 'Bebas Neue',
        family: 'BebasNeue_400Regular',
        displayText: 'Modern & Bold',
        style: 'sans-serif',
    },
    {
        id: 'righteous',
        name: 'Righteous',
        family: 'Righteous_400Regular',
        displayText: 'Retro & Rounded',
        style: 'display',
    },
    {
        id: 'monoton',
        name: 'Monoton',
        family: 'Monoton_400Regular',
        displayText: 'Art Deco Style',
        style: 'display',
    },
    {
        id: 'montserrat',
        name: 'Montserrat',
        family: 'Montserrat_400Regular',
        displayText: 'Modern & Geometric',
        style: 'sans-serif',
    },
    {
        id: 'lato',
        name: 'Lato',
        family: 'Lato_400Regular',
        displayText: 'Friendly & Stable',
        style: 'sans-serif',
    },
    {
        id: 'oswald',
        name: 'Oswald',
        family: 'Oswald_400Regular',
        displayText: 'Bold & Condensed',
        style: 'sans-serif',
    },
    {
        id: 'raleway',
        name: 'Raleway',
        family: 'Raleway_400Regular',
        displayText: 'Elegant Sans',
        style: 'sans-serif',
    },
    {
        id: 'merriweather',
        name: 'Merriweather',
        family: 'Merriweather_400Regular',
        displayText: 'Highly Readable',
        style: 'serif',
    },
    {
        id: 'cinzel',
        name: 'Cinzel',
        family: 'Cinzel_400Regular',
        displayText: 'Classical Roman',
        style: 'serif',
    },
    {
        id: 'prata',
        name: 'Prata',
        family: 'Prata_400Regular',
        displayText: 'Elegant Didone',
        style: 'serif',
    },
    {
        id: 'pacifico',
        name: 'Pacifico',
        family: 'Pacifico_400Regular',
        displayText: 'Fun Brush Script',
        style: 'display',
    },
    {
        id: 'dancing',
        name: 'Dancing Script',
        family: 'DancingScript_400Regular',
        displayText: 'Lively Cursive',
        style: 'display',
    },
    {
        id: 'marker',
        name: 'Permanent Marker',
        family: 'PermanentMarker_400Regular',
        displayText: 'Marker Style',
        style: 'display',
    },
];

export const DEFAULT_FONT = 'inter';

export function getFontFamily(fontId?: string): string | undefined {
    if (!fontId || fontId === 'system') {
        const defaultFont = AVAILABLE_FONTS.find(f => f.id === DEFAULT_FONT);
        return defaultFont ? defaultFont.family : 'Inter_400Regular';
    }
    const font = AVAILABLE_FONTS.find(f => f.id === fontId);
    if (font) {
        return font.family;
    }
    // Default to Montserrat if fontId not found
    return 'Inter_400Regular';
}

export function getFontOption(fontId?: string): FontOption {
    return AVAILABLE_FONTS.find(f => f.id === fontId) || AVAILABLE_FONTS[0];
}
