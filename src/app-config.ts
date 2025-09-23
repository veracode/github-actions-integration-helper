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
  },
  constants:{
    tempDir: string,
    preserveFiles: string[],
    syncPrTitle: string,
    branchPrefix: string,
    source_repo_url: string,
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
  },
  constants:{
    tempDir: './temp-repo',
    preserveFiles: ['.github/workflows', 'actions'],
    syncPrTitle: 'Sync workflows and actions folders',
    branchPrefix: 'Workflows-Actions-Sync-',
    source_repo_url:'https://github.com/veracode/github-actions-integration.git',
  }
};

export default appConfig;
