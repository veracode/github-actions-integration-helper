import * as VeracodePolicyResult from '../namespaces/VeracodePolicyResult';
import * as VeracodeApplication from '../namespaces/VeracodeApplication';
import appConfig from '../app-config';
import * as http from '../api/http-request';

/**
 * Get the policy findings for an application
 * @param appGuid The application guid
 * @param vid The veracode api id
 * @param vkey The veracode api key
 * @returns The policy findings for the application
 */
export async function getApplicationFindings(
  appGuid: string,
  vid: string,
  vkey: string,
): Promise<VeracodePolicyResult.Finding[]> {
  // TODO: consider the number of findings spreads more than 1 page
  // TODO: consider only retrieving the findings that violate policy
  const getPolicyFindingsByApplicationResource = {
    resourceUri: `${appConfig.api.veracode.findingsUri}/${appGuid}/findings`,
    queryAttribute: 'size',
    queryValue: '1000',
  };

  console.log('getPolicyFindingsByApplicationResource', getPolicyFindingsByApplicationResource);
  console.log('appGuid', appGuid);

  const findingsResponse: VeracodePolicyResult.ResultsData =
    await http.getResourceByAttribute<VeracodePolicyResult.ResultsData>(
      vid,
      vkey,
      getPolicyFindingsByApplicationResource,
    );

  if (!findingsResponse._embedded) {
    console.log('No Policy scan found, lets look for sandbox scan findings');
    const getSandboxGUID = {
      resourceUri: `${appConfig.api.veracode.applicationUri}/${appGuid}/sandboxes`,
      queryAttribute: '',
      queryValue: '',
    };

    const sandboxesResponse: VeracodeApplication.SandboxResultsData =
      await http.getResourceByAttribute<VeracodeApplication.SandboxResultsData>(
        vid,
        vkey,
        getSandboxGUID,
      );

    if (!sandboxesResponse._embedded) {
      console.log('No Policy scan found and no sandbox scan found.');
      return []
    }
    else {
      console.log('Sanbox response: ', sandboxesResponse._embedded.sandboxes[0])
      const sandboxGuid = sandboxesResponse._embedded.sandboxes[0].guid;
      const getPolicyFindingsBySandboxResource = {
        resourceUri: `${appConfig.api.veracode.findingsUri}/${appGuid}/findings`,
        queryAttribute: 'context',
        queryValue: sandboxGuid,
      };

      console.log('getPolicyFindingsBySandboxResource', getPolicyFindingsBySandboxResource);
      const findingsResponse: VeracodePolicyResult.ResultsData =
        await http.getResourceByAttribute<VeracodePolicyResult.ResultsData>(
          vid,
          vkey,
          getPolicyFindingsBySandboxResource,
        );



      if (!findingsResponse._embedded) {
        console.log('No Policy scan found and no sandbox scan found.');
        return [];
      }
      else {
        return findingsResponse._embedded.findings;
      }
    }
  }
  else {
    return findingsResponse._embedded.findings;
  }
}
