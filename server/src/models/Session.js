import mongoose from 'mongoose';

const messagePartSchema = new mongoose.Schema(
    {
        text: { type: String },
        inlineData: {
            mimeType: { type: String },
            filePath: { type: String }, // Local path, will be converted to base64 when sending
        },
        thought: { type: Boolean },
        thoughtSignature: { type: String },
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'model'],
            required: true,
        },
        parts: [messagePartSchema],
    },
    { _id: false }
);

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    artForm: {
        type: String,
        required: true,
    },
    productType: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        default: 'gemini-3-pro',
    },
    history: [messageSchema],
    generatedImages: [
        {
            type: String, // File paths to generated images
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // Auto-delete after 24 hours
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

sessionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('Session', sessionSchema);
