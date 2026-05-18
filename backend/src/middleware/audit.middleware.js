"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackActivity = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const trackActivity = (action) => {
    return async (req, res, next) => {
        const startTime = new Date();
        const user = req.user;
        // We use the 'finish' event to log when the request is done
        res.on('finish', async () => {
            if (user) {
                try {
                    await prisma_1.default.auditLog.create({
                        data: {
                            userId: user.id,
                            userRole: user.role,
                            action: action,
                            details: JSON.stringify({
                                method: req.method,
                                path: req.path,
                                status: res.statusCode,
                                params: req.params,
                                query: req.query,
                                // We avoid logging full body for security/size unless needed
                            }),
                            startTime: startTime,
                            endTime: new Date(),
                            status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
                            ipAddress: req.ip || req.socket.remoteAddress,
                        }
                    });
                }
                catch (error) {
                    console.error('Failed to log activity:', error);
                }
            }
        });
        next();
    };
};
exports.trackActivity = trackActivity;
