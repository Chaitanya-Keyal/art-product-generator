import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middleware/upload.js';
import Session from '../models/Session.js';
import artForms from '../config/artForms.js';
import { generateProductImages, modifyImages } from '../services/geminiService.js';
import {
    sendSuccessResponse,
    sendErrorResponse,
    formatImageUrls,
} from '../utils/response-formatter.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import {
    SESSION_LIMITS,
    GEMINI_MODELS,
    DEFAULT_MODEL,
    IMAGE_GENERATION,
} from '../config/constants.js';

const router = express.Router();

router.post('/', upload.single('referenceImage'), async (req, res) => {
    try {
        const { artFormKey, productType, additionalInstructions, model, numberOfImages } = req.body;

        validateEnum(artFormKey, artForms, 'art form');
        validateRequired(productType, 'Product type');

        const selectedModel = GEMINI_MODELS[model] ? model : DEFAULT_MODEL;
        const imageCount = Math.min(
            Math.max(parseInt(numberOfImages) || IMAGE_GENERATION.DEFAULT_COUNT, 1),
            IMAGE_GENERATION.MAX_COUNT
        );
        const artForm = artForms[artFormKey];
        const referenceImagePath = req.file ? req.file.path : null;

        const result = await generateProductImages({
            artForm,
            productType: productType.trim(),
            referenceImagePath,
            additionalInstructions: additionalInstructions?.trim(),
            numberOfImages: imageCount,
            model: selectedModel,
        });

        const sessionId = uuidv4();
        const session = new Session({
            sessionId,
            artForm: artFormKey,
            productType,
            model: selectedModel,
            history: [
                { role: 'user', parts: result.requestParts },
                { role: 'model', parts: result.responseParts },
            ],
            generatedImages: result.images,
        });

        await session.save();

        sendSuccessResponse(res, {
            sessionId,
            images: result.images,
            text: result.text,
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Generation error');
    }
});

router.post('/modify/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { modificationPrompt, selectedImageIds } = req.body;

        validateRequired(modificationPrompt, 'Modification prompt');

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        const result = await modifyImages(
            session.history,
            modificationPrompt.trim(),
            selectedImageIds || [],
            session.model
        );

        session.history.push({
            role: 'user',
            parts: [{ text: modificationPrompt.trim() }],
        });

        session.history.push({
            role: 'model',
            parts: result.responseParts,
        });

        session.generatedImages.push(...result.images);

        await session.save();

        sendSuccessResponse(res, {
            sessionId,
            images: result.images,
            text: result.text,
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Modification error');
    }
});

router.get('/sessions', async (req, res) => {
    try {
        const limit = Math.min(
            parseInt(req.query.limit) || SESSION_LIMITS.DEFAULT_LIMIT,
            SESSION_LIMITS.MAX_LIMIT
        );
        const skip = parseInt(req.query.skip) || 0;

        const sessions = await Session.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .select('sessionId artForm productType generatedImages history createdAt updatedAt');

        const total = await Session.countDocuments();

        // Extract images grouped by turn from history
        const formatSessionTurns = (session) => {
            const turns = [];
            session.history.forEach((entry, idx) => {
                if (entry.role === 'model') {
                    const images = entry.parts
                        .filter((p) => p.inlineData?.filePath)
                        .map((p) => p.inlineData.filePath);
                    const text = entry.parts
                        .filter((p) => p.text)
                        .map((p) => p.text)
                        .join('\n');
                    if (images.length > 0) {
                        turns.push({
                            turnIndex: idx,
                            images: formatImageUrls(images),
                            text: text || null,
                        });
                    }
                }
            });
            return turns;
        };

        res.json({
            success: true,
            sessions: sessions.map((session) => ({
                sessionId: session.sessionId,
                artForm: session.artForm,
                productType: session.productType,
                images: formatImageUrls(session.generatedImages),
                turns: formatSessionTurns(session),
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
            })),
            total,
            limit,
            skip,
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Sessions fetch error');
    }
});

router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        res.json({
            success: true,
            sessionId: session.sessionId,
            artForm: session.artForm,
            productType: session.productType,
            images: formatImageUrls(session.generatedImages),
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Session fetch error');
    }
});

export default router;
