import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_LIMITS } from '../config/constants.js';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: (req, file, cb) => {
        const id = uuidv4();
        const ext = path.extname(file.originalname);
        // Store ID in file object for later use
        file.id = id;
        cb(null, `${id}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
    },
});

export default upload;
