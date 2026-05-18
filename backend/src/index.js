"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const prisma_1 = __importDefault(require("./prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/sync', sync_routes_1.default);
app.use('/api/users', user_routes_1.default);
// Compatibility fallback
app.use('/auth', auth_routes_1.default);
app.use('/sync', sync_routes_1.default);
app.use('/users', user_routes_1.default);
// Health check with DB verify
app.get('/health', async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});
app.get('/api/health', async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    }
    catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
exports.default = app;
