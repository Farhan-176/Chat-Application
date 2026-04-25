const parseFlag = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined || value === null || value.trim() === '') {
        return fallback
    }

    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export const featureFlags = {
    roomDigest: parseFlag(process.env.FEATURE_ROOM_DIGEST, true),
    roomMonetizationMetadata: parseFlag(process.env.FEATURE_ROOM_MONETIZATION_METADATA, false),
    roomTranslationToggle: parseFlag(process.env.FEATURE_ROOM_TRANSLATION_TOGGLE, true),
}
