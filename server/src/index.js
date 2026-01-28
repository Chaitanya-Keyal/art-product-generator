import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import generationRoutes from './routes/generation.js';
import artFormRoutes from './routes/artForms.js';

dotenv.config({ quiet: true });

if (!process.env.GEMINI_API_KEY) {
    console.error('Missing required environment variable: GEMINI_API_KEY');
    console.error('Please add GEMINI_API_KEY to your .env file');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

app.use('/api/generate', generationRoutes);
app.use('/api/art-forms', artFormRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/art_product_generator')
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
