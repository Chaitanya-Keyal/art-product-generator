import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { parseGeminiError, createError } from '../utils/error-parser.js';
import {
    MIME_TYPES,
    GEMINI_CONFIG,
    IMAGE_GENERATION,
    GEMINI_MODEL_ID,
} from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildGeminiConfig() {
    return {
        responseModalities: GEMINI_CONFIG.RESPONSE_MODALITIES,
        imageConfig: {
            aspectRatio: IMAGE_GENERATION.ASPECT_RATIO,
            imageSize: IMAGE_GENERATION.IMAGE_SIZE,
        },
    };
}

function processResponseParts(response, storeFilePaths = false) {
    const images = [];
    const texts = [];
    const parts = [];

    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData) {
                const savedPath = saveBase64Image(part.inlineData.data, part.inlineData.mimeType);
                images.push(savedPath);

                if (storeFilePaths) {
                    const storedPart = {
                        inlineData: {
                            mimeType: part.inlineData.mimeType,
                            filePath: savedPath,
                        },
                    };
                    // Store thoughtSignature with the part it belongs to
                    if (part.thoughtSignature) {
                        storedPart.thoughtSignature = part.thoughtSignature;
                    }
                    parts.push(storedPart);
                }
            }
            if (part.text) {
                texts.push(part.text);
                if (storeFilePaths) {
                    const storedPart = { text: part.text };
                    if (part.thoughtSignature) {
                        storedPart.thoughtSignature = part.thoughtSignature;
                    }
                    parts.push(storedPart);
                }
            }
            // Standalone thoughtSignature (not attached to a part) - still store separately
            if (part.thoughtSignature && !part.inlineData && !part.text && storeFilePaths) {
                parts.push({ thoughtSignature: part.thoughtSignature });
            }
        }
    }

    return { images, texts, parts };
}

function fileToInlineData(filePath) {
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, '../../..', filePath);

    if (!fs.existsSync(absolutePath)) {
        console.warn(`Reference image not found: ${absolutePath}`);
        return null;
    }

    const data = fs.readFileSync(absolutePath).toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'image/jpeg';

    return {
        inlineData: {
            mimeType,
            data,
        },
    };
}

function saveBase64Image(base64Data, mimeType) {
    try {
        const ext = mimeType.includes('png') ? '.png' : '.jpg';
        const filename = `generated_${uuidv4()}${ext}`;
        const filePath = path.join(__dirname, '../../uploads', filename);

        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);

        return `uploads/${filename}`;
    } catch (error) {
        console.error('Error saving image:', error);
        throw new Error('Failed to save generated image');
    }
}

function buildPrompt(artForm, productType, numberOfImages, additionalInstructions) {
    let prompt = `
Create a professional e-commerce product photograph of a ${productType} featuring authentic ${artForm.name} artwork.

The ${productType} should be decorated with ${artForm.name} art, which is characterized by: ${artForm.stylePrompt}

The scene is a clean, studio-lit product shot against a simple background. The ${productType} is positioned at a slight angle to show the artwork clearly. The lighting is soft and even, creating subtle shadows that give the product dimension. The ${artForm.name} design is the focal point, with traditional motifs and colors applied authentically to the ${productType} surface.

The final image should look like a high-end product catalog photo, suitable for an artisan marketplace.
`;
    if (numberOfImages > 1) {
        prompt += `\n\nGenerate ${numberOfImages} distinct product variations, each with a unique design composition.`;
    }
    if (additionalInstructions) {
        prompt += `\n\nSpecific requirements: ${additionalInstructions}`;
    }
    return prompt.trim();
}

function addParts(messageParts, historyParts, text, images = []) {
    if (text) {
        messageParts.push({ text });
        historyParts.push({ text });
    }

    for (const { filePath } of images) {
        const inlineData = fileToInlineData(filePath);
        if (inlineData) {
            messageParts.push(inlineData);
            historyParts.push({
                inlineData: { mimeType: inlineData.inlineData.mimeType, filePath },
            });
        }
    }
}

function buildRequestParts(
    artForm,
    productType,
    numberOfImages,
    referenceImagePath,
    additionalInstructions
) {
    const messageParts = [];
    const historyParts = [];

    addParts(
        messageParts,
        historyParts,
        buildPrompt(artForm, productType, numberOfImages, additionalInstructions)
    );

    if (artForm.referenceImages.length > 0) {
        addParts(
            messageParts,
            historyParts,
            `Here are reference images showing the ${artForm.name} art style:`,
            artForm.referenceImages.map((filePath) => ({ filePath }))
        );
    }

    if (referenceImagePath) {
        addParts(
            messageParts,
            historyParts,
            `Here is a reference image of the ${productType} to use as the base:`,
            [{ filePath: referenceImagePath }]
        );
    }

    return { messageParts, historyParts };
}

export async function generateProductImages({
    artForm,
    productType,
    referenceImagePath,
    additionalInstructions,
    numberOfImages = 1,
}) {
    const { messageParts, historyParts } = buildRequestParts(
        artForm,
        productType,
        numberOfImages,
        referenceImagePath,
        additionalInstructions
    );

    let response;
    try {
        response = await ai.models.generateContent({
            model: GEMINI_MODEL_ID,
            config: buildGeminiConfig(),
            contents: [{ role: 'user', parts: messageParts }],
        });
    } catch (error) {
        console.error('Error generating images:', error);
        const { message, statusCode } = parseGeminiError(error);
        throw createError(message, statusCode);
    }

    const result = processResponseParts(response, true);

    return {
        images: result.images,
        text: result.texts.join('\n'),
        requestParts: historyParts,
        responseParts: result.parts,
    };
}

function rehydratePart(part) {
    if (part.inlineData?.filePath) {
        const rehydrated = fileToInlineData(part.inlineData.filePath);
        // Preserve thoughtSignature if it was stored with the part
        if (rehydrated && part.thoughtSignature) {
            rehydrated.thoughtSignature = part.thoughtSignature;
        }
        return rehydrated;
    }
    if (part.text) {
        const textPart = { text: part.text };
        if (part.thoughtSignature) {
            textPart.thoughtSignature = part.thoughtSignature;
        }
        return textPart;
    }
    if (part.thoughtSignature && !part.inlineData && !part.text) {
        // Standalone thought signature - only keep if not filtering
        return { thoughtSignature: part.thoughtSignature };
    }
    return null;
}

// Rehydrate history by converting file paths back to base64
// When filtering by selectedImageIds, only drop unselected images
function rehydrateHistory(history, selectedImageIds = []) {
    const hasSelection = selectedImageIds.length > 0;
    const selectedSet = new Set(selectedImageIds);

    return history
        .map((message) => {
            if (hasSelection && message.role === 'model') {
                // Filter out unselected images, keep everything else
                const filteredParts = message.parts
                    .filter((part) => {
                        if (part.inlineData?.filePath) {
                            return selectedSet.has(part.inlineData.filePath);
                        }
                        return true; // Keep text, signatures, etc.
                    })
                    .map(rehydratePart)
                    .filter(Boolean);

                return {
                    role: message.role,
                    parts: filteredParts,
                };
            }

            // User messages: keep everything
            return {
                role: message.role,
                parts: message.parts.map(rehydratePart).filter(Boolean),
            };
        })
        .filter((message) => message.parts.length > 0);
}

// Chat SDK handles thought signatures automatically
export async function modifyImages(history, modificationPrompt, selectedImageIds = []) {
    const rehydratedHistory = rehydrateHistory(history, selectedImageIds);

    const chat = ai.chats.create({
        model: GEMINI_MODEL_ID,
        config: buildGeminiConfig(),
        history: rehydratedHistory,
    });

    let response;
    try {
        response = await chat.sendMessage({ message: modificationPrompt });
    } catch (error) {
        console.error('Error modifying images:', error);
        const { message, statusCode } = parseGeminiError(error);
        throw createError(message, statusCode);
    }

    const result = processResponseParts(response, true);

    return {
        images: result.images,
        text: result.texts.join('\n'),
        responseParts: result.parts,
    };
}
