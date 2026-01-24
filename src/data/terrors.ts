// Terror name mappings from terrorsname.json
// The terror group is determined by round type, NOT by ID range.
// All groups use their own dictionaries with IDs starting from 0.

export interface TerrorInfo {
    name: string;
    color?: string;
}

// Terror Groups (matches ToNIndex.TerrorGroup enum)
export enum TerrorGroup {
    Terrors = 0,      // t - Standard terrors
    Alternates = 1,   // a - Alternate killers  
    EightPages = 2,   // p - 8 Pages mode
    Unbound = 3,      // u - Unbound combinations
    Moons = 4,        // n - Moon killers (Nightmares)
    Specials = 5,     // s - Special killers (RUN mode)
    Events = 6,       // e - Event killers
}

// Standard Terrors (t) - Used for Classic, Fog, Ghost, Punished, Sabotage, Cracked, Bloodbath, Midnight
export const TERRORS: Record<number, TerrorInfo> = {
    0: { name: "Huggy", color: "40, 114, 255" },
    1: { name: "Corrupted Toys", color: "180, 89, 89" },
    2: { name: "Demented Spongebob", color: "192, 166, 8" },
    3: { name: "Specimen 8", color: "144, 121, 57" },
    4: { name: "HER", color: "156, 156, 156" },
    5: { name: "Tails Doll", color: "238, 107, 0" },
    6: { name: "Black Sun", color: "207, 207, 207" },
    7: { name: "Aku Ball", color: "241, 0, 0" },
    8: { name: "Ao Oni", color: "99, 38, 229" },
    9: { name: "Toren's Shadow", color: "43, 43, 43" },
    10: { name: "[CENSORED]", color: "200, 0, 0" },
    11: { name: "WhiteNight", color: "255, 69, 69" },
    12: { name: "An Arbiter", color: "255, 206, 40" },
    13: { name: "Specimen 5", color: "125, 56, 48" },
    14: { name: "Comedy", color: "156, 156, 156" },
    15: { name: "Purple Guy", color: "212, 100, 255" },
    16: { name: "Spongefly Swarm", color: "255, 220, 0" },
    17: { name: "Hush", color: "44, 86, 154" },
    18: { name: "Mope Mope", color: "110, 209, 113" },
    19: { name: "Sawrunner", color: "183, 129, 84" },
    20: { name: "Imposter", color: "209, 5, 3" },
    21: { name: "Something", color: "183, 183, 183" },
    22: { name: "Starved", color: "233, 0, 0" },
    23: { name: "The Painter", color: "247, 255, 121" },
    24: { name: "The Guidance", color: "0, 236, 10" },
    25: { name: "With Many Voices", color: "180, 0, 30" },
    26: { name: "Nextbots", color: "127, 231, 225" },
    27: { name: "Harvest", color: "142, 109, 128" },
    28: { name: "Smileghost", color: "255, 245, 4" },
    29: { name: "Karol_Corpse", color: "230, 174, 238" },
    30: { name: "MX", color: "245, 64, 100" },
    31: { name: "Big Bird", color: "255, 190, 0" },
    32: { name: "Dev Bytes", color: "184, 174, 255" },
    33: { name: "Luigi & Luigi Dolls", color: "11, 217, 0" },
    34: { name: "V2", color: "16, 205, 255" },
    35: { name: "Withered Bonnie", color: "119, 32, 183" },
    36: { name: "The Boys", color: "255, 128, 0" },
    37: { name: "Something Wicked", color: "36, 36, 36" },
    38: { name: "Seek", color: "217, 217, 217" },
    39: { name: "Rush", color: "160, 193, 219" },
    40: { name: "Sonic", color: "36, 48, 219" },
    41: { name: "Bad Batter", color: "125, 125, 125" },
    42: { name: "Signus", color: "221, 64, 209" },
    43: { name: "Mirror", color: "214, 176, 116" },
    44: { name: "Legs", color: "202, 202, 202" },
    45: { name: "Mona & The Mountain", color: "135, 135, 135" },
    46: { name: "Judgement Bird", color: "204, 202, 196" },
    47: { name: "Slender", color: "168, 168, 168" },
    48: { name: "Maul-A-Child", color: "231, 215, 151" },
    49: { name: "Garten Goers", color: "221, 30, 39" },
    50: { name: "Don't Touch Me", color: "255, 181, 0" },
    51: { name: "Specimen 2", color: "0, 125, 77" },
    52: { name: "Specimen 10", color: "255, 220, 172" },
    53: { name: "The Lifebringer", color: "145, 255, 45" },
    54: { name: "Pale Association", color: "198, 254, 255" },
    55: { name: "Toy Enforcer", color: "57, 89, 236" },
    56: { name: "TBH", color: "255, 140, 114" },
    57: { name: "DoomBox", color: "30, 129, 255" },
    58: { name: "Christian Brutal Sniper", color: "185, 36, 43" },
    59: { name: "Nosk", color: "255, 124, 0" },
    60: { name: "Apocrean Harvester", color: "192, 64, 255" },
    61: { name: "Arkus", color: "255, 64, 188" },
    62: { name: "Cartoon Cat", color: "192, 192, 192" },
    63: { name: "Wario Apparition", color: "255, 190, 42" },
    64: { name: "Shinto", color: "147, 104, 24" },
    65: { name: "Hell Bell", color: "157, 99, 173" },
    66: { name: "Security", color: "81, 32, 255" },
    67: { name: "The Swarm", color: "0, 255, 34" },
    68: { name: "Shiteyanyo", color: "0, 255, 252" },
    69: { name: "Bacteria", color: "108, 99, 87" },
    70: { name: "Tiffany", color: "192, 72, 152" },
    71: { name: "HoovyDundy", color: "135, 0, 26" },
    72: { name: "Haket", color: "217, 62, 65" },
    73: { name: "Akumii-kari", color: "58, 27, 28" },
    74: { name: "Lunatic Cultist", color: "245, 232, 75" },
    75: { name: "Sturm", color: "185, 92, 25" },
    76: { name: "Punishing Bird", color: "180, 223, 243" },
    77: { name: "Prisoner", color: "253, 82, 197" },
    78: { name: "Red Bus", color: "238, 55, 68" },
    79: { name: "Waterwraith", color: "161, 186, 212" },
    80: { name: "Astrum Aureus", color: "255, 98, 76" },
    81: { name: "Snarbolax", color: "231, 29, 0" },
    82: { name: "All-Around-Helpers", color: "255, 24, 0" },
    83: { name: "lain", color: "100, 255, 225" },
    84: { name: "Sakuya Izayoi", color: "191, 205, 217" },
    85: { name: "Arrival", color: "255, 32, 0" },
    86: { name: "Miros Birds", color: "255, 208, 0" },
    87: { name: "BFF", color: "255, 126, 234" },
    88: { name: "Scavenger", color: "212, 169, 67" },
    89: { name: "Tinky Winky", color: "160, 67, 212" },
    90: { name: "Tricky", color: "212, 67, 79" },
    91: { name: "Yolm", color: "123, 143, 164" },
    92: { name: "Red Fanatic", color: "245, 0, 30" },
    93: { name: "Dr. Tox", color: "99, 207, 38" },
    94: { name: "Ink Demon", color: "147, 132, 98" },
    95: { name: "Retep", color: "108, 104, 92" },
    96: { name: "Those Olden Days", color: "84, 58, 60" },
    97: { name: "S.O.S", color: "204, 65, 69" },
    98: { name: "Bigger Boot", color: "64, 142, 50" },
    99: { name: "The Pursuer", color: "209, 80, 42" },
    100: { name: "Spamton", color: "224, 204, 73" },
    101: { name: "Immortal Snail", color: "214, 80, 130" },
    102: { name: "Charlotte", color: "200, 61, 78" },
    103: { name: "Herobrine", color: "238, 238, 238" },
    104: { name: "Peepy", color: "120, 120, 120" },
    105: { name: "The Jester", color: "112, 95, 176" },
    106: { name: "Wild Yet Curious Creature", color: "85, 221, 82" },
    107: { name: "Manti", color: "78, 169, 221" },
    108: { name: "Horseless Headless Horsemann", color: "255, 138, 0" },
    109: { name: "Ghost Girl", color: "255, 158, 158" },
    110: { name: "Cubor's Revenge", color: "226, 77, 0" },
    111: { name: "Poly", color: "88, 103, 204" },
    112: { name: "Dog Mimic", color: "168, 147, 96" },
    113: { name: "Warden", color: "48, 207, 171" },
    114: { name: "FOX Squad", color: "107, 253, 255" },
    115: { name: "Express Train To Hell", color: "188, 96, 3" },
    116: { name: "Deleted", color: "48, 48, 48" },
    117: { name: "Killer Fish", color: "48, 101, 207" },
    118: { name: "Terror of Nowhere", color: "236, 110, 228" },
    119: { name: "Beyond", color: "47, 225, 255" },
    120: { name: "The Origin", color: "168, 161, 160" },
    121: { name: "Time Ripper", color: "180, 143, 115" },
    122: { name: "This Killer Does Not Exist", color: "255, 226, 119" },
    123: { name: "Parhelion's Victims", color: "180, 62, 72" },
    124: { name: "Bed Mecha", color: "89, 89, 89" },
    125: { name: "Killer Rabbit", color: "233, 233, 233" },
    126: { name: "Bravera", color: "61, 214, 255" },
    127: { name: "MissingNo", color: "214, 214, 214" },
    128: { name: "Living Shadow", color: "125, 57, 144" },
    129: { name: "The Plague Doctor", color: "147, 95, 95" },
    130: { name: "The Rat", color: "229, 186, 154" },
    131: { name: "Waldo", color: "229, 70, 72" },
    132: { name: "Clockey", color: "47, 44, 226" },
    133: { name: "Malicious Twins", color: "125, 125, 125" },
};

// Alternates (a) - Used for Alternate, Fog_Alternate, Ghost_Alternate round types
// Also used for Midnight round (3rd index is alternate)
export const ALTERNATES: Record<number, TerrorInfo> = {
    0: { name: "Decayed Sponge", color: "64, 84, 70" },
    1: { name: "WHITEFACE", color: "255, 255, 255" },
    2: { name: "Sanic", color: "37, 122, 255" },
    3: { name: "Parhelion", color: "255, 173, 59" },
    4: { name: "Distorted Yan", color: "158, 250, 255" },
    5: { name: "Chomper", color: "163, 77, 192" },
    6: { name: "The Knight Of Toren", color: "107, 229, 255" },
    7: { name: "Tragedy", color: "207, 207, 207" },
    8: { name: "Apathy", color: "94, 64, 50" },
    9: { name: "MR MEGA", color: "161, 0, 255" },
    10: { name: "sm64.z64", color: "77, 77, 77" },
    11: { name: "Convict Squad", color: "0, 255, 148" },
    12: { name: "Paradise Bird", color: "255, 10, 0" },
    13: { name: "Angry Munci", color: "60, 60, 60" },
    14: { name: "Lord's Signal", color: "203, 218, 255" },
    15: { name: "Feddys", color: "137, 97, 43" },
    16: { name: "TBH SPY", color: "255, 92, 85" },
    17: { name: "The Observation", color: "255, 205, 73" },
    18: { name: " ", color: "164, 157, 140" },
    19: { name: "Judas", color: "255, 0, 7" },
    20: { name: "Glaggle Gang", color: "255, 252, 107" },
    21: { name: "Try Not To Touch Me", color: "255, 203, 0" },
    22: { name: "Ambush", color: "15, 243, 164" },
    23: { name: "Teuthida", color: "9, 0, 209" },
    24: { name: "Eggman's Announcement", color: "221, 110, 74" },
    25: { name: "S.T.G.M", color: "140, 140, 140" },
    26: { name: "Army In Black", color: "243, 170, 255" },
    27: { name: "Lone Agent", color: "195, 150, 194" },
    28: { name: "Roblander", color: "214, 214, 214" },
    29: { name: "Fusion Pilot", color: "255, 167, 81" },
    30: { name: "Joy", color: "255, 238, 40" },
    31: { name: "The Red Mist", color: "253, 26, 0" },
    32: { name: "Sakuya the Ripper", color: "152, 4, 0" },
    33: { name: "Walpurgisnacht", color: "160, 137, 190" },
    34: { name: "Dev Maulers", color: "126, 243, 255" },
    35: { name: "Restless Creator", color: "255, 56, 49" },
};

// Moons (n) - Nightmare killers for Moon round types
// Index 0: Mystic Moon, 1: Blood Moon, 2: Twilight, 3: Solstice
export const MOONS: Record<number, TerrorInfo> = {
    0: { name: "PSYCHOSIS", color: "96, 184, 255" },
    1: { name: "VIRUS", color: "202, 0, 0" },
    2: { name: "APOCALYPSE BIRD", color: "255, 222, 61" },
    3: { name: "PANDORA", color: "0, 212, 137" },
};

// Specials (s) - Used for RUN round type
export const SPECIALS: Record<number, TerrorInfo> = {
    0: { name: "The Meatball Man", color: "193, 94, 61" },
};

// Events (e) - Used for event rounds like Cold Night
export const EVENTS: Record<number, TerrorInfo> = {
    0: { name: "Rift Monsters", color: "163, 123, 228" },
    1: { name: "GIGABYTE", color: "245, 19, 19" },
};

// Unbound combinations (u) - Used for Unbound round type (84 total)
export const UNBOUND: Record<number, TerrorInfo> = {
    0: { name: "Guidance & The Booboo's", color: "30, 255, 0" },
    1: { name: "Red VS Blue", color: "128, 109, 168" },
    2: { name: "Third Trumpet", color: "255, 0, 16" },
    3: { name: "Forest Guardians", color: "255, 205, 0" },
    4: { name: "Higher Beings", color: "255, 141, 163" },
    5: { name: "Quadruple Sponge", color: "156, 152, 72" },
    6: { name: "Your Best Friends", color: "229, 46, 161" },
    7: { name: "Hotel Monsters", color: "168, 88, 48" },
    8: { name: "Squibb Squad", color: "93, 255, 180" },
    9: { name: "Garden Rejects", color: "141, 131, 166" },
    10: { name: "Judgement Day", color: "255, 106, 100" },
    11: { name: "Me and My Shadow", color: "255, 255, 255" },
    12: { name: "Meltdown", color: "255, 84, 0" },
    13: { name: "Faceless Mafia", color: "221, 221, 221" },
    14: { name: "Mansion Monsters", color: "255, 142, 71" },
    15: { name: "Copyright Infringement", color: "255, 71, 71" },
    16: { name: "Purple Bros", color: "182, 126, 255" },
    17: { name: "Scavengers", color: "255, 222, 105" },
    18: { name: "Life & Death", color: "255, 222, 105" },
    19: { name: "Labyrinth", color: "136, 123, 176" },
    20: { name: "Spiteful Shadows", color: "70, 70, 70" },
    21: { name: "Triple Munci", color: "51, 51, 51" },
    22: { name: "Daycare", color: "238, 196, 255" },
    23: { name: "Huggy Horde", color: "94, 112, 219" },
    24: { name: "Infection", color: "156, 44, 44" },
    25: { name: "Triple Hush", color: "104, 129, 202" },
    26: { name: "[CENSORED]", color: "255, 0, 16" },
    27: { name: "Byte Horde", color: "255, 131, 210" },
    28: { name: "SawMarathon", color: "185, 132, 92" },
    29: { name: "TAKE THE NAMI CHALLENGE", color: "255, 0, 2" },
    30: { name: "Thunderstorm", color: "141, 255, 253" },
    31: { name: "END OF THE WORLD", color: "255, 205, 0" },
    32: { name: "Fragmented Memories", color: "124, 164, 255" },
    33: { name: "Mona & Mona & Mona & Mona", color: "135, 106, 97" },
    34: { name: "Seekers", color: "135, 106, 97" },
    35: { name: "Nugget Squad", color: "255, 164, 88" },
    36: { name: "Saul's Goodmen", color: "255, 221, 129" },
    37: { name: "Something Old, Something New", color: "166, 148, 255" },
    38: { name: "POV: Bug", color: "28, 96, 45" },
    39: { name: "Punishing Birdemic", color: "219, 207, 205" },
    40: { name: "Double Ao Oni", color: "135, 55, 180" },
    41: { name: "Too Many Voices", color: "118, 23, 27" },
    42: { name: "Memory Crypts", color: "253, 221, 32" },
    43: { name: "Zumbo Sauce", color: "81, 255, 107" },
    44: { name: "Freaks", color: "190, 49, 49" },
    45: { name: "Lunatic Cult", color: "255, 213, 81" },
    46: { name: "Transportation Trio & The Drifter", color: "106, 255, 73" },
    47: { name: "Father Son Bonding", color: "145, 49, 190" },
    48: { name: "WHAT IS MY NAME", color: "115, 115, 115" },
    49: { name: "Glaggleland Cremators", color: "255, 226, 117" },
    50: { name: "Triple Signus", color: "188, 117, 255" },
    51: { name: "Triple Akumii Kari", color: "82, 82, 82" },
    52: { name: "Black & White", color: "82, 82, 82" },
    53: { name: "[LESSER CENSORED]", color: "255, 0, 0" },
    54: { name: "Blue Monsters", color: "0, 119, 255" },
    55: { name: "Drones", color: "255, 0, 10" },
    56: { name: "Scrapyard Takers", color: "173, 0, 7" },
    57: { name: "Luigi Dolls", color: "149, 255, 119" },
    58: { name: "Meteor Shower", color: "168, 76, 0" },
    59: { name: "Triple TBH", color: "142, 142, 142" },
    60: { name: "Lost Souls", color: "197, 197, 197" },
    61: { name: "Ballin", color: "255, 17, 0" },
    62: { name: "Reunion", color: "197, 160, 126" },
    63: { name: "Angels", color: "255, 0, 7" },
    64: { name: "Ordinary Apocalypse Bird", color: "255, 182, 0" },
    65: { name: "Pack of Wild Yet Curious Creatures", color: "197, 0, 4" },
    66: { name: "ToN X SlashCo Collab", color: "0, 255, 97" },
    67: { name: "Pack of Yolm", color: "144, 144, 144" },
    68: { name: "Threepy", color: "144, 144, 144" },
    69: { name: "  ???  ", color: "185, 162, 185" },
    70: { name: "Delete Me", color: "72, 72, 72" },
    71: { name: "Spamton Spam", color: "255, 229, 57" },
    72: { name: "Death From Above", color: "255, 40, 119" },
    73: { name: "It Came From Bus To Nowhere", color: "40, 152, 255" },
    74: { name: "Zombie Apocalypse", color: "53, 185, 74" },
    75: { name: "Eating Contest", color: "106, 106, 106" },
    76: { name: "Triple Clockeys", color: "0, 51, 255" },
    77: { name: "Triple Killer Fish", color: "92, 161, 224" },
    78: { name: "Lethal League", color: "172, 129, 255" },
    79: { name: "Trollage", color: "130, 130, 130" },
    80: { name: "Mopemopemopemopemopemope", color: "76, 255, 91" },
    81: { name: "Triple Trouble", color: "76, 149, 255" },
    82: { name: "Triple Living Shadow", color: "61, 11, 113" },
    83: { name: "Beyond's Masks", color: "76, 255, 255" },
};

// Round type to Japanese name mapping (complete list from ToNRoundType enum)
export const ROUND_TYPE_JP_TO_EN: Record<string, string> = {
    // Normal
    "クラシック": "Classic",
    "Classic": "Classic",
    "霧": "Fog",
    "Fog": "Fog",
    "パニッシュ": "Punished",
    "Punished": "Punished",
    "サボタージュ": "Sabotage",
    "Sabotage": "Sabotage",
    "Among Us": "Sabotage", // April fools
    "アモングアス": "Sabotage", // April fools
    "狂気": "Cracked",
    "Cracked": "Cracked",
    "ブラッドバス": "Bloodbath",
    "Bloodbath": "Bloodbath",
    "ダブル・トラブル": "Double_Trouble",
    "Double Trouble": "Double_Trouble",
    "Double_Trouble": "Double_Trouble",
    "ゴースト": "Ghost",
    "Ghost": "Ghost",

    // Contains alternates  
    "ミッドナイト": "Midnight",
    "Midnight": "Midnight",
    "オルタネイト": "Alternate",
    "Alternate": "Alternate",

    // Moons
    "ミスティックムーン": "Mystic_Moon",
    "Mystic Moon": "Mystic_Moon",
    "Mystic_Moon": "Mystic_Moon",
    "ブラッドムーン": "Blood_Moon",
    "Blood Moon": "Blood_Moon",
    "Blood_Moon": "Blood_Moon",
    "トワイライト": "Twilight",
    "Twilight": "Twilight",
    "ソルスティス": "Solstice",
    "Solstice": "Solstice",

    // Special
    "走れ！": "RUN",
    "RUN": "RUN",
    "8ページ": "Eight_Pages",
    "8 Pages": "Eight_Pages",
    "Eight_Pages": "Eight_Pages",

    // Events
    "コールドナイト": "Cold_Night",
    "Cold Night": "Cold_Night",
    "Cold_Night": "Cold_Night",
    "GIGABYTE": "GIGABYTE",

    // New
    "アンバウンド": "Unbound",
    "Unbound": "Unbound",

    // Custom
    "カスタム": "Custom",
    "Custom": "Custom",
};

/**
 * Determine terror group based on round type
 * Based on TerrorMatrix.cs logic from ToNSaveManager
 */
export function getTerrorGroupFromRoundType(roundType: string): TerrorGroup {
    const eng = ROUND_TYPE_JP_TO_EN[roundType] || roundType;

    // Check for "(Alternate)" suffix
    const isAlternate = eng.includes("Alternate") || roundType.includes("Alternate");

    switch (eng) {
        // These use Alternates group
        case "Alternate":
        case "Fog_Alternate":
        case "Fog Alternate":
        case "Ghost_Alternate":
        case "Ghost Alternate":
            return TerrorGroup.Alternates;

        // Moon killers (Nightmares)
        // Mystic Moon = PSYCHOSIS (index 0)
        // Blood Moon = VIRUS (index 1)  
        // Twilight = APOCALYPSE BIRD (index 2)
        // Solstice = PANDORA (index 3)
        case "Mystic_Moon":
        case "Blood_Moon":
        case "Twilight":
        case "Solstice":
            return TerrorGroup.Moons;

        // RUN mode uses Specials (The Meatball Man)
        case "RUN":
            return TerrorGroup.Specials;

        // 8 Pages mode
        case "Eight_Pages":
            return TerrorGroup.EightPages;

        // Event modes
        case "Cold_Night":
        case "GIGABYTE":
            return TerrorGroup.Events;

        // Unbound combinations
        case "Unbound":
            return TerrorGroup.Unbound;

        // All other round types use standard Terrors
        // Classic, Fog, Punished, Sabotage, Cracked, Bloodbath, Double_Trouble, Ghost, Midnight (first 2 indices)
        default:
            // For Midnight, 3rd index is Alternate but 1st and 2nd are Terrors
            // This is handled per-index in the UI if needed
            return isAlternate ? TerrorGroup.Alternates : TerrorGroup.Terrors;
    }
}

/**
 * Get terror info by ID and group
 */
export function getTerrorInfo(id: number, group: TerrorGroup = TerrorGroup.Terrors): TerrorInfo {
    let table: Record<number, TerrorInfo>;

    switch (group) {
        case TerrorGroup.Alternates:
            table = ALTERNATES;
            break;
        case TerrorGroup.Moons:
            table = MOONS;
            break;
        case TerrorGroup.Specials:
            table = SPECIALS;
            break;
        case TerrorGroup.Events:
            table = EVENTS;
            break;
        case TerrorGroup.Unbound:
            table = UNBOUND;
            break;
        default:
            table = TERRORS;
            break;
    }

    if (table[id]) {
        return table[id];
    }

    // Unknown terror
    return { name: `Unknown (#${id})` };
}

/**
 * Get terror info by ID and round type string
 */
export function getTerrorInfoByRoundType(id: number, roundType: string): TerrorInfo {
    const group = getTerrorGroupFromRoundType(roundType);
    return getTerrorInfo(id, group);
}

/**
 * Get terror name by ID (defaults to Terrors group for backward compatibility)
 */
export function getTerrorName(id: number, group: TerrorGroup = TerrorGroup.Terrors): string {
    return getTerrorInfo(id, group).name;
}

/**
 * Get terror color by ID (returns CSS rgb string)
 */
export function getTerrorColor(id: number, group: TerrorGroup = TerrorGroup.Terrors): string | undefined {
    const info = getTerrorInfo(id, group);
    if (info.color) {
        return `rgb(${info.color})`;
    }
    return undefined;
}
