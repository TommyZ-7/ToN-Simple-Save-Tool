// Terror ability information helper functions

export type { TerrorAbility } from "./terrorInfoData";
import { TERROR_INFO } from "./terrorInfoData";

export { TERROR_INFO };

/**
 * Get terror abilities by name
 * Performs fuzzy matching to handle slight name differences
 */
export function getTerrorAbilities(name: string): Record<string, string>[] | null {
    // Direct match
    if (TERROR_INFO[name]) {
        return TERROR_INFO[name];
    }

    // Try common variations
    const variations = [
        name,
        name.replace(/_/g, " "),
        name.replace(/-/g, " "),
        name.replace(/'/g, "'"),
        name.replace(/&/g, "and"),
    ];

    for (const variant of variations) {
        if (TERROR_INFO[variant]) {
            return TERROR_INFO[variant];
        }
    }

    // Case-insensitive search
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(TERROR_INFO)) {
        if (key.toLowerCase() === lowerName) {
            return TERROR_INFO[key];
        }
    }

    // Partial match (contains)
    for (const key of Object.keys(TERROR_INFO)) {
        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
            return TERROR_INFO[key];
        }
    }

    return null;
}

/**
 * Format abilities for display
 */
export function formatAbilities(abilities: Record<string, string>[]): { label: string; value: string }[] {
    return abilities.map((ability) => {
        const entries = Object.entries(ability);
        if (entries.length > 0) {
            const [label, value] = entries[0];
            return { label, value };
        }
        return { label: "", value: "" };
    }).filter((a) => a.label !== "");
}
