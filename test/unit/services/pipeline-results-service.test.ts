import { getAnnotations } from '../../../src/services/pipeline-results-service';
import { Finding } from '../../../src/namespaces/VeracodePipelineResult';

function buildFinding(overrides: Partial<Finding>): Finding {
  return {
    title: 'A finding',
    issue_id: 1,
    severity: 5,
    issue_type_id: 'type-id',
    issue_type: 'OS Command Injection',
    cwe_id: '78',
    files: {
      source_file: {
        file: 'src/main/java/com/example/App.java',
        line: 10,
        function_name: 'main',
      },
    },
    display_text: '<span>Some finding text</span>',
    ...overrides,
  };
}

describe('pipeline-results-service getAnnotations', () => {
  it('prefixes severity', () => {
    const findings = [
      buildFinding({ severity: 3, files: { source_file: { file: 'a/b/Medium.java', line: 20, function_name: 'f' } }, issue_type: 'Medium Issue' }),
      buildFinding({ severity: 5, files: { source_file: { file: 'a/b/High.java', line: 30, function_name: 'g' } }, issue_type: 'Very High Issue' }),
    ];

    const annotations = getAnnotations(findings, false);

    expect(annotations).toHaveLength(2);

    expect(annotations[0].message).toMatch(/^\[Medium\] Filename: /);
    expect(annotations[0]).toEqual({
      path: 'a/b/Medium.java',
      start_line: 20,
      end_line: 20,
      annotation_level: 'warning',
      title: 'Medium Issue',
      message: expect.any(String),
    });

    expect(annotations[1].message).toMatch(/^\[Very High\] Filename: /);
    expect(annotations[1]).toEqual({
      path: 'a/b/High.java',
      start_line: 30,
      end_line: 30,
      annotation_level: 'warning',
      title: 'Very High Issue',
      message: expect.any(String),
    });
  });

  it('missing severity', () => {
    const finding = buildFinding({
      severity: undefined as unknown as number,
      files: { source_file: { file: 'a/b/Unknown.java', line: 40, function_name: 'h' } },
      issue_type: 'Unknown Issue',
    });

    const annotations = getAnnotations([finding], false);

    expect(annotations).toHaveLength(1);
    expect(annotations[0].message).toMatch(/^Filename: /);
    expect(annotations[0]).toEqual({
      path: 'a/b/Unknown.java',
      start_line: 40,
      end_line: 40,
      annotation_level: 'warning',
      title: 'Unknown Issue',
      message: expect.any(String),
    });
  });
});
