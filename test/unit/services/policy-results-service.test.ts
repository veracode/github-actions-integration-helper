import { preparePolicyResults } from '../../../src/services/policy-results-services';
import { policyResultsInput } from '../fixtures/policyResultsInput';
import policyFlawsNoFindings from '../fixtures/artifacts/policyFlaws/noFindings.json';
import policyFlawsTwoFindings from '../fixtures/artifacts/policyFlaws/twoFindings.json';
import { readFile } from 'fs/promises';
import { updateChecks } from '../../../src/services/check-service';
import { Annotation, ChecksStatic, Conclusion, Status } from '../../../src/namespaces/Checks';
import { asMockedFunction } from '../../utils/utils';
import { Octokit } from '@octokit/rest';

jest.mock('fs/promises');
jest.mock('../../../src/services/check-service');

const mockUpdateChecks = asMockedFunction(updateChecks);
const mockReadFile = asMockedFunction(readFile);
const resultsUrlText =
  'https://analysiscenter.veracode.com/auth/index.jsp#ViewReportsResultSummary:89495:2128168:35862262';

jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn(() => ({
      repos: {
        get: jest.fn(),
      },
    })),
  };
});

describe('policy-results-service', () => {
  describe('when findings are not present', () => {
    beforeEach(() => {
      jest.resetAllMocks();

      mockReadFile.mockResolvedValueOnce(JSON.stringify(policyFlawsNoFindings)).mockResolvedValueOnce(resultsUrlText);
    });

    it('should update the check run with results URL', async () => {
      await preparePolicyResults(policyResultsInput);

      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockUpdateChecks).toHaveBeenCalledTimes(1);

      const expected = {
        checksStatic: {
          owner: 'jake-repo-organization',
          repo: 'clean-repo',
          check_run_id: 24715347779,
          status: Status.Completed,
        } as ChecksStatic,
        conclusion: Conclusion.Success,
        annotations: [] as Annotation[],
        summary: `No policy violated findings, the full report can be found [here](${resultsUrlText}).`,
      };

      expect(mockUpdateChecks).toHaveBeenCalledWith(
        expect.anything(),
        expected.checksStatic,
        expected.conclusion,
        expected.annotations,
        expected.summary,
      );

      expect(mockReadFile).toHaveBeenCalledWith('policy_flaws.json', 'utf-8');
      expect(mockReadFile).toHaveBeenCalledWith('results_url.txt', 'utf-8');
    });
  });

  describe('when findings are present', () => {
    beforeEach(() => {
      jest.resetAllMocks();

      mockReadFile.mockResolvedValueOnce(JSON.stringify(policyFlawsTwoFindings)).mockResolvedValueOnce(resultsUrlText);
      (Octokit as unknown as jest.Mock).mockImplementation(() => ({
        repos: {
          get: jest.fn().mockResolvedValue({ data: { language: 'not-java' } }),
        },
      }));
    });

    it('should update the check run with results URL', async () => {
      await preparePolicyResults(policyResultsInput);

      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockUpdateChecks).toHaveBeenCalledTimes(1);

      const expected = {
        checksStatic: {
          owner: 'jake-repo-organization',
          repo: 'clean-repo',
          check_run_id: 24715347779,
          status: Status.Completed,
        } as ChecksStatic,
        conclusion: Conclusion.Failure,
        summary: `Here's the summary of the check result, the full report can be found [here](${resultsUrlText}).`,
      };

      expect(mockUpdateChecks).toHaveBeenCalledWith(
        expect.anything(),
        expected.checksStatic,
        expected.conclusion,
        expect.anything(),
        expected.summary,
      );
      // should have been called with 2 annotations
      const annotations = mockUpdateChecks.mock.calls[0][3];
      expect(annotations).toHaveLength(2);

      expect(annotations[0].message).toMatch(/^\[Very High\] Filename: com\/scalesec\/vulnado\/Cowsay\.java/);
      expect(annotations[0]).toEqual({
        path: 'com/scalesec/vulnado/Cowsay.java',
        start_line: 16,
        end_line: 16,
        annotation_level: 'warning',
        title: "Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')",
        message: expect.any(String),
      });

      expect(annotations[1].message).toMatch(/^\[High\] Filename: com\/scalesec\/vulnado\/User\.java/);
      expect(annotations[1]).toEqual({
        path: 'com/scalesec/vulnado/User.java',
        start_line: 49,
        end_line: 49,
        annotation_level: 'warning',
        title: "Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')",
        message: expect.any(String),
      });

      expect(mockReadFile).toHaveBeenCalledWith('policy_flaws.json', 'utf-8');
      expect(mockReadFile).toHaveBeenCalledWith('results_url.txt', 'utf-8');
    });
  });
});
