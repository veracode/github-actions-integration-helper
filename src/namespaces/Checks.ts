export enum Conclusion {
  Success = 'success',
  Failure = 'failure',
  Neutral = 'neutral',
  Cancelled = 'cancelled',
  TimedOut = 'timed_out',
  ActionRequired = 'action_required',
  Skipped = 'skipped',
}

export enum Status {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export interface Annotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: string;
  title: string;
  message: string;
}

export interface ChecksStatic {
  owner: string;
  repo: string;
  check_run_id: number;
  status: Status;
}
