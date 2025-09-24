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
Object.defineProperty(exports, "__esModule", { value: true });
exports.preparePipelineResults = preparePipelineResults;
const core = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
const artifact_1 = require("@actions/artifact");
const fs = __importStar(require("fs/promises"));
const Checks = __importStar(require("../namespaces/Checks"));
const inputs_1 = require("../inputs");
const check_service_1 = require("./check-service");
const application_service_1 = require("./application-service");
const findings_service_1 = require("./findings-service");
const LINE_NUMBER_SLOP = 3;
function printResults(numberOfPipelineScanFindings, numberOfMitigatedFlaws, numberOfRemainingFlaws) {
    core.info(`Pipeline findings: ${numberOfPipelineScanFindings}`);
    core.info(`Mitigated findings: ${numberOfMitigatedFlaws}`);
    core.info(`Filtered pipeline findings: ${numberOfRemainingFlaws}`);
}
async function preparePipelineResultsNonWorkflowApp(inputs) {
    const LINE_NUMBER_SLOP = inputs.line_number_slop;
    core.info(`LINE_NUMBER_SLOP: ${LINE_NUMBER_SLOP}`);
    const pipelineScanFlawFilter = inputs.pipeline_scan_flaw_filter;
    core.info(`Pipeline scan flaw filter: ${pipelineScanFlawFilter}`);
    const pipeline_results_file = pipelineScanFlawFilter.includes('policy')
        ? 'filtered_results.json'
        : 'results.json';
    const filtered_pipeline_results_file = 'filtered_results.json';
    let findingsArray = [];
    let veracodePipelineResult;
    let filteredPipelineFinding = [];
    let filteredVeracodePipelineResult;
    try {
        const data = await fs.readFile(pipeline_results_file, 'utf-8');
        veracodePipelineResult = JSON.parse(data);
        findingsArray = veracodePipelineResult.findings;
        if (pipelineScanFlawFilter.includes('policy'))
            filteredPipelineFinding = findingsArray;
        else {
            const filteredData = await fs.readFile(filtered_pipeline_results_file, 'utf-8');
            filteredVeracodePipelineResult = JSON.parse(filteredData);
            filteredPipelineFinding = filteredVeracodePipelineResult.findings;
        }
    }
    catch (error) {
        core.debug(`Error reading or parsing filtered_results.json:${error}`);
        core.setFailed('Error reading or parsing pipeline scan results.');
        return -1;
    }
    core.info('############################################');
    core.info(`filteredPipelineFinding length: ${filteredPipelineFinding.length}`);
    const filePath = 'pipeline_scan_flaw_filter.json';
    const artifactName = 'Veracode Pipeline-Scan Results - Filtered findings';
    const rootDirectory = process.cwd();
    const artifactClient = new artifact_1.DefaultArtifactClient();
    if (findingsArray.length === 0 ||
        pipelineScanFlawFilter === 'all_results' ||
        pipelineScanFlawFilter === 'policy_violations') {
        try {
            await fs.writeFile(filePath, JSON.stringify(veracodePipelineResult, null, 2));
            await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
            core.info(`${artifactName} directory uploaded successfully under the artifact.`);
        }
        catch (error) {
            core.info(`Error while updating the ${artifactName} artifact ${error}`);
        }
        printResults(findingsArray.length, 0, findingsArray.length);
        return filteredPipelineFinding.length === 0 ? 0 : filteredPipelineFinding.length;
    }
    let policyFindings = [];
    try {
        const application = await (0, application_service_1.getApplicationByName)(inputs.appname, inputs.vid, inputs.vkey);
        const applicationGuid = application.guid;
        policyFindings = await (0, findings_service_1.getApplicationFindings)(applicationGuid, inputs.vid, inputs.vkey);
    }
    catch (error) {
        core.info(`No application found with name ${inputs.appname}`);
        policyFindings = [];
    }
    let policyFindingsToExclude = policyFindings;
    core.debug(`policyFindings findings: ${policyFindingsToExclude.length}`);
    policyFindingsToExclude.forEach((finding) => {
        core.debug(`policyFindings finding: ${JSON.stringify(finding, null, 2)}`);
        core.debug(`policyFindings finding: ${finding.finding_details.file_path}`);
        core.debug(`policyFindings finding: ${finding.finding_details.file_line_number}`);
        core.debug(`policyFindings finding: ${finding.finding_details.cwe.id}`);
        core.debug(`policyFindings finding: ${finding.finding_details.cwe.name}`);
        core.debug(`policyFindings finding: ${finding.finding_status.status}`);
        core.debug(`policyFindings finding: ${finding.finding_status.resolution}`);
        core.debug(`policyFindings finding: ${finding.finding_status.resolution_status}`);
        core.debug(`policyFindings finding: ${finding.violates_policy}`);
        core.debug(`policyFindings finding: ${finding.description}`);
        core.debug(`policyFindings finding: ${finding.issue_id}`);
    });
    if (pipelineScanFlawFilter.includes('mitigated')) {
        policyFindingsToExclude = policyFindings.filter((finding) => finding.finding_status.status === 'CLOSED' &&
            (finding.finding_status.resolution === 'POTENTIAL_FALSE_POSITIVE' ||
                finding.finding_status.resolution === 'MITIGATED') &&
            finding.finding_status.resolution_status === 'APPROVED');
    }
    core.debug(`policyFindingsToExclude findings: ${policyFindingsToExclude.length}`);
    policyFindingsToExclude.forEach((finding) => {
        core.debug(`policyFindingsToExclude finding: ${JSON.stringify(finding, null, 2)}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_details.file_path}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_details.file_line_number}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_details.cwe.id}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_details.cwe.name}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_status.status}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_status.resolution}`);
        core.debug(`policyFindingsToExclude finding: ${finding.finding_status.resolution_status}`);
        core.debug(`policyFindingsToExclude finding: ${finding.violates_policy}`);
        core.debug(`policyFindingsToExclude finding: ${finding.description}`);
        core.debug(`policyFindingsToExclude finding: ${finding.issue_id}`);
    });
    const filteredFindingsArray = findingsArray.filter((finding) => {
        return !policyFindingsToExclude.some((mitigatedFinding) => {
            if (mitigatedFinding.finding_details.file_path.charAt(0) === '/') {
                mitigatedFinding.finding_details.file_path = mitigatedFinding.finding_details.file_path.substring(1);
            }
            return (finding.files.source_file.file === mitigatedFinding.finding_details.file_path &&
                +finding.cwe_id === mitigatedFinding.finding_details.cwe.id &&
                Math.abs(finding.files.source_file.line - mitigatedFinding.finding_details.file_line_number) <= LINE_NUMBER_SLOP);
        });
    });
    core.debug(`filteredFindingsArray findings: ${filteredFindingsArray.length}`);
    filteredFindingsArray.forEach((finding) => {
        core.debug(`filteredFindingsArray finding: ${JSON.stringify(finding, null, 2)}`);
    });
    try {
        veracodePipelineResult.findings = filteredFindingsArray;
        await fs.writeFile(filePath, JSON.stringify(veracodePipelineResult, null, 2));
        await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
        core.info(`${artifactName} directory uploaded successfully under the artifact.`);
    }
    catch (error) {
        core.info(`Error while updating the ${artifactName} artifact ${error}`);
    }
    core.info('==============================================================');
    printResults(findingsArray.length, policyFindingsToExclude.length, filteredFindingsArray.length);
    for (const finding of filteredPipelineFinding) {
        core.info(`finding.issue_id: ${finding.issue_id}`);
        core.info(`finding.files.source_file.file: ${finding.files.source_file.file}`);
        core.info(`finding.files.source_file.line: ${finding.files.source_file.line}`);
    }
    for (const finding of filteredFindingsArray) {
        core.info(`finding.issue_id: ${finding.issue_id}`);
        for (const finding2 of filteredPipelineFinding) {
            core.info(`finding.issue_id: ${finding.issue_id}`);
            core.info(`finding2.issue_id: ${finding2.issue_id}`);
            core.info(`finding.files.source_file.file: ${finding.files.source_file.file}`);
            core.info(`finding2.files.source_file.file: ${finding2.files.source_file.file}`);
            core.info(`finding.files.source_file.line: ${finding.files.source_file.line}`);
            core.info(`finding2.files.source_file.line: ${finding2.files.source_file.line}`);
            if (finding.issue_id === finding2.issue_id &&
                finding.files.source_file.file === finding2.files.source_file.file &&
                finding.files.source_file.line === finding2.files.source_file.line) {
                return 1;
            }
        }
    }
    return 0;
}
async function preparePipelineResults(inputs) {
    const workflow_app = inputs.workflow_app;
    if (!workflow_app) {
        const hasPolicyViolatedFindings = await preparePipelineResultsNonWorkflowApp(inputs) !== 0;
        core.info(`Has policy violated findings: ${hasPolicyViolatedFindings}`);
        core.info(`Fail checks on policy: ${inputs.fail_checks_on_policy}`);
        if (hasPolicyViolatedFindings && inputs.fail_checks_on_policy) {
            core.setFailed('Pipeline scan results contain policy violated findings.');
        }
        return;
    }
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
    const octokit = new rest_1.Octokit({
        auth: inputs.token,
    });
    if (!(0, inputs_1.vaildateScanResultsActionInput)(inputs)) {
        core.setFailed('token, check_run_id and source_repository are required.');
        await (0, check_service_1.updateChecks)(octokit, checkStatic, inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success, [], 'Token, check_run_id and source_repository are required.');
        return;
    }
    let findingsArray = [];
    let veracodePipelineResult;
    try {
        const data = await fs.readFile(inputs.filtered_results_file, 'utf-8');
        const parsedData = JSON.parse(data);
        findingsArray = parsedData.findings;
        veracodePipelineResult = JSON.parse(data);
    }
    catch (error) {
        core.debug(`Error reading or parsing filtered_results.json:${error}`);
        core.setFailed('Error reading or parsing pipeline scan results.');
        await (0, check_service_1.updateChecks)(octokit, checkStatic, inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success, [], 'Error reading or parsing pipeline scan results.');
        return;
    }
    core.info(`Pipeline findings: ${findingsArray.length}`);
    const filePath = 'mitigated_' + inputs.filtered_results_file;
    const artifactName = 'Veracode Pipeline-Scan Results - ' + inputs.filtered_results_file + ' - Mitigated findings';
    const rootDirectory = process.cwd();
    const artifactClient = new artifact_1.DefaultArtifactClient();
    if (findingsArray.length === 0) {
        try {
            veracodePipelineResult.findings = [];
            await fs.writeFile(filePath, JSON.stringify(veracodePipelineResult, null, 2));
            await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
            core.info(`${artifactName} directory uploaded successfully under the artifact.`);
        }
        catch (error) {
            core.info(`Error while updating the ${artifactName} artifact ${error}`);
        }
        core.info('No pipeline findings, exiting and update the github check status to success');
        return;
    }
    let policyFindings = [];
    try {
        const application = await (0, application_service_1.getApplicationByName)(inputs.appname, inputs.vid, inputs.vkey);
        const applicationGuid = application.guid;
        policyFindings = await (0, findings_service_1.getApplicationFindings)(applicationGuid, inputs.vid, inputs.vkey);
    }
    catch (error) {
        core.info(`No application found with name ${inputs.appname}`);
        policyFindings = [];
    }
    core.info(`Policy findings: ${JSON.stringify(policyFindings.length)}`);
    const filter_mitigated_flaws = inputs.filter_mitigated_flaws;
    let policyFindingsToExlcude = [];
    if (filter_mitigated_flaws) {
        policyFindingsToExlcude = policyFindings.filter((finding) => {
            return (finding.violates_policy === true &&
                finding.finding_status.status === 'CLOSED' &&
                (finding.finding_status.resolution === 'POTENTIAL_FALSE_POSITIVE' ||
                    finding.finding_status.resolution === 'MITIGATED') &&
                finding.finding_status.resolution_status === 'APPROVED');
        });
    }
    else {
        policyFindingsToExlcude = policyFindings.filter((finding) => {
            return finding.violates_policy === true;
        });
    }
    core.info(`Mitigated policy findings: ${JSON.stringify(policyFindingsToExlcude.length)}`);
    const filteredFindingsArray = findingsArray.filter((finding) => {
        return !policyFindingsToExlcude.some((mitigatedFinding) => {
            if (mitigatedFinding.finding_details.file_path.charAt(0) === '/') {
                mitigatedFinding.finding_details.file_path = mitigatedFinding.finding_details.file_path.substring(1);
            }
            return (finding.files.source_file.file === mitigatedFinding.finding_details.file_path &&
                +finding.cwe_id === mitigatedFinding.finding_details.cwe.id &&
                Math.abs(finding.files.source_file.line - mitigatedFinding.finding_details.file_line_number) <= LINE_NUMBER_SLOP);
        });
    });
    try {
        veracodePipelineResult.findings = filteredFindingsArray;
        await fs.writeFile(filePath, JSON.stringify(veracodePipelineResult, null, 2));
        await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
        core.info(`${artifactName} directory uploaded successfully under the artifact.`);
    }
    catch (error) {
        core.info(`Error while updating the ${artifactName} artifact ${error}`);
    }
    core.info(`Filtered pipeline findings: ${filteredFindingsArray.length}`);
    if (filteredFindingsArray.length === 0) {
        core.info('No pipeline findings after filtering, exiting and update the github check status to success');
        return;
    }
    else {
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
        core.info('Pipeline findings after filtering, continue to update the github check status');
        const annotations = getAnnotations(filteredFindingsArray, javaMaven);
        const maxNumberOfAnnotations = 50;
        if (filteredFindingsArray.length !== policyFindings.length && inputs.fail_checks_on_policy == true) {
            core.setFailed('Vulneribilities detected in the Repository');
        }
        for (let index = 0; index < annotations.length / maxNumberOfAnnotations; index++) {
            const annotationBatch = annotations.slice(index * maxNumberOfAnnotations, (index + 1) * maxNumberOfAnnotations);
            if (annotationBatch.length > 0) {
                checkStatic.status = Checks.Status.InProgress;
                await (0, check_service_1.updateChecks)(octokit, checkStatic, undefined, annotationBatch, 'Here\'s the summary of the scan result.');
            }
        }
    }
}
function getAnnotations(pipelineFindings, javaMaven) {
    const annotations = [];
    pipelineFindings.forEach(function (element) {
        if (javaMaven) {
            element.files.source_file.file = `src/main/java/${element.files.source_file.file}`;
            if (element.files.source_file.file.includes('WEB-INF'))
                element.files.source_file.file = element.files.source_file.file.replace(/src\/main\/java\//, 'src/main/webapp/');
        }
        const displayMessage = element.display_text
            .replace(/<span>/g, '')
            .replace(/<\/span> /g, '\n')
            .replace(/<\/span>/g, '');
        const message = `Filename: ${element.files.source_file.file}\n` +
            `Line: ${element.files.source_file.line}\n` +
            `CWE: ${element.cwe_id} (${element.issue_type})\n\n${displayMessage}`;
        annotations.push({
            path: `${element.files.source_file.file}`,
            start_line: element.files.source_file.line,
            end_line: element.files.source_file.line,
            annotation_level: 'warning',
            title: element.issue_type,
            message: message,
        });
    });
    return annotations;
}
