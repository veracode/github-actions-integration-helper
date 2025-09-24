import * as core from '@actions/core';
import appConfig from '../app-config';
import { Octokit } from '@octokit/rest';
import * as Checks from '../namespaces/Checks';
import { updateChecks } from './check-service';
import * as VeracodeApplication from '../namespaces/VeracodeApplication';
import * as http from '../api/http-request';
import { Inputs, vaildateApplicationProfileInput, vaildateRemoveSandboxInput } from '../inputs';
import * as fspromises from 'fs/promises';
import * as fs from 'fs';
import { DefaultArtifactClient } from '@actions/artifact';
import axios from 'axios';
import { execSync, ExecSyncOptions } from 'child_process';
import path from 'path';

export async function getApplicationByName(
  appname: string,
  vid: string,
  vkey: string,
): Promise<VeracodeApplication.Application> {
  // eslint-disable-next-line no-useless-catch
  try {
    const getApplicationByNameResource = {
      resourceUri: appConfig.api.veracode.applicationUri,
      queryAttribute: 'name',
      queryValue: encodeURIComponent(appname),
    };

    const applicationResponse: VeracodeApplication.ResultsData =
      await http.getResourceByAttribute<VeracodeApplication.ResultsData>(vid, vkey, getApplicationByNameResource);

    const applications = applicationResponse._embedded?.applications || [];
    if (applications.length === 0) {
      throw new Error(`No application found with name ${appname}`);
    } else if (applications.length > 1) {
      core.info(`Multiple applications found with name ${appname}, selecting the first found`);
    }

    return applications[0];
  } catch (error) {
    throw error;
  }
}

async function getAppGUIDByAppName(inputs: Inputs): Promise<any> {
  if (!vaildateApplicationProfileInput(inputs)) {
    core.setFailed('Application Profile name is required.');
  }
  const appname = inputs.appname;
  const vid = inputs.vid;
  const vkey = inputs.vkey;

  let application: VeracodeApplication.Application;

  try {
    application = await getApplicationByName(appname, vid, vkey);
  } catch (error) {
    core.setFailed(`No application found with name ${appname}`);
    throw new Error(`No application found with name ${appname}`);
  }

  const appGuid = application.guid;

  return appGuid;
}

export async function removeSandbox(inputs: Inputs): Promise<void> {
  if (!vaildateRemoveSandboxInput(inputs)) {
    core.setFailed('sandboxname is required.');
  }

  const appGuid = await getAppGUIDByAppName(inputs);

  const appname = inputs.appname;
  const vid = inputs.vid;
  const vkey = inputs.vkey;
  const sandboxName = inputs.sandboxname;

  let sandboxes: VeracodeApplication.Sandbox[];
  try {
    sandboxes = await getSandboxesByApplicationGuid(appGuid, vid, vkey);
  } catch (error) {
    throw new Error(`Error retrieving sandboxes for application ${appname}`);
  }

  const sandbox = sandboxes.find((s) => s.name === sandboxName);

  if (sandbox === undefined) {
    core.setFailed(`No sandbox found with name ${sandboxName}`);
    return;
  }

  try {
    const removeSandboxResource = {
      resourceUri: appConfig.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
      resourceId: sandbox.guid,
    };

    await http.deleteResourceById(vid, vkey, removeSandboxResource);
  } catch (error) {
    core.debug(`Error removing sandbox:${error}`);
    core.setFailed(`Error removing sandbox ${sandboxName}`);
  }
}

async function getSandboxesByApplicationGuid(
  appGuid: string,
  vid: string,
  vkey: string
): Promise<VeracodeApplication.Sandbox[]> {
  try {
    const getSandboxesByApplicationGuidResource = {
      resourceUri: appConfig.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
      queryAttribute: '',
      queryValue: '',
    };

    const sandboxResponse: VeracodeApplication.SandboxResultsData =
      await http.getResourceByAttribute<VeracodeApplication.SandboxResultsData>(vid, vkey, getSandboxesByApplicationGuidResource);

    return sandboxResponse._embedded?.sandboxes || [];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function validateVeracodeApiCreds(inputs: Inputs): Promise<string | void> {
  const annotations: Checks.Annotation[] = [];
  const repo = inputs.source_repository.split('/');
  const ownership = {
    owner: repo[0],
    repo: repo[1],
  };

  const octokit = new Octokit({
    auth: inputs.token,
  });

  const checkStatic: Checks.ChecksStatic = {
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
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        annotations,
        'Missing VERACODE_API_ID / VERACODE_API_KEY secret key.',
      );
      return;
    }
    const getSelfUserDetailsResource = {
      resourceUri: appConfig.api.veracode.selfUserUri,
      queryAttribute: '',
      queryValue: '',
    };

    const applicationResponse: VeracodeApplication.SelfUserResultsData =
      await http.getResourceByAttribute<VeracodeApplication.SelfUserResultsData>(inputs.vid, inputs.vkey, getSelfUserDetailsResource);

    if (applicationResponse && applicationResponse?.api_credentials?.expiration_ts) {
      core.info(`VERACODE_API_ID and VERACODE_API_KEY is valid, Credentials expiration date - ${JSON.stringify(applicationResponse.api_credentials.expiration_ts)}`);
    } else {
      core.setFailed('Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY');
      annotations.push({
        path: '/',
        start_line: 0,
        end_line: 0,
        annotation_level: 'failure',
        title: 'Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY.',
        message: 'Please check the VERACODE_API_ID and VERACODE_API_KEY configured under the organization secrets.',
      });
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        annotations,
        'Invalid/Expired VERACODE_API_ID and VERACODE_API_KEY.',
      );
      return;
    }
    return applicationResponse?.api_credentials?.expiration_ts;
  } catch (error) {
    core.debug(`Error while validating Veracode API credentials: ${error}`);
    await updateChecks(
      octokit,
      checkStatic,
      Checks.Conclusion.Failure,
      [],
      'Error while validating Veracode API credentials.',
    );
    throw error;
  }
}

export async function validatePolicyName(inputs: Inputs): Promise<void> {
  const annotations: Checks.Annotation[] = [];
  const repo = inputs.source_repository.split('/');
  const ownership = {
    owner: repo[0],
    repo: repo[1],
  };

  const octokit = new Octokit({
    auth: inputs.token,
  });

  const checkStatic: Checks.ChecksStatic = {
    owner: ownership.owner,
    repo: ownership.repo,
    check_run_id: inputs.check_run_id,
    status: Checks.Status.Completed,
  };
  try {
    if (!inputs.policyname) {
      if (inputs.break_build_invalid_policy == true) {
        core.setFailed('Missing Veracode Policy name in the config.')
      } else {
        core.error('Missing Veracode Policy name in the config.')
      }
      annotations.push({
        path: '/',
        start_line: 0,
        end_line: 0,
        annotation_level: 'failure',
        title: 'Missing Veracode Policy name in the config.',
        message: 'Please configure the Veracode policy name under the config file.',
      });
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        annotations,
        'Missing Veracode Policy name in the config.',
      );
      return;
    }
    const getPolicyResource = {
      resourceUri: appConfig.api.veracode.policyUri,
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

    const applicationResponse: VeracodeApplication.policyResultsData =
      await http.getResourceByAttribute<VeracodeApplication.policyResultsData>(inputs.vid, inputs.vkey, getPolicyResource);

    core.setOutput('total_elements', applicationResponse?.page?.total_elements);
    if (applicationResponse && applicationResponse?.page?.total_elements != 1) {
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        annotations,
        'Please check the policy name provided in the config file.',
      );
      if (inputs.break_build_invalid_policy == true) {
        core.setFailed('Invalid Veracode Policy name.')
      } else {
        core.error('Invalid Veracode Policy name.')
      }
    }
  } catch (error) {
    core.debug(`Error while validating invalid policy name: ${error}`);
    await updateChecks(
      octokit,
      checkStatic,
      Checks.Conclusion.Failure,
      [],
      'Error while validating policy name.',
    );
    throw error;
  }
}

export async function registerBuild(inputs: Inputs): Promise<void> {
  const filePath = 'workflow-metadata.json';
  const artifactName = 'workflow-metadata';
  try {
    const repo = inputs.source_repository.split('/');
    const ownership = {
      owner: repo[0],
      repo: repo[1],
    };
    const rootDirectory = process.cwd();
    const artifactClient = new DefaultArtifactClient();
    const metadata = {
      'check_run_type': inputs.event_type,
      'repository_name': ownership.repo,
      'check_run_id': inputs.check_run_id,
      'branch': inputs.branch,
      'sha': inputs.head_sha,
      'issue_trigger_flow': inputs.issue_trigger_flow ?? false,
    }
    await fspromises.writeFile(filePath, JSON.stringify(metadata, null, 2));
    await artifactClient.uploadArtifact(artifactName, [filePath], rootDirectory);
    core.info(`${artifactName} directory uploaded successfully under the artifact.`);
  } catch (error) {
    core.info(`Error while creating the ${artifactName} artifact ${error}`);
  }
}

export async function trimSandboxesFromApplicationProfile(inputs: Inputs): Promise<void> {

  const appGuid = await getAppGUIDByAppName(inputs);

  const appname = inputs.appname;
  const vid = inputs.vid;
  const vkey = inputs.vkey;
  const sandboxName = inputs.sandboxname;

  let sandboxes: VeracodeApplication.Sandbox[];
  try {
    sandboxes = await getSandboxesByApplicationGuid(appGuid, vid, vkey);
  } catch (error) {
    throw new Error(`Error retrieving sandboxes for application ${appname}`);
  }

  // Sort sandboxes by their modified field => which is the last scan time
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
    // Nothing to delete
    core.info(`Total sandboxes [${total_sb_size}] are equal or less than the trim_to_size input [${keep_size}]. Nothing to delete`);
    return;
  } else {
    const number_to_delete = total_sb_size - keep_size;
    sandboxesToDelete = sortedSandboxes.slice(0, number_to_delete);
  }

  core.info('Starting to delete sandboxes');
  const deletedSandboxNames: string[] = [];
  await Promise.all(sandboxesToDelete.map(async (sandbox, i) => {
    core.info(`[${i}] - ${sandbox.name} => ${sandbox.modified}, ${sandbox.guid}`);
    const removeSandboxResource = {
      resourceUri: appConfig.api.veracode.sandboxUri.replace('${appGuid}', appGuid),
      resourceId: sandbox.guid,
    };
    try {
      await http.deleteResourceById(vid, vkey, removeSandboxResource);
      core.info(`Sandbox '${sandbox.name}' with GUID [${sandbox.guid}] deleted`);
      deletedSandboxNames.push(`'${sandbox.name}' (GUID:${sandbox.guid})`);
    } catch (error) {
      core.warning(`Error removing sandbox:${error}`);
      core.setFailed(`Error removing sandbox ${sandbox.name}`);
    }
  }));

  core.info(`Deleted Sandboxes names: ${JSON.stringify(deletedSandboxNames)}`);
  core.info('---------------------------------');
}

export async function syncRepositories(inputs: Inputs): Promise<void> {

  const run = (cmd: string, options: ExecSyncOptions = {}): void => {
    core.info(`Command: ${cmd}\n`);
    execSync(cmd, { stdio: 'inherit', ...options });
  };

  const getInstallationIdForOrg = async (orgName: string, jwtToken: string): Promise<number> => {
    core.info(`Getting installation ID for org: ${orgName}`);
    try {
      const response = await axios.get(`https://${appConfig.hostName.github}/app/installations`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      const installation = response.data.find(
        (inst: any) => inst.account.login.toLowerCase() === orgName.toLowerCase()
      );

      if (!installation) {
        core.setFailed(`Installation not found for org: ${orgName}`);
        throw new Error(`Installation not found for org: ${orgName}`);
      }

      return installation.id;
    } catch (error) {
      core.setFailed(`Error getting installation ID for org: ${orgName}`);
      throw new Error(`Error getting installation ID for org: ${orgName}`);
    }
  };

  const getInstallationToken = async (jwtToken: string, installationId: number): Promise<string> => {
    core.info(`Getting installation token for installation ID: ${installationId}`);
    try {
      const url = `https://${appConfig.hostName.github}/app/installations/${installationId}/access_tokens`;
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );

      if (!response.data) {
        core.setFailed(`No data received from GitHub for installation ID: ${installationId}`);
        throw new Error(`No data received from GitHub for installation ID: ${installationId}`);
      }
      return response.data.token;
    } catch (error) {
      core.setFailed(`Error getting installation token for installation ID: ${installationId}`);
      throw new Error(`Error getting installation token for installation ID: ${installationId}`);
    }
  };

  const closePreviousSyncPRs = async (token: string): Promise<number[]> => {
    core.info('Closing previous synchronization Pull Request\'s if any');

    try {
      const url = `https://${appConfig.hostName.github}/repos/${inputs.owner}/veracode/pulls`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        params: {
          state: 'open',
          base: 'main',
        },
      });

      const prsToClose = response.data.filter(
        (pr: any) =>
          pr.title === appConfig.constants.syncPrTitle || pr.head.ref.startsWith(appConfig.constants.branchPrefix)
      );

      const closedPrNumbers: number[] = [];

      for (const pr of prsToClose) {
        try {
          core.info(`Closing existing PR: #${pr.number} - ${pr.title}`);

          // Close the PR
          await axios.patch(`https://${appConfig.hostName.github}/repos/${inputs.owner}/veracode/pulls/${pr.number}`,
            { state: 'closed' },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
              },
            }
          );

          // Add comment to the closed PR
          await axios.post(`https://${appConfig.hostName.github}/repos/${inputs.owner}/veracode/issues/${pr.number}/comments`,
            {
              body: '🤖 This PR was automatically closed because a new synchronization PR has been created.',
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
              },
            }
          );

          closedPrNumbers.push(pr.number);
          core.info(`Successfully closed PR #${pr.number}`);
        } catch (error) {
          core.error(`Failed to close PR #${pr.number}: ${error}`);
          // Continue with the next PR even if this one fails
        }
      }

      return closedPrNumbers;
    } catch (error) {
      core.error(`Failed to fetch or process pull requests: ${error}`);
      throw error; // Re-throw to let the caller handle the error
    }
  };

  const createPullRequest = async (token: string,headBranch: string,baseBranch: string,title: string,body: string): Promise<string> => {
    core.info('Creating new PR');
    const url = `https://${appConfig.hostName.github}/repos/${inputs.owner}/veracode/pulls`;

    const payload = {
      title,
      body,
      head: headBranch,
      base: baseBranch,
    };

    core.info('PR Payload: ' + JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      return response.data.html_url;
    } catch (error: any) {
      if (error.response) {
        core.setFailed(`GitHub API Error: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        core.setFailed(`No response from GitHub: ${error.message}`);
      } else {
        core.setFailed(`Request setup error: ${error.message}`);
      }
      throw error;
    }
  };

  const deleteLocalFileIfExists = (filePath: string): void => {
    if (fs.existsSync(filePath)) {
      const stat = fs.lstatSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️ Removed directory ${filePath}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Removed file ${filePath}`);
      }
    }
  };

  // === SYNC START ===
  core.info(`Starting repository sync for org: ${inputs.owner}`);

  const installationId:number  = await getInstallationIdForOrg(inputs.owner, inputs.jwtToken);

  const targetToken = await getInstallationToken(inputs.jwtToken, installationId);

  const targetRepoUrl = `https://x-access-token:${targetToken}@github.com/${inputs.owner}/veracode.git`;

  if (fs.existsSync(appConfig.constants.tempDir)) run(`rm -rf ${appConfig.constants.tempDir}`);

  run(`git clone --branch main --single-branch ${appConfig.constants.source_repo_url} ${appConfig.constants.tempDir}`);
  process.chdir(appConfig.constants.tempDir);

  appConfig.constants.preserveFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    deleteLocalFileIfExists(filePath);
  });

  const tempBranch = `sync-workflow-actions-${new Date().toISOString().slice(0,10)}`;
  run(`git checkout -b ${tempBranch}`);

  try {
    run('git remote remove target');
    core.info('Removed existing "target" remote');
  } catch {
    core.info('No existing "target" remote to remove');
  }

  run(`git remote add target ${targetRepoUrl}`);
  core.info('🔗 Added "target" remote');
  run(`git push target ${tempBranch} --force`);

  core.info('Waiting for GitHub to register the new branch...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await closePreviousSyncPRs(targetToken);

  const prUrl = await createPullRequest(
    targetToken,
    tempBranch,
    'main',
    appConfig.constants.syncPrTitle,
    'Automated PR created by sync script. Please review and merge.'
  );

  core.info(`Pull Request created: ${prUrl}`);

  process.chdir('..');
  run(`rm -rf ${appConfig.constants.tempDir}`);
  core.info('🧹 Cleanup complete');
}