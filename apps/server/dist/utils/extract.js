"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromFile = extractTextFromFile;
const fs_1 = __importDefault(require("fs"));
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
async function extractTextFromFile(filePath, mime) {
    const lower = mime.toLowerCase();
    if (lower.includes('word') || filePath.endsWith('.docx')) {
        const buffer = fs_1.default.readFileSync(filePath);
        const { value } = await mammoth_1.default.extractRawText({ buffer });
        return value;
    }
    else if (lower.includes('pdf') || filePath.endsWith('.pdf')) {
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const data = await (0, pdf_parse_1.default)(dataBuffer);
        return data.text;
    }
    else if (lower.includes('text') || filePath.endsWith('.txt')) {
        return fs_1.default.readFileSync(filePath, 'utf8');
    }
    else {
        // Fallback: try reading as UTF-8
        try {
            return fs_1.default.readFileSync(filePath, 'utf8');
        }
        catch {
            return '';
        }
    }
}
