import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseGeminiError, createError } from '../utils/error-parser.js';
import {
    MIME_TYPES,
    IMAGE_GENERATION,
    GEMINI_MODEL_ID,
    GEMINI_PRICING,
} from '../config/constants.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ============================================================================
// File I/O Utilities
// ============================================================================

function fileToBase64(filePath) {
    // All file paths should be relative (e.g., 'uploads/file.png', 'assets/art_forms/warli/1.jpg')
    const absolutePath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${absolutePath}`);
        return null;
    }

    const data = fs.readFileSync(absolutePath).toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'image/jpeg';

    return { mimeType, data };
}

function saveBase64Image(base64Data, mimeType, imageId) {
    const ext = mimeType.includes('png') ? '.png' : '.jpg';
    const filename = `${imageId}${ext}`;
    const absPath = path.join(process.cwd(), 'uploads', filename);

    fs.writeFileSync(absPath, Buffer.from(base64Data, 'base64'));
    return { id: imageId, filePath: `uploads/${filename}` };
}

function saveThoughtSignature(signature, imageId) {
    if (!signature) return null;
    const filename = `${imageId}_sig.txt`;
    const absPath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(absPath, signature, 'utf8');
    return `uploads/${filename}`;
}

function loadThoughtSignature(filePath) {
    if (!filePath) return null;
    const absPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
        console.warn(`Thought signature file not found: ${absPath}`);
        return null;
    }
    return fs.readFileSync(absPath, 'utf8');
}

// ============================================================================
// Request Building (shared between cost estimation and execution)
// ============================================================================

function buildGeminiConfig() {
    return {
        imageConfig: {
            aspectRatio: IMAGE_GENERATION.ASPECT_RATIO,
            imageSize: IMAGE_GENERATION.IMAGE_SIZE,
        },
        responseModalities: ['Image'],
    };
}

function buildPrompt(artForm, productType, additionalInstructions) {
    let prompt = `Generate a professional e-commerce product image of a ${productType} featuring authentic ${artForm.name} artwork.

The ${productType} should be decorated with ${artForm.name} art, which is characterized by: ${artForm.stylePrompt}

Requirements:
- Clean, studio-lit product shot against a simple background
- ${productType} positioned at a slight angle to show the artwork clearly
- Soft, even lighting creating subtle shadows for dimension
- ${artForm.name} design as the focal point with traditional motifs and colors applied authentically
- High-end product catalog photo style suitable for an artisan marketplace`;

    if (additionalInstructions) {
        prompt += `\nSpecific requirements: ${additionalInstructions}`;
    }

    return prompt;
}

/**
 * Prepare a generation request - builds parts for API and DB storage
 * @param {boolean} estimateOnly - If true, skip file I/O and just calculate metadata
 */
export function prepareGenerationRequest({
    artForm,
    productType,
    referenceImage,
    additionalInstructions,
    numberOfImages,
    estimateOnly = false,
}) {
    let textLength = 0;
    let inputImageCount = 0;

    // Build prompt text
    const prompt = buildPrompt(artForm, productType, additionalInstructions);
    textLength += prompt.length;

    // Count art form reference images
    if (artForm.referenceImages.length > 0) {
        const refText = `Here are reference images showing the ${artForm.name} art style:`;
        textLength += refText.length;
        inputImageCount += artForm.referenceImages.length;
    }

    // Count user reference image
    if (referenceImage) {
        const refText = `Here is a reference image of the ${productType} to use as the base:`;
        textLength += refText.length;
        inputImageCount += 1;
    }

    const metadata = { inputImages: inputImageCount, outputImages: numberOfImages, textLength };

    // For cost estimation, skip file I/O
    if (estimateOnly) {
        return { metadata };
    }

    // Build full request with file data
    const messageParts = [];
    const baseUserInput = [];

    messageParts.push({ text: prompt });
    baseUserInput.push({ text: prompt });

    if (artForm.referenceImages.length > 0) {
        const refText = `Here are reference images showing the ${artForm.name} art style:`;
        messageParts.push({ text: refText });
        baseUserInput.push({ text: refText });

        for (const filePath of artForm.referenceImages) {
            const imageData = fileToBase64(filePath);
            if (imageData) {
                messageParts.push({ inlineData: imageData });
                baseUserInput.push({ inlineData: { mimeType: imageData.mimeType, filePath } });
            }
        }
    }

    if (referenceImage) {
        const refText = `Here is a reference image of the ${productType} to use as the base:`;
        messageParts.push({ text: refText });
        baseUserInput.push({ text: refText });

        const imageData = fileToBase64(referenceImage.filePath);
        if (!imageData) {
            throw createError(`Reference image not found: ${referenceImage.filePath}`, 400);
        }
        messageParts.push({ inlineData: imageData });
        baseUserInput.push({
            inlineData: {
                id: referenceImage.id,
                mimeType: imageData.mimeType,
                filePath: referenceImage.filePath,
            },
        });
    }

    return { messageParts, baseUserInput, metadata };
}

/**
 * Prepare a modification request - builds chat history for API
 * @param {boolean} estimateOnly - If true, skip file I/O and just calculate metadata
 */
export function prepareModificationRequest({
    baseUserInput,
    generatedImages,
    modificationPrompt,
    selectedImageIds,
    estimateOnly = false,
}) {
    // Determine which images to modify
    let imagesToModify;
    if (selectedImageIds && selectedImageIds.length > 0) {
        imagesToModify = generatedImages.filter((img) => selectedImageIds.includes(img.id));
    } else {
        // When nothing selected, modify all images from the latest turn
        const latestTurn = Math.max(...generatedImages.map((img) => img.turn ?? 0));
        imagesToModify = generatedImages.filter((img) => (img.turn ?? 0) === latestTurn);
    }

    const imagesToModifyCount = imagesToModify.length;

    if (imagesToModifyCount === 0) {
        throw createError('No images found to modify', 400);
    }

    // Calculate metadata without file I/O
    // Each image gets its own chat with the full base text + modification prompt
    let baseTextLength = 0;
    let baseImageCount = 0;

    for (const part of baseUserInput) {
        if (part.text) {
            baseTextLength += part.text.length;
        } else if (part.inlineData?.filePath) {
            baseImageCount++;
        }
    }

    // Per-image values (calculateCost will multiply by outputImages)
    const textLength = baseTextLength + modificationPrompt.length;
    const inputImageCount = baseImageCount + 1; // base images + the image being modified

    const metadata = {
        inputImages: inputImageCount,
        outputImages: imagesToModifyCount,
        textLength,
    };

    // For cost estimation, skip file I/O
    if (estimateOnly) {
        return { metadata };
    }

    // Build full request with file data (imagesToModify already computed above)

    const userParts = [];
    for (const part of baseUserInput) {
        if (part.text) {
            userParts.push({ text: part.text });
        } else if (part.inlineData?.filePath) {
            const imageData = fileToBase64(part.inlineData.filePath);
            if (imageData) {
                userParts.push({ inlineData: imageData });
            }
        }
    }

    const chatContexts = imagesToModify.map((image) => {
        const imageData = fileToBase64(image.filePath);
        if (!imageData) {
            throw createError(`Could not load image ${image.filePath}`, 400);
        }

        // Load thought signature from file (image.thoughtSignature is a file path)
        const signature = loadThoughtSignature(image.thoughtSignature);

        return {
            history: [
                { role: 'user', parts: userParts },
                {
                    role: 'model',
                    parts: [
                        {
                            inlineData: imageData,
                            ...(signature && { thoughtSignature: signature }),
                        },
                    ],
                },
            ],
            image,
        };
    });

    return { chatContexts, modificationPrompt, metadata };
}

// ============================================================================
// Cost Estimation (uses prepared requests)
// ============================================================================

function calculateCost({ inputImages, outputImages, textLength }) {
    // Per-request values
    const tokensPerRequest = Math.ceil(textLength / GEMINI_PRICING.CHARS_PER_TOKEN);

    // Total values (same request sent for each output image)
    const totalInputImages = inputImages * outputImages;
    const totalTokens = tokensPerRequest * outputImages;

    // Costs
    const imageInputCost = totalInputImages * GEMINI_PRICING.IMAGE_INPUT;
    const imageOutputCost = outputImages * GEMINI_PRICING.IMAGE_OUTPUT;
    const textInputCost = totalTokens * GEMINI_PRICING.TEXT_INPUT;
    const totalCost = imageInputCost + imageOutputCost + textInputCost;

    return {
        // Per-request breakdown (for display clarity)
        perRequest: {
            inputImages,
            textTokens: tokensPerRequest,
            textChars: textLength,
        },
        // Number of requests
        numberOfRequests: outputImages,
        // Totals
        totals: {
            inputImages: totalInputImages,
            outputImages,
            textTokens: totalTokens,
        },
        // Pricing rates
        rates: {
            imageInput: GEMINI_PRICING.IMAGE_INPUT,
            imageOutput: GEMINI_PRICING.IMAGE_OUTPUT,
            textInputPerToken: GEMINI_PRICING.TEXT_INPUT,
        },
        // Cost breakdown
        costs: {
            imageInput: parseFloat(imageInputCost.toFixed(4)),
            imageOutput: parseFloat(imageOutputCost.toFixed(4)),
            textInput: parseFloat(textInputCost.toFixed(6)),
        },
        totalCost: parseFloat(totalCost.toFixed(4)),
    };
}

export function estimateGenerationCost(params) {
    const { metadata } = prepareGenerationRequest({ ...params, estimateOnly: true });
    return calculateCost(metadata);
}

export function estimateModificationCost(params) {
    const { metadata } = prepareModificationRequest({ ...params, estimateOnly: true });
    return {
        ...calculateCost(metadata),
        imagesBeingModified: metadata.outputImages,
    };
}

// ============================================================================
// API Execution
// ============================================================================

function processResponse(response) {
    const images = [];
    for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            if (part.inlineData && !part.thought) {
                const imageId = uuidv4();
                const { id, filePath } = saveBase64Image(
                    part.inlineData.data,
                    part.inlineData.mimeType,
                    imageId
                );
                images.push({
                    id,
                    filePath,
                    thoughtSignature: saveThoughtSignature(part.thoughtSignature, imageId),
                });
            }
        }
    }
    return images;
}

function aggregateResults(results, errorData = []) {
    const images = [];
    const errors = [];

    results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
            images.push(...result.value);
        } else {
            errors.push({
                index: i + 1,
                message: result.reason.message || 'Unknown error',
                statusCode: result.reason.statusCode || 500,
                ...(errorData[i] || {}),
            });
        }
    });

    return { images, errors: errors.length > 0 ? errors : undefined };
}

export async function generateProductImages(params) {
    const { artForm, productType, numberOfImages } = params;

    console.log('[Gemini] Starting generation:', {
        artForm: artForm.name,
        productType,
        numberOfImages,
    });
    const startTime = Date.now();

    const { messageParts, baseUserInput } = prepareGenerationRequest(params);

    const promises = Array.from({ length: numberOfImages }, async (_, i) => {
        console.log(`[Gemini] Request ${i + 1}/${numberOfImages}`);
        try {
            const response = await ai.models.generateContent({
                model: GEMINI_MODEL_ID,
                config: buildGeminiConfig(),
                contents: [{ role: 'user', parts: messageParts }],
            });
            return processResponse(response);
        } catch (error) {
            console.error(`[Gemini] Error ${i + 1}:`, error.message);
            const { message, statusCode } = parseGeminiError(error);
            throw createError(message, statusCode);
        }
    });

    const results = await Promise.allSettled(promises);
    console.log(`[Gemini] Complete in ${Date.now() - startTime}ms`);

    return { ...aggregateResults(results), baseUserInput };
}

export async function modifyImages(
    baseUserInput,
    generatedImages,
    modificationPrompt,
    selectedImageIds = []
) {
    console.log('[Gemini] Starting modification:', {
        imageCount: generatedImages.length,
        selectedCount: selectedImageIds.length,
    });
    const startTime = Date.now();

    const { chatContexts } = prepareModificationRequest({
        baseUserInput,
        generatedImages,
        modificationPrompt,
        selectedImageIds,
    });

    const promises = chatContexts.map(async ({ history, image }, i) => {
        console.log(`[Gemini] Modify ${i + 1}/${chatContexts.length}: ${image.filePath}`);
        try {
            const chat = ai.chats.create({
                model: GEMINI_MODEL_ID,
                config: buildGeminiConfig(),
                history,
            });
            const response = await chat.sendMessage({ message: modificationPrompt });
            return processResponse(response);
        } catch (error) {
            console.error(`[Gemini] Modify error ${i + 1}:`, error.message);
            const { message, statusCode } = parseGeminiError(error);
            throw createError(message, statusCode);
        }
    });

    const results = await Promise.allSettled(promises);
    console.log(`[Gemini] Modifications complete in ${Date.now() - startTime}ms`);

    return aggregateResults(
        results,
        chatContexts.map(({ image }) => ({ imageId: image.filePath }))
    );
}
