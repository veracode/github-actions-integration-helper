import { preparePolicyResults } from '../../../src/services/policy-results-services';
import { policyResultsInput } from '../fixtures/policyResultsInput';
import policyFlawsNoFindings from '../fixtures/artifacts/policy-flaws/policy_flaws-no_findings.json';
import policyFlawsTwoFindings from '../fixtures/artifacts/policy-flaws/policy_flaws-two_findings.json';
import fs from 'fs/promises';
import { updateChecks } from '../../../src/services/check-service';

jest.mock('fs/promises');
// TODO: This part is still a WIP.
jest.mock('updateChecks');

describe('policy-results-service', () => {
  describe('when findings are not present', () => {
    beforeEach(() => {
      jest.resetAllMocks();

      const resultsUrlText =
        'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary:89495:2128168:35862262';
      fs.readFile = jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify(policyFlawsNoFindings))
        .mockResolvedValueOnce(resultsUrlText);
    });

    it('should update the check run with results URL', async () => {
      preparePolicyResults(policyResultsInput);
      // TODO: Why can't we resolve this guy?
      expect(updateChecks).toHaveBeenCalled();
    });
  });

  describe('when findings are present', () => {
    jest.resetAllMocks();
    beforeEach(() => {
      const resultsUrlText =
        'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary:89495:2128168:35862262';
      fs.readFile = jest
        .fn()
        .mockResolvedValueOnce(JSON.stringify(policyFlawsTwoFindings))
        .mockResolvedValueOnce(resultsUrlText);
    });

    it('should update the check run with results URL', async () => {
      preparePolicyResults(policyResultsInput);
    });
  });
});
