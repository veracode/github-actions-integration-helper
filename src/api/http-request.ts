import * as core from '@actions/core';
import { calculateAuthorizationHeader } from './veracode-hmac';
import appConfig from '../app-config';

interface Resource {
  resourceUri: string;
  queryAttribute: string;
  queryValue: string;
}

interface ResourceById {
  resourceUri: string;
  resourceId: string;
}

export async function getResourceByAttribute<T>(vid: string, vkey: string, resource: Resource): Promise<T> {
  const resourceUri = resource.resourceUri;
  const queryAttribute = resource.queryAttribute;
  const queryValue = resource.queryValue;
  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  const urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
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
  core.info(`appURL getResourceByAttribute: ${appUrl}`);
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