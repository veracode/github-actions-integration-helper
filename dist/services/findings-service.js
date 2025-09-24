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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplicationFindings = getApplicationFindings;
const app_config_1 = __importDefault(require("../app-config"));
const http = __importStar(require("../api/http-request"));
async function getApplicationFindings(appGuid, vid, vkey) {
    const getPolicyFindingsByApplicationResource = {
        resourceUri: `${app_config_1.default.api.veracode.findingsUri}/${appGuid}/findings`,
        queryAttribute: 'size',
        queryValue: '1000',
    };
    const findingsResponse = await http.getResourceByAttribute(vid, vkey, getPolicyFindingsByApplicationResource);
    if (!findingsResponse._embedded) {
        console.log('No Policy scan found, lets look for sandbox scan findings');
        const getSandboxGUID = {
            resourceUri: `${app_config_1.default.api.veracode.applicationUri}/${appGuid}/sandboxes`,
            queryAttribute: '',
            queryValue: '',
        };
        const sandboxesResponse = await http.getResourceByAttribute(vid, vkey, getSandboxGUID);
        if (!sandboxesResponse._embedded) {
            console.log('No Policy scan found and no sandbox scan found.');
            return [];
        }
        else {
            const sandboxGuid = sandboxesResponse._embedded.sandboxes[0].guid;
            const getPolicyFindingsBySandboxResource = {
                resourceUri: `${app_config_1.default.api.veracode.findingsUri}/${appGuid}/findings`,
                queryAttribute: 'context',
                queryValue: sandboxGuid,
            };
            const findingsResponse = await http.getResourceByAttribute(vid, vkey, getPolicyFindingsBySandboxResource);
            if (!findingsResponse._embedded) {
                console.log('No Policy scan found and no sandbox scan found.');
                return [];
            }
            else {
                return findingsResponse._embedded.findings;
            }
        }
    }
    else {
        return findingsResponse._embedded.findings;
    }
}
