interface AppConfig {
  hostName: {
    veracode: string,
    github: string,
  };
  api: {
    veracode: {
      applicationUri: string,
      findingsUri: string,
      sandboxUri: string,
      selfUserUri: string,
      policyUri: string,
    }
    github: ''
  };
}

const appConfig: AppConfig = {
  hostName: {
    veracode: 'api.veracode.com',
    github: 'api.github.com'
  },
  api: {
    veracode : {
      applicationUri: '/appsec/v1/applications',
      findingsUri: '/appsec/v2/applications',
      sandboxUri: '/appsec/v1/applications/${appGuid}/sandboxes',
      selfUserUri: '/api/authn/v2/users/self',
      policyUri: '/appsec/v1/policies'
    },
    github: ''
  }
};

export default appConfig;
