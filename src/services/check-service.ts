import { Octokit } from '@octokit/rest';
import * as Checks from '../namespaces/Checks';

export async function updateChecks(
  octokit: Octokit,
  checksStatic: Checks.ChecksStatic,
  conclusion: Checks.Conclusion,
  annotations: Checks.Annotation[],
  summary: string,
  scan_type: Checks.ScanType,
): Promise<void> {
  const type = scan_type == Checks.ScanType.Policy ? " - Policy Scan" : "";
  const data = {
    owner: checksStatic.owner,
    repo: checksStatic.repo,
    check_run_id: checksStatic.check_run_id,
    status: checksStatic.status,
    conclusion: conclusion,
    output: {
      annotations: annotations as [],
      title: `Veracode Static Code Analysis${type}`,
      summary: summary,
    },
  };
  await octokit.checks.update(data);
}

export async function createChecks(
  octokit: Octokit,
  owner: string,
  repo: string,
  name: string,
  head_sha: string
): Promise<number> {
  const response = await octokit.checks.create({ owner: owner, repo: repo, name: name, head_sha: head_sha});
  return response.data.id;
}