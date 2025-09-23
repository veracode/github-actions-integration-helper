import * as core from '@actions/core';
import { parseInputs } from './inputs';
import * as policyService from './services/policy-service';
import * as pipelineResultsService from './services/pipeline-results-service';
import * as policyResultsService from './services/policy-results-services';
import * as applicationService from './services/application-service';

/**
 * Runs the action.
 */

export async function run(): Promise<void> {
  core.warning(
    'The code in this branch has been merged into the `main` branch and is no longer active. Please refer to the `main` branch for the latest code and updates.',
  );
  const inputs = parseInputs(core.getInput);

  switch (inputs.action) {
    case 'getPolicyNameByProfileName':
      await policyService.getPolicyNameByProfileName(inputs);
      break;
    case 'preparePipelineResults':
      await pipelineResultsService.preparePipelineResults(inputs);
      break;
    case 'preparePolicyResults':
      await policyResultsService.preparePolicyResults(inputs);
      break;
    case 'removeSandbox':
      await applicationService.removeSandbox(inputs);
      break;
    case 'validateVeracodeApiCreds':
      await applicationService.validateVeracodeApiCreds(inputs);
      break;
    case 'validatePolicyName':
      await applicationService.validatePolicyName(inputs);
      break;
    case 'registerBuild':
      await applicationService.registerBuild(inputs);
      break;
    case 'trim-sandboxes':
      await applicationService.trimSandboxesFromApplicationProfile(inputs);
      break;
    default:
      core.setFailed(
        `Invalid action: ${inputs.action}. Allowed actions are: getPolicyNameByProfileName, preparePipelineResults, preparePolicyResults, removeSandbox, validateVeracodeApiCreds, validatePolicyName, registerBuild, and trim-sandboxes.`,
      );
  }
}
