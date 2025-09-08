import { Octokit } from '@octokit/rest';
import * as Checks from '../namespaces/Checks';

export async function updateChecks(
  octokit: Octokit,
  checksStatic: Checks.ChecksStatic,
  conclusion: Checks.Conclusion | undefined,
  annotations: Checks.Annotation[],
  summary: string,
): Promise<void> {
  const data = {
    owner: checksStatic.owner,
    repo: checksStatic.repo,
    check_run_id: checksStatic.check_run_id,
    status: checksStatic.status,
    ...(conclusion !== conclusion !== undefined && { conclusion }),
    output: {
      annotations: annotations as [],
      title: 'Veracode Static Code Analysis',
      summary: summary,
    },
  };

  await octokit.checks.update(data);
}
export async function updateChecksTest(
  octokit: Octokit,
  checksStatic: Checks.ChecksStatic,
 // conclusion: Checks.Conclusion,
  annotations: Checks.Annotation[],
  summary: string,
): Promise<void> {
  const data = {
    owner: checksStatic.owner,
    repo: checksStatic.repo,
    check_run_id: checksStatic.check_run_id,
    status: checksStatic.status,
   // conclusion: conclusion,
    output: {
      annotations: annotations as [],
      title: 'Veracode Static Code Analysis',
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
  head_sha: string,
): Promise<number> {
  const response = await octokit.checks.create({ owner: owner, repo: repo, name: name, head_sha: head_sha });
  return response.data.id;
}
