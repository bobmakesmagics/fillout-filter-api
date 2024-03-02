"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotevnv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotevnv.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get('/:formId/filteredResponses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const formId = req.params.formId;
    const { limit = 150, afterDate, beforeDate, offset = 0, status, includeEditLink, sort, } = req.query;
    const filters = req.query.filters
        ? JSON.parse(req.query.filters)
        : null;
    const apiUrl = `https://api.fillout.com/v1/api/forms/${formId}/submissions`;
    let myOffset = Number(offset);
    let hasMore = true;
    let allResponses = [];
    while (hasMore) {
        try {
            const response = yield axios_1.default.get(apiUrl, {
                // Include the API key in the request headers if required
                headers: { Authorization: `Bearer ${process.env.FILLOUT_API_KEY}` },
                params: {
                    limit: Number(limit),
                    afterDate,
                    beforeDate,
                    offset: myOffset,
                    status,
                    includeEditLink,
                    sort,
                },
            });
            allResponses = [...allResponses, ...response.data.responses];
            // Check if there are more pages
            hasMore = response.data.totalResponses > allResponses.length;
            myOffset += Number(limit); // Prepare 'offset' for the next page
        }
        catch (error) {
            console.error('Error fetching submissions:', error);
            hasMore = false; // Stop loop if there is an error
        }
    }
    let filteredResponses = allResponses;
    // Apply filters
    if (filters) {
        filteredResponses = applyFilters(filteredResponses, filters);
    }
    const filtedLimit = parseInt(req.query.limit, 10) || 150;
    const totalResponses = filteredResponses.length;
    const pageCount = Math.ceil(totalResponses / filtedLimit);
    res.json({
        responses: filteredResponses,
        totalResponses: totalResponses,
        pageCount: pageCount,
    });
}));
function applyFilters(responses, filters) {
    return responses.filter((response) => {
        return filters.every((filter) => {
            const question = response.questions.find((q) => q.id === filter.id);
            if (!question)
                return false;
            switch (filter.condition) {
                case 'equals':
                    return question.value === filter.value;
                case 'does_not_equal':
                    return question.value !== filter.value;
                case 'greater_than':
                    // Assuming that strings are ISO date strings
                    if (typeof question.value === 'number' &&
                        typeof filter.value === 'number') {
                        return question.value > filter.value;
                    }
                    else if (typeof question.value === 'string' &&
                        typeof filter.value === 'string') {
                        return new Date(question.value) > new Date(filter.value);
                    }
                    return false;
                case 'less_than':
                    // Assuming that strings are ISO date strings
                    if (typeof question.value === 'number' &&
                        typeof filter.value === 'number') {
                        return question.value < filter.value;
                    }
                    else if (typeof question.value === 'string' &&
                        typeof filter.value === 'string') {
                        return new Date(question.value) < new Date(filter.value);
                    }
                    return false;
                default:
                    return false;
            }
        });
    });
}
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
