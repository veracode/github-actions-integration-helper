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
exports.trimSandboxesFromApplicationProfile = trimSandboxesFromApplicationProfile;
exports.syncRepositories = syncRepositories;
const core = __importStar(require("@actions/core"));
const app_config_1 = __importDefault(require("../app-config"));
const rest_1 = require("@octokit/rest");
const Checks = __importStar(require("../namespaces/Checks"));
const check_service_1 = require("./check-service");
const http = __importStar(require("../api/http-request"));
const inputs_1 = require("../inputs");
const fspromises = __importStar(require("fs/promises"));
const fs = __importStar(require("fs"));
const artifact_1 = require("@actions/artifact");
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
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
async function getAppGUIDByAppName(inputs) {
    if (!(0, inputs_1.vaildateApplicationProfileInput)(inputs)) {
        core.setFailed('Application Profile name is required.');
    }
    const appname = inputs.appname;
    const vid = inputs.vid;
    const vkey = inputs.vkey;
    let application;
    try {
        application = await getApplicationByName(appname, vid, vkey);
    }
    catch (error) {
        core.setFailed(`No application found with name ${appname}`);
        throw new Error(`No application found with name ${appname}`);
    }
    const appGuid = application.guid;
    return appGuid;
}
async function removeSandbox(inputs) {
    if (!(0, inputs_1.vaildateRemoveSandboxInput)(inputs)) {
        core.setFailed('sandboxname is required.');
    }
    const appGuid = await getAppGUIDByAppName(inputs);
    const appname = inputs.appname;
    const vid = inputs.vid;
    const vkey = inputs.vkey;
    const sandboxName = inputs.sandboxname;
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
            core.info(`VERACODE_API_ID and VERACODE_API_KEY is valid, Credentials expiration date - ${JSON.stringify(applicationResponse.api_credentials.expiration_ts)}`);
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
        await fspromises.writeFile(filePath, JSON.stringify(metadata, null, 2));
        await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
        core.info(`${artifactName} directory uploaded successfully under the artifact.`);
    }
    catch (error) {
        core.info(`Error while creating the ${artifactName} artifact ${error}`);
    }
}
async function trimSandboxesFromApplicationProfile(inputs) {
    const appGuid = await getAppGUIDByAppName(inputs);
    const appname = inputs.appname;
    const vid = inputs.vid;
    const vkey = inputs.vkey;
    const sandboxName = inputs.sandboxname;
    let sandboxes;
    try {
        sandboxes = await getSandboxesByApplicationGuid(appGuid, vid, vkey);
    }
    catch (error) {
        throw new Error(`Error retrieving sandboxes for application ${appname}`);
    }
    let sortedSandboxes = sandboxes.sort((sandboxA, sandboxB) => {
        let retVal = sandboxA.modified > sandboxB.modified;
        return (retVal ? 1 : -1);
    });
    if (core.isDebug()) {
        core.info('Date match Sandboxes from oldest to newest:');
        core.info('===========================================');
        sortedSandboxes.forEach((sandbox, i) => {
            core.info(`[${i}] - ${sandbox.name} => ${sandbox.modified}`);
        });
        core.info('-------------------------------------------');
    }
    const total_sb_size = sortedSandboxes.length;
    const keep_size = inputs.trim_to_size;
    let sandboxesToDelete = [];
    if (keep_size >= total_sb_size) {
        core.info(`Total sandboxes [${total_sb_size}] are equal or less than the trim_to_size input [${keep_size}]. Nothing to delete`);
        return;
    }
    else {
        const number_to_delete = total_sb_size - keep_size;
        sandboxesToDelete = sortedSandboxes.slice(0, number_to_delete);
    }
    core.info('Starting to delete sandboxes');
    const deletedSandboxNames = [];
    await Promise.all(sandboxesToDelete.map(async (sandbox, i) => {
        core.info(`[${i}] - ${sandbox.name} => ${sandbox.modified}, ${sandbox.guid}`);
        const removeSandboxResource = {
            resourceUri: app_config_1.default.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
            resourceId: sandbox.guid,
        };
        try {
            await http.deleteResourceById(vid, vkey, removeSandboxResource);
            core.info(`Sandbox '${sandbox.name}' with GUID [${sandbox.guid}] deleted`);
            deletedSandboxNames.push(`'${sandbox.name}' (GUID:${sandbox.guid})`);
        }
        catch (error) {
            core.warning(`Error removing sandbox:${error}`);
            core.setFailed(`Error removing sandbox ${sandbox.name}`);
        }
    }));
    core.info(`Deleted Sandboxes names: ${JSON.stringify(deletedSandboxNames)}`);
    core.info('---------------------------------');
}
async function syncRepositories(inputs) {
    const run = (cmd, options = {}) => {
        core.info(`Command: ${cmd}\n`);
        (0, child_process_1.execSync)(cmd, Object.assign({ stdio: 'inherit' }, options));
    };
    const getInstallationIdForOrg = async (orgName, jwtToken) => {
        core.info(`Getting installation ID for org: ${orgName}`);
        try {
            const response = await axios_1.default.get(`https://${app_config_1.default.hostName.github}/app/installations`, {
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    Accept: 'application/vnd.github+json',
                },
            });
            const installation = response.data.find((inst) => inst.account.login.toLowerCase() === orgName.toLowerCase());
            if (!installation) {
                core.setFailed(`Installation not found for org: ${orgName}`);
                throw new Error(`Installation not found for org: ${orgName}`);
            }
            return installation.id;
        }
        catch (error) {
            core.setFailed(`Error getting installation ID for org: ${orgName}`);
            throw new Error(`Error getting installation ID for org: ${orgName}`);
        }
    };
    const getInstallationToken = async (jwtToken, installationId) => {
        core.info(`Getting installation token for installation ID: ${installationId}`);
        try {
            const url = `https://${app_config_1.default.hostName.github}/app/installations/${installationId}/access_tokens`;
            const response = await axios_1.default.post(url, {}, {
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    Accept: 'application/vnd.github+json',
                },
            });
            if (!response.data) {
                core.setFailed(`No data received from GitHub for installation ID: ${installationId}`);
                throw new Error(`No data received from GitHub for installation ID: ${installationId}`);
            }
            return response.data.token;
        }
        catch (error) {
            core.setFailed(`Error getting installation token for installation ID: ${installationId}`);
            throw new Error(`Error getting installation token for installation ID: ${installationId}`);
        }
    };
    const closePreviousSyncPRs = async (token) => {
        core.info('Closing previous synchronization Pull Request\'s if any');
        try {
            const url = `https://${app_config_1.default.hostName.github}/repos/${inputs.owner}/veracode/pulls`;
            const response = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                },
                params: {
                    state: 'open',
                    base: 'main',
                },
            });
            const prsToClose = response.data.filter((pr) => pr.title === app_config_1.default.constants.syncPrTitle || pr.head.ref.startsWith(app_config_1.default.constants.branchPrefix));
            const closedPrNumbers = [];
            for (const pr of prsToClose) {
                try {
                    core.info(`Closing existing PR: #${pr.number} - ${pr.title}`);
                    await axios_1.default.patch(`https://${app_config_1.default.hostName.github}/repos/${inputs.owner}/veracode/pulls/${pr.number}`, { state: 'closed' }, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github+json',
                        },
                    });
                    await axios_1.default.post(`https://${app_config_1.default.hostName.github}/repos/${inputs.owner}/veracode/issues/${pr.number}/comments`, {
                        body: '🤖 This PR was automatically closed because a new synchronization PR has been created.',
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github+json',
                        },
                    });
                    closedPrNumbers.push(pr.number);
                    core.info(`Successfully closed PR #${pr.number}`);
                }
                catch (error) {
                    core.error(`Failed to close PR #${pr.number}: ${error}`);
                }
            }
            return closedPrNumbers;
        }
        catch (error) {
            core.error(`Failed to fetch or process pull requests: ${error}`);
            throw error;
        }
    };
    const createPullRequest = async (token, headBranch, baseBranch, title, body) => {
        core.info('Creating new PR');
        const url = `https://${app_config_1.default.hostName.github}/repos/${inputs.owner}/veracode/pulls`;
        const payload = {
            title,
            body,
            head: headBranch,
            base: baseBranch,
        };
        core.info('PR Payload: ' + JSON.stringify(payload, null, 2));
        try {
            const response = await axios_1.default.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                },
            });
            return response.data.html_url;
        }
        catch (error) {
            if (error.response) {
                core.setFailed(`GitHub API Error: ${JSON.stringify(error.response.data)}`);
            }
            else if (error.request) {
                core.setFailed(`No response from GitHub: ${error.message}`);
            }
            else {
                core.setFailed(`Request setup error: ${error.message}`);
            }
            throw error;
        }
    };
    const deleteLocalFileIfExists = (filePath) => {
        if (fs.existsSync(filePath)) {
            const stat = fs.lstatSync(filePath);
            if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`🗑️ Removed directory ${filePath}`);
            }
            else {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Removed file ${filePath}`);
            }
        }
    };
    core.info(`Starting repository sync for org: ${inputs.owner}`);
    const installationId = await getInstallationIdForOrg(inputs.owner, inputs.jwtToken);
    const targetToken = await getInstallationToken(inputs.jwtToken, installationId);
    const targetRepoUrl = `https://x-access-token:${targetToken}@github.com/${inputs.owner}/veracode.git`;
    if (fs.existsSync(app_config_1.default.constants.tempDir))
        run(`rm -rf ${app_config_1.default.constants.tempDir}`);
    run(`git clone --branch main --single-branch ${app_config_1.default.constants.source_repo_url} ${app_config_1.default.constants.tempDir}`);
    process.chdir(app_config_1.default.constants.tempDir);
    app_config_1.default.constants.preserveFiles.forEach(file => {
        const filePath = path_1.default.join(process.cwd(), file);
        deleteLocalFileIfExists(filePath);
    });
    const tempBranch = `sync-workflow-actions-${new Date().toISOString().slice(0, 10)}`;
    run(`git checkout -b ${tempBranch}`);
    try {
        run('git remote remove target');
        core.info('Removed existing "target" remote');
    }
    catch (_a) {
        core.info('No existing "target" remote to remove');
    }
    run(`git remote add target ${targetRepoUrl}`);
    core.info('🔗 Added "target" remote');
    run(`git push target ${tempBranch} --force`);
    core.info('Waiting for GitHub to register the new branch...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await closePreviousSyncPRs(targetToken);
    const prUrl = await createPullRequest(targetToken, tempBranch, 'main', app_config_1.default.constants.syncPrTitle, 'Automated PR created by sync script. Please review and merge.');
    core.info(`Pull Request created: ${prUrl}`);
    process.chdir('..');
    run(`rm -rf ${app_config_1.default.constants.tempDir}`);
    core.info('🧹 Cleanup complete');
}
