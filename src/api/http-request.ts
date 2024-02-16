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

  const urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
  const queryUrl = resourceUri + urlQueryParams;
  const headers = {
    Authorization: calculateAuthorizationHeader({
      id: vid,
      key: vkey,
      host: appConfig.hostName.veracode,
      url: queryUrl,
      method: 'GET',
    }),
  };
  const appUrl = `https://${appConfig.hostName}${resourceUri}${urlQueryParams}`;
  try {
    const response = await fetch(appUrl, { headers });
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error('Failed to fetch resource.');
  }
}

export async function deleteResourceById(vid: string, vkey: string, resource: ResourceById): Promise<void> {
  const resourceUri = resource.resourceUri;
  const resourceId = resource.resourceId;

  const queryUrl = `${resourceUri}/${resourceId}`;
  const headers = {
    Authorization: calculateAuthorizationHeader({
      id: vid,
      key: vkey,
      host: appConfig.hostName.veracode,
      url: queryUrl,
      method: 'DELETE',
    }),
  };
  const appUrl = `https://${appConfig.hostName}${resourceUri}/${resourceId}`;
  try {
    await fetch(appUrl, { method: 'DELETE', headers });
  } catch (error) {
    console.log(error);
    throw new Error('Failed to delete resource.');
  }
}