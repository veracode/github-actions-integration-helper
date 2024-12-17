"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appConfig = {
    hostName: {
        veracode: {
            us: 'api.veracode.com',
            eu: 'api.veracode.eu'
        },
        github: 'api.github.com'
    },
    api: {
        veracode: {
            applicationUri: '/appsec/v1/applications',
            findingsUri: '/appsec/v2/applications',
            sandboxUri: '/appsec/v1/applications/${appGuid}/sandboxes',
            selfUserUri: '/api/authn/v2/users/self',
            policyUri: '/appsec/v1/policies'
        },
        github: ''
    }
};
exports.default = appConfig;
