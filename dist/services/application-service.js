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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVeracodeApiCreds = exports.removeSandbox = exports.getApplicationByName = void 0;
const core = __importStar(require("@actions/core"));
const app_config_1 = __importDefault(require("../app-config"));
const http = __importStar(require("../api/http-request"));
const inputs_1 = require("../inputs");
async function getApplicationByName(appname, vid, vkey) {
    var _a;
    try {
        const getApplicationByNameResource = {
            resourceUri: app_config_1.default.applicationUri,
            queryAttribute: 'name',
            queryValue: encodeURIComponent(appname),
        };
        const applicationResponse = await http.getResourceByAttribute(vid, vkey, getApplicationByNameResource);
        const applications = ((_a = applicationResponse._embedded) === null || _a === void 0 ? void 0 : _a.applications) || [];
        if (applications.length === 0) {
            throw new Error(`No application found with name ${appname}`);
        }
        else if (applications.length > 1) {
            core.info(`Multiple applications found with name ${appname}, selecting the first found`);
        }
        return applications[0];
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
exports.getApplicationByName = getApplicationByName;
async function removeSandbox(inputs) {
    if (!(0, inputs_1.vaildateRemoveSandboxInput)(inputs)) {
        core.setFailed('sandboxname is required.');
    }
    const appname = inputs.appname;
    const vid = inputs.vid;
    const vkey = inputs.vkey;
    const sandboxName = inputs.sandboxname;
    let application;
    try {
        application = await getApplicationByName(appname, vid, vkey);
    }
    catch (error) {
        core.setFailed(`No application found with name ${appname}`);
        throw new Error(`No application found with name ${appname}`);
    }
    const appGuid = application.guid;
    let sandboxes;
    try {
        sandboxes = await getSandboxesByApplicationGuid(appGuid, vid, vkey);
    }
    catch (error) {
        throw new Error(`Error retrieving sandboxes for application ${appname}`);
    }
    const sandbox = sandboxes.find((s) => s.name === sandboxName);
    if (sandbox === undefined) {
        core.setFailed(`No sandbox found with name ${sandboxName}`);
        return;
    }
    try {
        const removeSandboxResource = {
            resourceUri: app_config_1.default.sandboxUri.replace('${appGuid}', appGuid),
            resourceId: sandbox.guid,
        };
        await http.deleteResourceById(vid, vkey, removeSandboxResource);
    }
    catch (error) {
        core.debug(`Error removing sandbox:${error}`);
        core.setFailed(`Error removing sandbox ${sandboxName}`);
    }
}
exports.removeSandbox = removeSandbox;
async function getSandboxesByApplicationGuid(appGuid, vid, vkey) {
    var _a;
    try {
        const getSandboxesByApplicationGuidResource = {
            resourceUri: app_config_1.default.sandboxUri.replace('${appGuid}', appGuid),
            queryAttribute: '',
            queryValue: '',
        };
        const sandboxResponse = await http.getResourceByAttribute(vid, vkey, getSandboxesByApplicationGuidResource);
        return ((_a = sandboxResponse._embedded) === null || _a === void 0 ? void 0 : _a.sandboxes) || [];
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
async function validateVeracodeApiCreds(inputs) {
    var _a;
    try {
        const getSelfUserDetailsResource = {
            resourceUri: app_config_1.default.selfUserUri,
            queryAttribute: '',
            queryValue: '',
        };
        const applicationResponse = await http.getResourceByAttribute(inputs.vid, inputs.vkey, getSelfUserDetailsResource);
        core.info(`API Response - ${applicationResponse}`);
        if (applicationResponse && ((_a = applicationResponse === null || applicationResponse === void 0 ? void 0 : applicationResponse.api_credentials) === null || _a === void 0 ? void 0 : _a.expiration_ts)) {
            core.info(`Veracode API ID and API key is valid, Credentials expiration date - ${applicationResponse.api_credentials.expiration_ts}`);
        }
        else {
            throw new Error(`Invalid/Expired Veracode API ID and API Key`);
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
exports.validateVeracodeApiCreds = validateVeracodeApiCreds;
