"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceByAttribute = getResourceByAttribute;
exports.deleteResourceById = deleteResourceById;
const veracode_hmac_1 = require("./veracode-hmac");
const app_config_1 = __importDefault(require("../app-config"));
async function getResourceByAttribute(vid, vkey, resource) {
    const resourceUri = resource.resourceUri;
    const queryAttribute = resource.queryAttribute;
    const queryValue = resource.queryValue;
    const queryAttribute1 = resource.queryAttribute1;
    const queryValue1 = resource.queryValue1;
    let host = app_config_1.default.hostName.veracode.us;
    if (vid.startsWith('vera01ei-')) {
        host = app_config_1.default.hostName.veracode.eu;
        vid = vid.split('-')[1] || '';
        vkey = vkey.split('-')[1] || '';
    }
    let urlQueryParams = queryAttribute !== '' ? `?${queryAttribute}=${queryValue}` : '';
    if (queryAttribute1) {
        urlQueryParams = urlQueryParams + `&${queryAttribute1}=${queryValue1}`;
    }
    const queryUrl = resourceUri + urlQueryParams;
    const headers = {
        Authorization: (0, veracode_hmac_1.calculateAuthorizationHeader)({
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
        return data;
    }
    catch (error) {
        throw new Error(`Failed to fetch resource: ${error}`);
    }
}
async function deleteResourceById(vid, vkey, resource) {
    const resourceUri = resource.resourceUri;
    const resourceId = resource.resourceId;
    let host = app_config_1.default.hostName.veracode.us;
    if (vid.startsWith('vera01ei-')) {
        host = app_config_1.default.hostName.veracode.eu;
        vid = vid.split('-')[1] || '';
        vkey = vkey.split('-')[1] || '';
    }
    const queryUrl = `${resourceUri}/${resourceId}`;
    const headers = {
        Authorization: (0, veracode_hmac_1.calculateAuthorizationHeader)({
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
    }
    catch (error) {
        console.log(error);
        throw new Error(`Failed to delete resource: ${error}`);
    }
}
