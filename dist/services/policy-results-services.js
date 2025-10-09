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
exports.preparePolicyResults = preparePolicyResults;
exports.postScanReport = postScanReport;
const core = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
const fs = __importStar(require("fs/promises"));
const inputs_1 = require("../inputs");
const Checks = __importStar(require("../namespaces/Checks"));
const check_service_1 = require("./check-service");
const app_config_1 = __importDefault(require("../app-config"));
const http = __importStar(require("../api/http-request"));
async function preparePolicyResults(inputs) {
    const baseUrl = process.env.GITHUB_API_URL || 'https://api.github.com';
    const octokit = new rest_1.Octokit({
        auth: inputs.token,
        baseUrl: baseUrl
    });
    const repo = inputs.source_repository.split('/');
    const ownership = {
        owner: repo[0],
        repo: repo[1],
    };
    const checkStatic = {
        owner: ownership.owner,
        repo: ownership.repo,
        check_run_id: inputs.check_run_id,
        status: Checks.Status.Completed,
    };
    if (!(0, inputs_1.vaildateScanResultsActionInput)(inputs)) {
        core.setFailed('token, check_run_id and source_repository are required.');
        await (0, check_service_1.updateChecks)(octokit, checkStatic, inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success, [], 'Token, check_run_id and source_repository are required.');
        return;
    }
    let findingsArray = [];
    let resultsUrl = '';
    try {
        const data = await fs.readFile('policy_flaws.json', 'utf-8');
        const parsedData = JSON.parse(data);
        findingsArray = parsedData._embedded.findings;
        resultsUrl = await fs.readFile('results_url.txt', 'utf-8');
        await postScanReport(inputs, findingsArray);
    }
    catch (error) {
        core.debug(`Error reading or parsing filtered_results.json:${error}`);
        core.setFailed('Error reading or parsing pipeline scan results.');
        await (0, check_service_1.updateChecks)(octokit, checkStatic, inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success, [], 'Error reading or parsing pipeline scan results.');
        return;
    }
    core.info(`Policy findings: ${findingsArray.length}`);
    core.info(`Results URL: ${resultsUrl}`);
    if (findingsArray.length === 0) {
        core.info('No findings violates the policy, exiting and update the github check status to success');
        await (0, check_service_1.updateChecks)(octokit, checkStatic, Checks.Conclusion.Success, [], `No policy violated findings, the full report can be found [here](${resultsUrl}).`);
        return;
    }
    else {
        core.info('Findings violate the policy, exiting and update the github check status to failure');
        const repoResponse = await octokit.repos.get(ownership);
        const language = repoResponse.data.language;
        core.info(`Source repository language: ${language}`);
        let javaMaven = false;
        if (language === 'Java') {
            let pomFileExists = false;
            let gradleFileExists = false;
            try {
                await octokit.repos.getContent(Object.assign(Object.assign({}, ownership), { path: 'pom.xml' }));
                pomFileExists = true;
            }
            catch (error) {
                core.debug(`Error reading or parsing source repository:${error}`);
            }
            try {
                await octokit.repos.getContent(Object.assign(Object.assign({}, ownership), { path: 'build.gradle' }));
                gradleFileExists = true;
            }
            catch (error) {
                core.debug(`Error reading or parsing source repository:${error}`);
            }
            if (pomFileExists || gradleFileExists)
                javaMaven = true;
        }
        const annotations = getAnnotations(findingsArray, javaMaven);
        const maxNumberOfAnnotations = 50;
        for (let index = 0; index < annotations.length / maxNumberOfAnnotations; index++) {
            const annotationBatch = annotations.slice(index * maxNumberOfAnnotations, (index + 1) * maxNumberOfAnnotations);
            if (annotationBatch.length > 0) {
                await (0, check_service_1.updateChecks)(octokit, checkStatic, inputs.fail_checks_on_policy ? Checks.Conclusion.Failure : Checks.Conclusion.Success, annotationBatch, `Here's the summary of the check result, the full report can be found [here](${resultsUrl}).`);
            }
        }
        return;
    }
}
function getAnnotations(policyFindings, javaMaven) {
    const annotations = [];
    policyFindings.forEach(function (element) {
        if (javaMaven) {
            element.finding_details.file_path = `src/main/java/${element.finding_details.file_path}`;
            if (element.finding_details.file_path.includes('WEB-INF'))
                element.finding_details.file_path = element.finding_details.file_path.replace(/src\/main\/java\//, 'src/main/webapp/');
        }
        const displayMessage = element.description
            .replace(/<span>/g, '')
            .replace(/<\/span> /g, '\n')
            .replace(/<\/span>/g, '');
        let filePath = element.finding_details.file_path;
        if (filePath.startsWith('/'))
            filePath = filePath.substring(1);
        const message = `Filename: ${filePath}\nLine: ${element.finding_details.file_line_number}\nCWE: ${element.finding_details.cwe.id} (${element.finding_details.cwe.name})\n\n${displayMessage}`;
        annotations.push({
            path: `${filePath}`,
            start_line: element.finding_details.file_line_number,
            end_line: element.finding_details.file_line_number,
            annotation_level: 'warning',
            title: element.finding_details.cwe.name,
            message: message,
        });
    });
    return annotations;
}
async function postScanReport(inputs, policyFindings) {
    try {
        if (inputs.vid.startsWith('vera01ei-')) {
            return;
        }
        const getSelfUserDetailsResource = {
            resourceUri: app_config_1.default.api.veracode.selfUserUri,
            queryAttribute: '',
            queryValue: '',
        };
        const applicationResponse = await http.getResourceByAttribute(inputs.vid, inputs.vkey, getSelfUserDetailsResource);
        const commit_sha = inputs.head_sha;
        const org_id = applicationResponse.organization.org_id;
        let scan_id;
        const source_repository = inputs.source_repository;
        const repository_Url = inputs.gitRepositoryUrl;
        for (let i = 0; i < policyFindings.length; i++) {
            const element = policyFindings[i];
            if (typeof element.build_id !== 'undefined') {
                scan_id = '' + element.build_id;
                break;
            }
        }
        if (typeof scan_id !== 'undefined') {
            const scanReport = JSON.stringify({
                scm: 'GITHUB',
                commitSha: commit_sha,
                organizationId: org_id,
                scanId: scan_id,
                repositoryName: source_repository,
                repositoryUrl: repository_Url,
            });
            await http.postResourceByAttribute(inputs.vid, inputs.vkey, scanReport);
        }
    }
    catch (error) {
        core.debug(`Error posting scan report: ${error}`);
    }
}
