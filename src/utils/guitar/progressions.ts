// Curated chord-progression library, expressed as Roman-numeral degrees — instrument-agnostic.

export interface ProgressionData {
    id: string;
    title: string;
    genre: string;
    degrees: string[];
    description: string;
}

export const PROGRESSION_LIBRARY: ProgressionData[] = [
    // === Pop & Rock ===
    {
        id: 'pop-punk',
        title: "The 4 Chords (Pop Punk)",
        genre: "Pop / Rock",
        degrees: ["I", "V", "vi", "IV"],
        description: "수많은 히트곡을 만들어낸 현대 팝과 펑크 록의 무적의 마법 공식."
    },
    {
        id: 'pop-ballad',
        title: "Sentimental Ballad",
        genre: "Pop / Indie",
        degrees: ["vi", "IV", "I", "V"],
        description: "마이너 코드로 시작하여 서정적이고 감성적인 무드를 자아내는 현대 발라드 진행."
    },
    {
        id: 'doo-wop',
        title: "Doo-Wop (50s Retro)",
        genre: "Retro / Soul",
        degrees: ["I", "vi", "IV", "V"],
        description: "1950~60년대 소울과 팝에서 유행한 따뜻하고 향수 어린 진행."
    },
    {
        id: 'creep',
        title: "Secondary Dominant (Creep)",
        genre: "Alt Rock",
        degrees: ["I", "III", "IV", "iv"],
        description: "메이저 III도와 마이너 iv도를 사용하여 기묘하고 몽환적인 슬픔을 표현하는 진행."
    },

    // === Jazz & R&B ===
    {
        id: 'classic-251',
        title: "Classic 2-5-1",
        genre: "Jazz / Bossa",
        degrees: ["ii", "V", "I"],
        description: "도미넌트 모션의 강한 해결감을 보여주는 재즈 화성학의 척추."
    },
    {
        id: 'jazz-turnaround',
        title: "Jazz Turnaround (3-6-2-5)",
        genre: "Jazz",
        degrees: ["iii", "VI", "ii", "V"],
        description: "메이저 VI도를 세컨더리 도미넌트로 사용하여 다음 마디의 ii도로 강하게 빨려 들어가는 턴어라운드."
    },
    {
        id: 'neo-soul',
        title: "Neo-Soul & R&B",
        genre: "R&B / Soul",
        degrees: ["IV", "V", "iii", "vi"],
        description: "세련되고 그루비한 느낌을 주며, 로파이(Lo-Fi)나 네오 소울에서 끝없이 반복되는 진행."
    },

    // === J-Pop & Anime ===
    {
        id: 'royal-road',
        title: "Royal Road (왕도 진행)",
        genre: "J-Pop",
        degrees: ["IV", "V", "iii", "vi"],
        description: "애절하면서도 희망찬 느낌을 주어 일본 팝과 애니메이션 OST에서 가장 사랑받는 진행."
    },
    {
        id: 'komuro',
        title: "Komuro Progression",
        genre: "J-Pop / EDM",
        degrees: ["vi", "IV", "V", "I"],
        description: "코무로 테츠야가 유행시킨 댄서블하고 드라마틱한 마이너 기반 진행."
    },

    // === Blues & Latin ===
    {
        id: 'andalusian',
        title: "Andalusian Cadence",
        genre: "Flamenco",
        degrees: ["i", "bVII", "bVI", "V"],
        description: "스페인 플라멩코에서 유래한, 계단을 내려가듯 비장하고 긴장감 넘치는 하행 진행."
    }
];
