// all events this components subscribes to and expects to be pushed by other components

export const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export const EDITOR_ACTIVE = 'editor.active';

// payload = { path: string }
export const EDITOR_CLOSE = 'editor.close';
export const EDITOR_DIRTY_CHANGED = 'editor.dirtyStateChanged';

// payload = { path: string }
export const EDITOR_SAVE_COMPLETED = 'editor.save.completed';

export const WORKSPACE_RELOAD_REQUEST = 'workspace.reload.request';

// test execution was successfully started and is/should be running,
// payload is { response: Response, path: string, message: string }
export const TEST_EXECUTION_STARTED = 'test.execution.started';
// test execution could not be started,
// payload { path: string, reason: any, message: string }
export const TEST_EXECUTION_START_FAILED = 'test.execution.start.failed';

/**
 * USER_ACTIVITY_UPDATED notifies listeners about activities of collaborators working with the Test-Editor simultaneously.
 * Payload: ElementActivity[]
 */
export interface UserActivityData { user: string; type: string; }
export interface ElementActivity {
  element: string;
  activities: UserActivityData[];
}
export const USER_ACTIVITY_UPDATED = 'user.activity.updated';
