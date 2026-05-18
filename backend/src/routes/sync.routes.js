"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_controller_1 = require("../controllers/sync.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const audit_middleware_1 = require("../middleware/audit.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticate, (0, audit_middleware_1.trackActivity)('DATABASE_SYNC'), sync_controller_1.syncData);
exports.default = router;
