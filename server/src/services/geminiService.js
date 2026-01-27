import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { parseGeminiError, createError } from '../utils/error-parser.js';
import { MIME_TYPES, IMAGE_GENERATION, GEMINI_MODEL_ID } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to aggregate Promise.allSettled results
function aggregateResults(results, additionalErrorData = []) {
    const allImages = [];
    const allTexts = [];
    const allResponseParts = [];
    const errors = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            allImages.push(...result.value.images);
            allTexts.push(...result.value.texts);
            allResponseParts.push(...result.value.parts);
        } else {
            errors.push({
                index: index + 1,
                message: result.reason.message || 'Unknown error',
                statusCode: result.reason.statusCode || 500,
                ...(additionalErrorData[index] || {}),
            });
        }
    });

    return {
        images: allImages,
        text: allTexts.join('\n'),
        responseParts: allResponseParts,
        errors: errors.length > 0 ? errors : undefined,
    };
}

function buildGeminiConfig() {
    return {
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
            const storedPart = {};
            let hasContent = false;

            if (part.inlineData) {
                const savedPath = saveBase64Image(part.inlineData.data, part.inlineData.mimeType);
                images.push(savedPath);

                if (storeFilePaths) {
                    storedPart.inlineData = {
                        mimeType: part.inlineData.mimeType,
                        filePath: savedPath,
                    };
                    hasContent = true;
                }
            }

            if (part.text) {
                texts.push(part.text);
                if (storeFilePaths) {
                    storedPart.text = part.text;
                    hasContent = true;
                }
            }

            if (part.thoughtSignature && storeFilePaths) {
                storedPart.thoughtSignature = part.thoughtSignature;
                hasContent = true;
            }

            if (hasContent) {
                parts.push(storedPart);
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

function buildPrompt(artForm, productType, additionalInstructions) {
    let prompt = `
Generate a professional e-commerce product image of a ${productType} featuring authentic ${artForm.name} artwork.

The ${productType} should be decorated with ${artForm.name} art, which is characterized by: ${artForm.stylePrompt}

Requirements:
- Clean, studio-lit product shot against a simple background
- ${productType} positioned at a slight angle to show the artwork clearly
- Soft, even lighting creating subtle shadows for dimension
- ${artForm.name} design as the focal point with traditional motifs and colors applied authentically
- High-end product catalog photo style suitable for an artisan marketplace
`;

    if (additionalInstructions) {
        prompt += `\nSpecific requirements: ${additionalInstructions}`;
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

function buildRequestParts(artForm, productType, referenceImagePath, additionalInstructions) {
    const messageParts = [];
    const historyParts = [];

    addParts(messageParts, historyParts, buildPrompt(artForm, productType, additionalInstructions));

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
    console.log('[Gemini] Starting image generation:', {
        artForm: artForm.name,
        productType,
        numberOfImages,
        hasReferenceImage: !!referenceImagePath,
        hasAdditionalInstructions: !!additionalInstructions,
    });

    const startTime = Date.now();

    // Build request parts once (same for all parallel calls)
    const { messageParts, historyParts } = buildRequestParts(
        artForm,
        productType,
        referenceImagePath,
        additionalInstructions
    );

    console.log('[Gemini] Request parts count:', {
        messageParts: messageParts.length,
        historyParts: historyParts.length,
    });

    // Create array of promises for parallel execution
    const promises = Array.from({ length: numberOfImages }, async (_, i) => {
        console.log(`[Gemini] Starting request ${i + 1}/${numberOfImages}`);

        try {
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL_ID,
                config: buildGeminiConfig(),
                contents: [{ role: 'user', parts: messageParts }],
            });

            console.log(`[Gemini] Received response ${i + 1}/${numberOfImages}`);
            return processResponseParts(response, true);
        } catch (error) {
            console.error(`[Gemini] API error on request ${i + 1}/${numberOfImages}:`, {
                message: error.message,
                status: error.status,
                code: error.code,
            });
            const { message, statusCode } = parseGeminiError(error);
            throw createError(message, statusCode);
        }
    });

    const results = await Promise.allSettled(promises);

    const duration = Date.now() - startTime;
    console.log('[Gemini] All requests complete in', duration, 'ms');

    const aggregated = aggregateResults(results);

    console.log('[Gemini] Generation complete:', {
        totalImagesGenerated: aggregated.images.length,
        requestedImages: numberOfImages,
        failedRequests: aggregated.errors?.length || 0,
    });

    return {
        ...aggregated,
        requestParts: historyParts,
    };
}

function rehydratePart(part) {
    const rehydrated = {};

    if (part.inlineData?.filePath) {
        const inlineData = fileToInlineData(part.inlineData.filePath);
        if (!inlineData) return null;
        Object.assign(rehydrated, inlineData);
    }

    if (part.text) {
        rehydrated.text = part.text;
    }

    if (part.thoughtSignature) {
        rehydrated.thoughtSignature = part.thoughtSignature;
    }

    return Object.keys(rehydrated).length > 0 ? rehydrated : null;
}

// Rehydrate history by converting file paths back to base64
// When filtering by selectedImageIds, only include those specific images
function rehydrateHistory(history, selectedImageIds = []) {
    const selectedSet = new Set(selectedImageIds);
    const hasSelection = selectedSet.size > 0;

    return history
        .map((message) => {
            const parts = message.parts
                .filter((part) => {
                    if (hasSelection && message.role === 'model' && part.inlineData?.filePath) {
                        return selectedSet.has(part.inlineData.filePath);
                    }
                    return true;
                })
                .map(rehydratePart)
                .filter(Boolean);

            return parts.length > 0 ? { role: message.role, parts } : null;
        })
        .filter(Boolean);
}

// Chat SDK handles thought signatures automatically
export async function modifyImages(history, modificationPrompt, selectedImageIds = []) {
    console.log('[Gemini] Starting image modification:', {
        historyLength: history.length,
        modificationPrompt: modificationPrompt.substring(0, 100),
        selectedImagesCount: selectedImageIds.length,
    });

    const startTime = Date.now();

    const imagesToModify =
        selectedImageIds.length > 0
            ? selectedImageIds
            : history
                  .slice()
                  .reverse()
                  .find((entry) => entry.role === 'model')
                  ?.parts.filter((p) => p.inlineData?.filePath)
                  .map((p) => p.inlineData.filePath) || [];

    if (imagesToModify.length === 0) {
        throw createError('No images found to modify', 400);
    }

    console.log('[Gemini] Images to modify:', imagesToModify.length);

    // Create a separate chat for each image
    const promises = imagesToModify.map(async (imageId, i) => {
        console.log(
            `[Gemini] Starting modification ${i + 1}/${imagesToModify.length} for image: ${imageId}`
        );

        const rehydratedHistory = rehydrateHistory(history, [imageId]);

        console.log(`[Gemini] Rehydrated history for image ${i + 1}:`, {
            messages: rehydratedHistory.length,
        });

        const chat = ai.chats.create({
            model: GEMINI_MODEL_ID,
            config: buildGeminiConfig(),
            history: rehydratedHistory,
        });

        try {
            const response = await chat.sendMessage({ message: modificationPrompt });
            console.log(
                `[Gemini] Received modification response ${i + 1}/${imagesToModify.length}`
            );
            return processResponseParts(response, true);
        } catch (error) {
            console.error(
                `[Gemini] Modification API error on request ${i + 1}/${imagesToModify.length}:`,
                {
                    message: error.message,
                    status: error.status,
                    code: error.code,
                }
            );
            const { message, statusCode } = parseGeminiError(error);
            throw createError(message, statusCode);
        }
    });

    const results = await Promise.allSettled(promises);

    const duration = Date.now() - startTime;
    console.log('[Gemini] All modification requests complete in', duration, 'ms');

    const aggregated = aggregateResults(
        results,
        imagesToModify.map((imageId) => ({ imageId }))
    );

    console.log('[Gemini] Modification complete:', {
        imagesGenerated: aggregated.images.length,
        requestedModifications: imagesToModify.length,
        failedRequests: aggregated.errors?.length || 0,
    });

    return aggregated;
}
