import { Octokit } from '@octokit/rest';
import * as Checks from '../namespaces/Checks';
export declare function updateChecks(octokit: Octokit, checksStatic: Checks.ChecksStatic, conclusion: Checks.Conclusion | undefined, annotations: Checks.Annotation[], summary: string): Promise<void>;
export declare function updateChecksTest(octokit: Octokit, checksStatic: Checks.ChecksStatic, annotations: Checks.Annotation[], summary: string): Promise<void>;
export declare function createChecks(octokit: Octokit, owner: string, repo: string, name: string, head_sha: string): Promise<number>;
