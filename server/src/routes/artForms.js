import express from 'express';
import artForms from '../config/artForms.js';

const router = express.Router();

router.get('/', (req, res) => {
    const artFormList = Object.entries(artForms).map(([key, value]) => ({
        key,
        name: value.name,
        description: value.description,
        previewImage: value.referenceImages[0] ? `/${value.referenceImages[0]}` : null,
    }));

    res.json({
        success: true,
        artForms: artFormList,
    });
});

router.get('/:key', (req, res) => {
    const { key } = req.params;
    const artForm = artForms[key];

    if (!artForm) {
        return res.status(404).json({
            error: 'Art form not found',
            validArtForms: Object.keys(artForms),
        });
    }

    res.json({
        success: true,
        artForm: {
            key,
            name: artForm.name,
            description: artForm.description,
            referenceImages: artForm.referenceImages.map((img) => `/${img}`),
        },
    });
});

export default router;
