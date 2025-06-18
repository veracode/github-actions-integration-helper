import * as core from '@actions/core';
import { calculateAuthorizationHeader } from './veracode-hmac';
import appConfig from '../app-config';

interface Resource {
  resourceUri: string;
  queryAttribute: string;
  queryValue: string;
  queryAttribute1?: string;
  queryValue1?: boolean;
}

interface ResourceById {
  resourceUri: string;
  resourceId: string;
}

export async function getResourceByAttribute<T>(vid: string, vkey: string, resource: Resource): Promise<T> {
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute;
  const queryValue = resource.queryValue;
  const queryAttribute1 = resource.queryAttribute1;
  const queryValue1 = resource.queryValue1;
  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  let urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  if (queryAttribute1) {
    urlQueryParams = urlQueryParams + `&${queryAttribute1}=${queryValue1}`;
  }
  const queryUrl = resourceUri + urlQueryParams;
  const headers = {
    Authorization: calculateAuthorizationHeader({
      id: vid,
      key: vkey,
      host: host,
      url: queryUrl,
      method: 'GET',
    }),
  };
  const appUrl = `https://${host}${resourceUri}${urlQueryParams}`;
  try {
    const response = await fetch(appUrl, { headers });
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to fetch resource: ${error}`);
  }
}

export async function deleteResourceById(vid: string, vkey: string, resource: ResourceById): Promise<void> {
  const resourceUri = resource.resourceUri;
  const resourceId = resource.resourceId;
  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  const queryUrl = `${resourceUri}/${resourceId}`;
  const headers = {
    Authorization: calculateAuthorizationHeader({
      id: vid,
      key: vkey,
      host: host,
      url: queryUrl,
      method: 'DELETE',
    }),
  };
  const appUrl = `https://${host}${resourceUri}/${resourceId}`;
  try {
    await fetch(appUrl, { method: 'DELETE', headers });
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to delete resource: ${error}`);
  }
}

export async function postResourceByAttribute<T>(vid: string, vkey: string, scanReport: string): Promise<T> {
  const resourceUri = appConfig.api.veracode.relayServiceUri;
  const host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01')) {
    vid = vid.split('-')[1] || '';
    vkey = vkey.split('-')[1] || '';
  }
  const headers = {
    Authorization: calculateAuthorizationHeader({
      id: vid,
      key: vkey,
      host: host,
      url: resourceUri,
      method: 'POST',
    }),
    'Content-Type': 'application/json',
  };
  try {
    const appUrl = `https://${host}${resourceUri}`;
    const response = await fetch(appUrl, {
      method: 'POST',
      headers: headers,
      body: scanReport,
    });

    const data = await response.json();
    core.info(`Scan report response: ${JSON.stringify(data)}`);
    return data as T;
  } catch (error) {
    throw new Error(`Failed to post resource: ${error}`);
  }
}
