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
exports.getApplicationByName = getApplicationByName;
exports.removeSandbox = removeSandbox;
exports.validateVeracodeApiCreds = validateVeracodeApiCreds;
exports.validatePolicyName = validatePolicyName;
exports.registerBuild = registerBuild;
const core = __importStar(require("@actions/core"));
const app_config_1 = __importDefault(require("../app-config"));
const rest_1 = require("@octokit/rest");
const Checks = __importStar(require("../namespaces/Checks"));
const check_service_1 = require("./check-service");
const http = __importStar(require("../api/http-request"));
const inputs_1 = require("../inputs");
const fs = __importStar(require("fs/promises"));
const artifact_1 = require("@actions/artifact");
async function getApplicationByName(appname, vid, vkey) {
    var _a;
    try {
        const getApplicationByNameResource = {
            resourceUri: app_config_1.default.api.veracode.applicationUri,
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
        throw error;
    }
}
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
            resourceUri: app_config_1.default.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
            resourceId: sandbox.guid,
        };
        await http.deleteResourceById(vid, vkey, removeSandboxResource);
    }
    catch (error) {
        core.debug(`Error removing sandbox:${error}`);
        core.setFailed(`Error removing sandbox ${sandboxName}`);
    }
}
async function getSandboxesByApplicationGuid(appGuid, vid, vkey) {
    var _a;
    try {
        const getSandboxesByApplicationGuidResource = {
            resourceUri: app_config_1.default.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
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
    var _a, _b;
    const annotations = [];
    const repo = inputs.source_repository.split('/');
    const ownership = {
        owner: repo[0],
        repo: repo[1],
    };
    const octokit = new rest_1.Octokit({
        auth: inputs.token,
    });
    const checkStatic = {
        owner: ownership.owner,
        repo: ownership.repo,
        check_run_id: inputs.check_run_id,
        status: Checks.Status.Completed,
    };
    try {
        if (!inputs.vid || !inputs.vkey) {
            core.setFailed('Missing VERACODE_API_ID / VERACODE_API_KEY secret key.');
            annotations.push({
                path: '/',
                start_line: 0,
                end_line: 0,
                annotation_level: 'failure',
                title: 'Missing VERACODE_API_ID / VERACODE_API_KEY secret key.',
                message: 'Please configure the VERACODE_API_ID and VERACODE_API_KEY under the organization secrets.',
            });
            await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, annotations, 'Missing VERACODE_API_ID / VERACODE_API_KEY secret key.');
            return;
        }
        const getSelfUserDetailsResource = {
            resourceUri: app_config_1.default.api.veracode.selfUserUri,
            queryAttribute: '',
            queryValue: '',
        };
        const applicationResponse = await http.getResourceByAttribute(inputs.vid, inputs.vkey, getSelfUserDetailsResource);
        if (applicationResponse && ((_a = applicationResponse === null || applicationResponse === void 0 ? void 0 : applicationResponse.api_credentials) === null || _a === void 0 ? void 0 : _a.expiration_ts)) {
            core.info(`VERACODE_API_ID and VERACODE_API_KEY is valid, Credentials expiration date - ${applicationResponse.api_credentials.expiration_ts}`);
        }
        else {
            core.setFailed('Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY');
            annotations.push({
                path: '/',
                start_line: 0,
                end_line: 0,
                annotation_level: 'failure',
                title: 'Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY.',
                message: 'Please check the VERACODE_API_ID and VERACODE_API_KEY configured under the organization secrets.',
            });
            await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, annotations, 'Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY.');
            return;
        }
        return (_b = applicationResponse === null || applicationResponse === void 0 ? void 0 : applicationResponse.api_credentials) === null || _b === void 0 ? void 0 : _b.expiration_ts;
    }
    catch (error) {
        core.debug(`Error while validating Veracode API credentials: ${error}`);
        await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, [], 'Error while validating Veracode API credentials.');
        throw error;
    }
}
async function validatePolicyName(inputs) {
    var _a, _b;
    const annotations = [];
    const repo = inputs.source_repository.split('/');
    const ownership = {
        owner: repo[0],
        repo: repo[1],
    };
    const octokit = new rest_1.Octokit({
        auth: inputs.token,
    });
    const checkStatic = {
        owner: ownership.owner,
        repo: ownership.repo,
        check_run_id: inputs.check_run_id,
        status: Checks.Status.Completed,
    };
    try {
        if (!inputs.policyname) {
            if (inputs.break_build_invalid_policy == true) {
                core.setFailed('Missing Veracode Policy name in the config.');
            }
            else {
                core.error('Missing Veracode Policy name in the config.');
            }
            annotations.push({
                path: '/',
                start_line: 0,
                end_line: 0,
                annotation_level: 'failure',
                title: 'Missing Veracode Policy name in the config.',
                message: 'Please configure the Veracode policy name under the config file.',
            });
            await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, annotations, 'Missing Veracode Policy name in the config.');
            return;
        }
        const getPolicyResource = {
            resourceUri: app_config_1.default.api.veracode.policyUri,
            queryAttribute: 'name',
            queryValue: encodeURIComponent(inputs.policyname),
            queryAttribute1: 'name_exact',
            queryValue1: true,
        };
        annotations.push({
            path: inputs.path,
            start_line: inputs.start_line,
            end_line: inputs.end_line,
            annotation_level: 'failure',
            title: 'Invalid Veracode Policy name',
            message: 'Please check the policy name provided in the config file.',
        });
        const applicationResponse = await http.getResourceByAttribute(inputs.vid, inputs.vkey, getPolicyResource);
        core.setOutput('total_elements', (_a = applicationResponse === null || applicationResponse === void 0 ? void 0 : applicationResponse.page) === null || _a === void 0 ? void 0 : _a.total_elements);
        if (applicationResponse && ((_b = applicationResponse === null || applicationResponse === void 0 ? void 0 : applicationResponse.page) === null || _b === void 0 ? void 0 : _b.total_elements) != 1) {
            await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, annotations, 'Please check the policy name provided in the config file.');
            if (inputs.break_build_invalid_policy == true) {
                core.setFailed('Invalid Veracode Policy name.');
            }
            else {
                core.error('Invalid Veracode Policy name.');
            }
        }
    }
    catch (error) {
        core.debug(`Error while validating invalid policy name: ${error}`);
        await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Failure, [], 'Error while validating policy name.');
        throw error;
    }
}
async function registerBuild(inputs) {
    var _a;
    const filePath = 'workflow-metadata.json';
    const artifactName = 'workflow-metadata';
    try {
        const repo = inputs.source_repository.split('/');
        const ownership = {
            owner: repo[0],
            repo: repo[1],
        };
        const rootDirectory = process.cwd();
        const artifactClient = new artifact_1.DefaultArtifactClient();
        const metadata = {
            'check_run_type': inputs.event_type,
            'repository_name': ownership.repo,
            'check_run_id': inputs.check_run_id,
            'branch': inputs.branch,
            'sha': inputs.head_sha,
            'issue_trigger_flow': (_a = inputs.issue_trigger_flow) !== null && _a !== void 0 ? _a : false,
        };
        await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
        await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
        core.info(`${artifactName} directory uploaded successfully under the artifact.`);
    }
    catch (error) {
        core.info(`Error while creating the ${artifactName} artifact ${error}`);
    }
}
