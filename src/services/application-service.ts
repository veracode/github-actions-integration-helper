import * as core from '@actions/core';
import appConfig from '../app-config';
import { Octokit } from '@octokit/rest';
import * as Checks from '../namespaces/Checks';
import { updateChecks } from './check-service';
import * as VeracodeApplication from '../namespaces/VeracodeApplication';
import * as http from '../api/http-request';
import { Inputs, vaildateRemoveSandboxInput } from '../inputs';

export async function getApplicationByName(
  appname: string,
  vid: string,
  vkey: string,
): Promise<VeracodeApplication.Application> {
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
    console.error(error);
    throw error;
  }
}

export async function removeSandbox(inputs: Inputs): Promise<void> {
  if(!vaildateRemoveSandboxInput(inputs)) {
    core.setFailed('sandboxname is required.');
  }
  const appname = inputs.appname;
  const vid = inputs.vid;
  const vkey = inputs.vkey;
  const sandboxName = inputs.sandboxname;

  let application:VeracodeApplication.Application;

  try {
    application = await getApplicationByName(appname, vid, vkey);
  } catch (error) {
    core.setFailed(`No application found with name ${appname}`);
    throw new Error(`No application found with name ${appname}`);
  }

  const appGuid = application.guid;

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

export async function validateVeracodeApiCreds(inputs: Inputs): Promise<string> {
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
    const getSelfUserDetailsResource = {
      resourceUri: appConfig.api.veracode.selfUserUri,
      queryAttribute: '',
      queryValue: '',
    };

    const applicationResponse: VeracodeApplication.SelfUserResultsData =
      await http.getResourceByAttribute<VeracodeApplication.SelfUserResultsData>(inputs.vid, inputs.vkey, getSelfUserDetailsResource);

    core.info(`API Response - ${JSON.stringify(applicationResponse)}`);
    if (applicationResponse && applicationResponse?.api_credentials?.expiration_ts) {
      core.info(`Veracode API ID and API key is valid, Credentials expiration date - ${applicationResponse.api_credentials.expiration_ts}`);
    } else {
      core.setFailed('Invalid/Expired Veracode API ID and API Key');
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        [],
        'Invalid/Expired Veracode API ID and API Key.',
      );
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
    const getPolicyResource = {
      resourceUri: appConfig.api.veracode.policyUri,
      queryAttribute: 'name',
      queryValue: encodeURIComponent(inputs.policyname),
    };

    annotations.push({
      path: inputs.path,
      start_line: inputs.start_line,
      end_line: inputs.end_line,
      annotation_level: 'failure',
      title: 'Invalid Veracode Policy name',
      message: 'Please check the policy name provided in the veracode.yml',
    });

    const applicationResponse: VeracodeApplication.policyResultsData =
      await http.getResourceByAttribute<VeracodeApplication.policyResultsData>(inputs.vid, inputs.vkey, getPolicyResource);

    core.info(`API Response - ${JSON.stringify(applicationResponse)}`);
    core.setOutput('total_elements', applicationResponse?.page?.total_elements);
    if (applicationResponse?.page?.total_elements && applicationResponse?.page?.total_elements != 1) {
      await updateChecks(
        octokit,
        checkStatic,
        Checks.Conclusion.Failure,
        annotations,
        'Please review and ensure the accuracy of the Policy Name specified in your veracode.yml file.',
      );
      if (inputs.break_build_policy_findings == true) {
        core.setFailed('Invalid Veracode Policy name.')
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