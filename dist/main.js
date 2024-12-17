"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core = __importStar(require("@actions/core"));
const inputs_1 = require("./inputs");
const policyService = __importStar(require("./services/policy-service"));
const pipelineResultsService = __importStar(require("./services/pipeline-results-service"));
const policyResultsService = __importStar(require("./services/policy-results-services"));
const applicationService = __importStar(require("./services/application-service"));
async function run() {
    const inputs = (0, inputs_1.parseInputs)(core.getInput);
    switch (inputs.action) {
        case 'getPolicyNameByProfileName':
            await policyService.getPolicyNameByProfileName(inputs);
            break;
        case 'preparePipelineResults':
            await pipelineResultsService.preparePipelineResults(inputs);
            break;
        case 'preparePolicyResults':
            await policyResultsService.preparePolicyResults(inputs);
            break;
        case 'removeSandbox':
            await applicationService.removeSandbox(inputs);
            break;
        case 'validateVeracodeApiCreds':
            await applicationService.validateVeracodeApiCreds(inputs);
            break;
        case 'validatePolicyName':
            await applicationService.validatePolicyName(inputs);
            break;
        case 'registerBuild':
            await applicationService.registerBuild(inputs);
            break;
        default:
            core.setFailed(`Invalid action: ${inputs.action}. Allowed actions are: getPolicyNameByProfileName, preparePipelineResults, preparePolicyResults, removeSandbox, validateVeracodeApiCreds, validatePolicyName, registerBuild.`);
    }
}
