import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import upload from '../middleware/upload.js';
import Session from '../models/Session.js';
import artForms from '../config/artForms.js';
import {
    generateProductImages,
    modifyImages,
    estimateGenerationCost,
    estimateModificationCost,
} from '../services/geminiService.js';
import {
    sendSuccessResponse,
    sendErrorResponse,
    formatImageUrls,
} from '../utils/response-formatter.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import { SESSION_LIMITS, IMAGE_GENERATION } from '../config/constants.js';

const router = express.Router();

// Helper to normalize generation params
function normalizeGenerationParams(body, artForms, referenceImagePath) {
    const { artFormKey, productType, additionalInstructions, numberOfImages } = body;

    validateEnum(artFormKey, artForms, 'art form');
    validateRequired(productType, 'Product type');

    return {
        artForm: artForms[artFormKey],
        productType: productType.trim(),
        referenceImagePath,
        additionalInstructions: additionalInstructions?.trim(),
        numberOfImages: Math.min(
            Math.max(parseInt(numberOfImages) || IMAGE_GENERATION.DEFAULT_COUNT, 1),
            IMAGE_GENERATION.MAX_COUNT
        ),
    };
}

router.post('/', upload.single('referenceImage'), async (req, res) => {
    try {
        const referenceImagePath = req.file ? `uploads/${req.file.filename}` : null;
        const params = normalizeGenerationParams(req.body, artForms, referenceImagePath);
        const result = await generateProductImages(params);

        const sessionId = uuidv4();
        const imagesWithTurn = result.images.map((img) => ({ ...img, turn: 0 }));

        const session = new Session({
            sessionId,
            artForm: req.body.artFormKey,
            productType: params.productType,
            baseUserInput: result.baseUserInput,
            generatedImages: imagesWithTurn,
            currentTurn: 0,
        });

        await session.save();

        sendSuccessResponse(res, {
            sessionId,
            images: result.images.map((img) => img.filePath),
            turn: 0,
            ...(result.errors && { errors: result.errors }),
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
            session.baseUserInput,
            session.generatedImages,
            modificationPrompt.trim(),
            selectedImageIds || []
        );

        const newTurn = session.currentTurn + 1;
        const imagesWithTurn = result.images.map((img) => ({ ...img, turn: newTurn }));

        session.generatedImages.push(...imagesWithTurn);
        session.currentTurn = newTurn;
        await session.save();

        sendSuccessResponse(res, {
            sessionId,
            images: result.images.map((img) => img.filePath),
            turn: newTurn,
            ...(result.errors && { errors: result.errors }),
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
            .select('sessionId artForm productType generatedImages createdAt updatedAt');

        const total = await Session.countDocuments();

        res.json({
            success: true,
            sessions: sessions.map((session) => ({
                sessionId: session.sessionId,
                artForm: session.artForm,
                productType: session.productType,
                images: formatImageUrls(session.generatedImages.map((img) => img.filePath)),
                imageCount: session.generatedImages.length,
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

        // Group images by turn
        const imagesByTurn = {};
        for (const img of session.generatedImages) {
            const turn = img.turn ?? 0;
            if (!imagesByTurn[turn]) {
                imagesByTurn[turn] = [];
            }
            imagesByTurn[turn].push(img.filePath);
        }

        // Convert to array sorted by turn (newest first for display)
        const turns = Object.keys(imagesByTurn)
            .map(Number)
            .sort((a, b) => b - a)
            .map((turn) => ({
                turn,
                images: formatImageUrls(imagesByTurn[turn]),
            }));

        res.json({
            success: true,
            sessionId: session.sessionId,
            artForm: session.artForm,
            productType: session.productType,
            turns,
            imageCount: session.generatedImages.length,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Session fetch error');
    }
});

// Cost estimation - uses same request building logic as actual API calls
router.post('/estimate-cost', (req, res) => {
    try {
        const params = normalizeGenerationParams(
            req.body,
            artForms,
            req.body.hasReferenceImage ? 'dummy' : null
        );
        const costEstimate = estimateGenerationCost(params);

        res.json({ success: true, ...costEstimate });
    } catch (error) {
        sendErrorResponse(res, error, 'Cost estimation error');
    }
});

router.post('/estimate-cost/modify', async (req, res) => {
    try {
        const { sessionId, modificationPrompt, selectedImageIds } = req.body;

        validateRequired(modificationPrompt, 'Modification prompt');

        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        const costEstimate = estimateModificationCost({
            baseUserInput: session.baseUserInput,
            generatedImages: session.generatedImages,
            modificationPrompt: modificationPrompt.trim(),
            selectedImageIds: selectedImageIds || [],
        });

        res.json({ success: true, ...costEstimate });
    } catch (error) {
        sendErrorResponse(res, error, 'Cost estimation error');
    }
});

export default router;
