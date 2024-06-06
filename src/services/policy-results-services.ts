import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs/promises';
import { Inputs, vaildateScanResultsActionInput } from '../inputs';
import * as VeracodePolicyResult from '../namespaces/VeracodePolicyResult';
import * as Checks from '../namespaces/Checks';
import { updateChecks } from './check-service';

export async function preparePolicyResults(inputs: Inputs): Promise<void> {
  const octokit = new Octokit({
    auth: inputs.token,
  });

  const repo = inputs.source_repository.split('/');
  const ownership = {
    owner: repo[0],
    repo: repo[1],
  };

  const checkStatic: Checks.ChecksStatic = {
    owner: ownership.owner,
    repo: ownership.repo,
    check_run_id: inputs.check_run_id,
    status: Checks.Status.Completed,
  };

  // When the action is preparePolicyResults, need to make sure token,
  // check_run_id and source_repository are provided
  if (!vaildateScanResultsActionInput(inputs)) {
    core.setFailed('token, check_run_id and source_repository are required.');
    // TODO: Based on the veracode.yml, update the checks status to failure or pass
    await updateChecks(
      octokit,
      checkStatic,
      inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success,
      [],
      'Token, check_run_id and source_repository are required.',
    );
    return;
  }

  let findingsArray: VeracodePolicyResult.Finding[] = [];
  let resultsUrl: string = '';

  try {
    const data = await fs.readFile('policy_flaws.json', 'utf-8');
    const parsedData: VeracodePolicyResult.ResultsData = JSON.parse(data);
    findingsArray = parsedData._embedded.findings;
    resultsUrl = await fs.readFile('results_url.txt', 'utf-8');
  } catch (error) {
    core.debug(`Error reading or parsing filtered_results.json:${error}`);
    core.setFailed('Error reading or parsing pipeline scan results.');
    // TODO: Based on the veracode.yml, update the checks status to failure or pass
    await updateChecks(
      octokit,
      checkStatic,
      inputs.fail_checks_on_error ? Checks.Conclusion.Failure : Checks.Conclusion.Success,
      [],
      'Error reading or parsing pipeline scan results.',
    );
    return;
  }

  core.info(`Policy findings: ${findingsArray.length}`);
  core.info(`Results URL: ${resultsUrl}`);
  if (findingsArray.length === 0) {
    core.info('No findings violates the policy, exiting and update the github check status to success');
    // update inputs.check_run_id status to success
    await updateChecks(
      octokit,
      checkStatic,
      Checks.Conclusion.Success,
      [],
      `No policy violated findings, the full report can be found [here](${resultsUrl})`,
    );
    return;
  } else {
    core.info('Findings violate the policy, exiting and update the github check status to failure');
    // use octokit to check the language of the source repository. If it is a java project, then
    // use octokit to check if the source repository is using java maven or java gradle
    // if so, filePathPrefix = 'src/main/java/'
    const repoResponse = await octokit.repos.get(ownership);
    const language = repoResponse.data.language;
    core.info(`Source repository language: ${language}`);
    let javaMaven = false;
    if (language === 'Java') {
      let pomFileExists = false;
      let gradleFileExists = false;
      try {
        await octokit.repos.getContent({ ...ownership, path: 'pom.xml' });
        pomFileExists = true;
      } catch (error) {
        core.debug(`Error reading or parsing source repository:${error}`);
      }
      try {
        await octokit.repos.getContent({ ...ownership, path: 'build.gradle' });
        gradleFileExists = true;
      } catch (error) {
        core.debug(`Error reading or parsing source repository:${error}`);
      }
      if (pomFileExists || gradleFileExists) javaMaven = true;
    }
    // update inputs.check_run_id status to failure

    const annotations = getAnnotations(findingsArray, javaMaven);
    const maxNumberOfAnnotations = 50;

    for (let index = 0; index < annotations.length / maxNumberOfAnnotations; index++) {
      const annotationBatch = annotations.slice(index * maxNumberOfAnnotations, (index + 1) * maxNumberOfAnnotations);
      if (annotationBatch.length > 0) {
        await updateChecks(
          octokit,
          checkStatic,
          inputs.fail_checks_on_policy ? Checks.Conclusion.Failure : Checks.Conclusion.Success,
          annotationBatch,
          `Here's the summary of the check result, the full report can be found [here](${resultsUrl}).`,
        );
      }
    }
    return;
  }
}

function getAnnotations(policyFindings: VeracodePolicyResult.Finding[], javaMaven: boolean): Checks.Annotation[] {
  const annotations: Checks.Annotation[] = [];
  policyFindings.forEach(function (element) {
    if (javaMaven) {
      element.finding_details.file_path = `src/main/java/${element.finding_details.file_path}`;
      if (element.finding_details.file_path.includes('WEB-INF'))
        element.finding_details.file_path = element.finding_details.file_path.replace(
          /src\/main\/java\//, // Use regular expression for precise replacement
          'src/main/webapp/',
        );
    }

    const displayMessage = element.description
      .replace(/<span>/g, '')
      .replace(/<\/span> /g, '\n')
      .replace(/<\/span>/g, '');
    let filePath = element.finding_details.file_path;
    if (filePath.startsWith('/')) filePath = filePath.substring(1);
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
