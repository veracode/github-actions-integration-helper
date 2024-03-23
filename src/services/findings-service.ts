import * as VeracodePolicyResult from '../namespaces/VeracodePolicyResult';
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

  const findingsResponse: VeracodePolicyResult.ResultsData =
    await http.getResourceByAttribute<VeracodePolicyResult.ResultsData>(
      vid,
      vkey,
      getPolicyFindingsByApplicationResource,
    );

  return findingsResponse._embedded.findings;
}
