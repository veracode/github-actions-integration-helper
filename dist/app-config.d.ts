interface AppConfig {
    hostName: {
        veracode: {
            us: string;
            eu: string;
        };
        github: string;
    };
    api: {
        veracode: {
            applicationUri: string;
            findingsUri: string;
            sandboxUri: string;
            selfUserUri: string;
            policyUri: string;
            relayServiceUri: string;
        };
        github: '';
    };
    constants: {
        tempDir: string;
        preserveFiles: string[];
        syncPrTitle: string;
        branchPrefix: string;
        source_repo_url: string;
    };
}
declare const appConfig: AppConfig;
export default appConfig;
