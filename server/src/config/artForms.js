import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_BASE = path.join(__dirname, '../../../assets/art_forms');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const artForms = {
    bluepottery: {
        name: 'Blue Pottery',
        description:
            'Traditional Jaipur craft featuring cobalt blue designs on white ceramic, with Persian-influenced floral and geometric patterns.',
        stylePrompt:
            'Blue Pottery style with distinctive cobalt blue, turquoise and white color palette, Persian-inspired floral motifs, geometric patterns on ceramic surface, handcrafted glazed finish',
    },
    cheriyal: {
        name: 'Cheriyal Painting',
        description:
            'Scroll painting tradition from Telangana with bold colors and mythological narratives in a distinctive folk style.',
        stylePrompt:
            'Cheriyal painting style with vibrant red backgrounds, bold primary colors, stylized human figures, narrative mythological scenes, folk art aesthetic with strong black outlines',
    },
    gond: {
        name: 'Gond Painting',
        description:
            'Tribal art from Madhya Pradesh featuring dots and dashes creating intricate patterns of flora and fauna.',
        stylePrompt:
            'Gond tribal art style with intricate dot and dash patterns filling animal and nature forms, vibrant contrasting colors, stylized depictions of tigers, birds, trees with detailed internal patterns',
    },
    handsculpting: {
        name: 'Hand Sculpting',
        description:
            'Traditional hand-carved wooden craft with organic shapes and natural wood grain textures.',
        stylePrompt:
            'Hand sculpted style with organic carved forms, natural wood grain textures, smooth polished surfaces, artisanal handcrafted aesthetic with visible craftsmanship details',
    },
    kalamkari: {
        name: 'Kalamkari',
        description:
            'Pen-drawn textile art from Andhra Pradesh with mythological narratives and natural dyes.',
        stylePrompt:
            'Kalamkari textile art style with fine pen-drawn details, earth-tone natural dyes (red, brown, black, yellow), mythological scenes with intricate borders and paisley motifs',
    },
    kavad: {
        name: 'Kavad Storytelling',
        description:
            'Portable wooden shrine from Rajasthan with painted panels depicting mythological stories.',
        stylePrompt:
            'Kavad storytelling style with bright primary colors, wooden panel paintings, mythological narrative scenes, red and yellow dominant palette, folk art figures with ornate borders',
    },
    madurkathi: {
        name: 'Madurkathi Weaving',
        description:
            'Traditional mat weaving from West Bengal using natural reed with geometric patterns.',
        stylePrompt:
            'Madurkathi woven style with natural reed textures, geometric woven patterns, earthy beige and brown tones, traditional Bengali craft aesthetic with intricate interlacing',
    },
    miniature: {
        name: 'Miniature Painting',
        description:
            'Detailed small-scale paintings with intricate brushwork, rich colors, and royal court themes.',
        stylePrompt:
            'Miniature painting style with extremely fine detailed brushwork, rich jewel-tone colors, gold and silver accents, royal court scenes, ornate borders, Persian and Mughal influences',
    },
    nirmal: {
        name: 'Nirmal Painting',
        description:
            'Paintings from Telangana featuring vibrant colors, gold leaf work, and mythological themes on wood.',
        stylePrompt:
            'Nirmal painting style with rich vibrant colors, gold leaf accents, mythological and nature themes, smooth lacquered finish typical of Telangana wood paintings',
    },
    pattachitra: {
        name: 'Pattachitra Painting',
        description:
            'Cloth-based scroll painting from Odisha with mythological themes and intricate borders.',
        stylePrompt:
            'Pattachitra style with rich jewel-tone colors, intricate floral borders, mythological scenes especially Lord Jagannath, fine detailed brushwork on cloth-like texture',
    },
    tholubommalata: {
        name: 'Tholu Bommalata',
        description:
            'Traditional leather shadow puppet art from Andhra Pradesh with intricate cut-out designs.',
        stylePrompt:
            'Tholu Bommalata shadow puppet style with intricate leather cutwork, translucent colored sections, mythological characters, detailed perforated patterns creating light and shadow effects',
    },
    warli: {
        name: 'Warli Painting',
        description:
            'Traditional tribal art from Maharashtra featuring white geometric patterns on terracotta backgrounds.',
        stylePrompt:
            'Warli tribal art style with white geometric stick figures on terracotta/red-brown background, minimalist triangular human figures, circular sun and moon motifs, depicting rural life scenes',
    },
};

// Dynamically populate reference images from assets directory
for (const key of Object.keys(artForms)) {
    const formDir = path.join(ASSETS_BASE, key);
    artForms[key].referenceImages = [];

    if (fs.existsSync(formDir)) {
        try {
            artForms[key].referenceImages = fs
                .readdirSync(formDir)
                .filter((f) => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
                .map((img) => `assets/art_forms/${key}/${img}`);
        } catch (err) {
            console.warn(`Error reading ${key}:`, err.message);
        }
    }
}

export default artForms;
