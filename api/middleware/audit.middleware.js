"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackActivity = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const trackActivity = (action) => {
    return async (req, res, next) => {
        // We'll track the activity after the response is sent
        const originalJson = res.json;
        res.json = function (data) {
            const user = req.user;
            if (user && res.statusCode >= 200 && res.statusCode < 300) {
                prisma_1.default.auditLog.create({
                    data: {
                        userId: user.id,
                        action,
                        details: JSON.stringify({
                            method: req.method,
                            path: req.path,
                            params: req.params,
                            body: req.body,
                            timestamp: new Date().toISOString()
                        })
                    }
                }).catch((err) => console.error('Failed to log activity:', err));
            }
            return originalJson.call(this, data);
        };
        next();
    };
};
exports.trackActivity = trackActivity;
