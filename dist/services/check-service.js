"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChecks = updateChecks;
exports.createChecks = createChecks;
async function updateChecks(octokit, checksStatic, conclusion, annotations, summary) {
    const data = {
        owner: checksStatic.owner,
        repo: checksStatic.repo,
        check_run_id: checksStatic.check_run_id,
        status: checksStatic.status,
        conclusion: conclusion,
        output: {
            annotations: annotations,
            title: 'Veracode Static Code Analysis',
            summary: summary,
        },
    };
    await octokit.checks.update(data);
}
async function createChecks(octokit, owner, repo, name, head_sha) {
    const response = await octokit.checks.create({ owner: owner, repo: repo, name: name, head_sha: head_sha });
    return response.data.id;
}
