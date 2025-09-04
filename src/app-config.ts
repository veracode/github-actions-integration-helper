interface AppConfig {
  hostName: {
    veracode: {
      us: string,
      eu: string,
    },
    github: string,
  };
  api: {
    veracode: {
      applicationUri: string,
      findingsUri: string,
      sandboxUri: string,
      selfUserUri: string,
      policyUri: string,
      relayServiceUri: string,
    }
    github: ''
  };
}

const appConfig: AppConfig = {
  hostName: {
    veracode: {
      us: 'api.veracode.com',
      eu: 'api.veracode.eu'
    },
    github: 'api.github.com'
  },
  api: {
    veracode : {
      applicationUri: '/appsec/v1/applications',
      findingsUri: '/appsec/v2/applications',
      sandboxUri: '/appsec/v1/applications/${appGuid}/sandboxes',
      selfUserUri: '/api/authn/v2/users/self',
      policyUri: '/appsec/v1/policies',
      relayServiceUri: '/vrm-relay-service/api/scan-report',
    },
    github: ''
  }
};

export default appConfig;
