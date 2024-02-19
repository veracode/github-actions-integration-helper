interface AppConfig {
  hostName: string;
  applicationUri: string;
  findingsUri: string;
  sandboxUri: string;
  selfUserUri: string;
}

const appConfig: AppConfig = {
  hostName: 'api.veracode.com',
  applicationUri: '/appsec/v1/applications',
  findingsUri: '/appsec/v2/applications',
  sandboxUri: '/appsec/v1/applications/${appGuid}/sandboxes',
  selfUserUri: '/api/authn/v2/users/self'
};

export default appConfig;
