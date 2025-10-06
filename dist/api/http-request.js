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
exports.getResourceByAttribute = getResourceByAttribute;
exports.deleteResourceById = deleteResourceById;
exports.postResourceByAttribute = postResourceByAttribute;
const core = __importStar(require("@actions/core"));
const veracode_hmac_1 = require("./veracode-hmac");
const app_config_1 = __importDefault(require("../app-config"));
async function getResourceByAttribute(vid, vkey, resource) {
    const resourceUri = resource.resourceUri;
    const queryAttribute = resource.queryAttribute;
    const queryValue = resource.queryValue;
    const queryAttribute1 = resource.queryAttribute1;
    const queryValue1 = resource.queryValue1;
    let host = app_config_1.default.hostName.veracode.us;
    if (vid.startsWith('vera01ei-')) {
        host = app_config_1.default.hostName.veracode.eu;
        vid = vid.split('-')[1] || '';
        vkey = vkey.split('-')[1] || '';
    }
    let urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
    if (queryAttribute1) {
        urlQueryParams = urlQueryParams + `&${queryAttribute1}=${queryValue1}`;
    }
    const queryUrl = resourceUri + urlQueryParams;
    const headers = {
        Authorization: (0, veracode_hmac_1.calculateAuthorizationHeader)({
            id: vid,
            key: vkey,
            host: host,
            url: queryUrl,
            method: 'GET',
        }),
    };
    const appUrl = `https://${host}${resourceUri}${urlQueryParams}`;
    try {
        const response = await fetch(appUrl, { headers });
        const data = await response.json();
        return data;
    }
    catch (error) {
        throw new Error(`Failed to fetch resource: ${error}`);
    }
}
async function deleteResourceById(vid, vkey, resource) {
    const resourceUri = resource.resourceUri;
    const resourceId = resource.resourceId;
    let host = app_config_1.default.hostName.veracode.us;
    if (vid.startsWith('vera01ei-')) {
        host = app_config_1.default.hostName.veracode.eu;
        vid = vid.split('-')[1] || '';
        vkey = vkey.split('-')[1] || '';
    }
    const queryUrl = `${resourceUri}/${resourceId}`;
    const headers = {
        Authorization: (0, veracode_hmac_1.calculateAuthorizationHeader)({
            id: vid,
            key: vkey,
            host: host,
            url: queryUrl,
            method: 'DELETE',
        }),
    };
    const appUrl = `https://${host}${resourceUri}/${resourceId}`;
    try {
        await fetch(appUrl, { method: 'DELETE', headers });
    }
    catch (error) {
        console.log(error);
        throw new Error(`Failed to delete resource: ${error}`);
    }
}
async function postResourceByAttribute(vid, vkey, scanReport) {
    const resourceUri = app_config_1.default.api.veracode.relayServiceUri;
    const host = app_config_1.default.hostName.veracode.us;
    if (vid.startsWith('vera01')) {
        vid = vid.split('-')[1] || '';
        vkey = vkey.split('-')[1] || '';
    }
    const headers = {
        Authorization: (0, veracode_hmac_1.calculateAuthorizationHeader)({
            id: vid,
            key: vkey,
            host: host,
            url: resourceUri,
            method: 'POST',
        }),
        'Content-Type': 'application/json',
    };
    try {
        const appUrl = `https://${host}${resourceUri}`;
        const response = await fetch(appUrl, {
            method: 'POST',
            headers: headers,
            body: scanReport,
        });
        const data = await response.json();
        core.info(`Scan report response: ${JSON.stringify(data)}`);
        return data;
    }
    catch (error) {
        throw new Error(`Failed to post resource: ${error}`);
    }
}
