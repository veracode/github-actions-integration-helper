import { InputOptions } from '@actions/core';
type GetInput = (name: string, options?: InputOptions | undefined) => string;
export declare enum Actions {
    GetPolicyNameByProfileName = "getPolicyNameByProfileName",
    PreparePipelineResults = "preparePipelineResults",
    PreparePolicyResults = "preparePolicyResults",
    RemoveSandbox = "removeSandbox",
    ValidateVeracodeApiCreds = "validateVeracodeApiCreds",
    ValidatePolicyName = "validatePolicyName"
}
export type Inputs = {
    action: Actions;
    vid: string;
    vkey: string;
    appname: string;
    token: string;
    check_run_id: number;
    source_repository: string;
    fail_checks_on_policy: boolean;
    fail_checks_on_error: boolean;
    sandboxname: string;
    policyname: string;
};
export declare const parseInputs: (getInput: GetInput) => Inputs;
export declare const vaildateScanResultsActionInput: (inputs: Inputs) => boolean;
export declare const vaildateRemoveSandboxInput: (inputs: Inputs) => boolean;
export declare const ValidatePolicyName: (inputs: Inputs) => boolean;
export declare const ValidateVeracodeApiCreds: (inputs: Inputs) => boolean;
export {};
