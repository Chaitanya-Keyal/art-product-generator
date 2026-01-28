import mongoose from 'mongoose';

// Stores the initial user input (prompt text + any reference image paths)
const userInputPartSchema = new mongoose.Schema(
    {
        text: { type: String },
        inlineData: {
            id: { type: String }, // Optional ID for reference images
            mimeType: { type: String },
            filePath: { type: String },
        },
    },
    { _id: false }
);

// Stores each generated image with its thought signature and turn info
const generatedImageSchema = new mongoose.Schema(
    {
        id: { type: String, required: true }, // Unique ID for this image
        filePath: { type: String, required: true },
        thoughtSignature: { type: String }, // File path to thought signature
        turn: { type: Number, required: true }, // Which generation/modification turn
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
    // The initial user input block (prompt + reference images)
    baseUserInput: [userInputPartSchema],
    // All generated images with their thought signatures
    generatedImages: [generatedImageSchema],
    // Current turn counter (increments with each generation/modification)
    currentTurn: { type: Number, default: 0 },
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

sessionSchema.pre('save', function () {
    this.updatedAt = new Date();
});

export default mongoose.model('Session', sessionSchema);
