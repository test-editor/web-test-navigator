// all events this components subscribes to and expects to be pushed by other components

export const HTTP_CLIENT_SUPPLIED = 'httpClient.supplied';

export const EDITOR_ACTIVE = 'editor.active';
export const EDITOR_CLOSE = 'editor.close';
export const EDITOR_DIRTY_CHANGED = 'editor.dirtyStateChanged';

export const WORKSPACE_RELOAD_REQUEST = 'workspace.reload.request';

// request execution of a test case,
// payload is the absolute path of the respective tcl
export const TEST_EXECUTE_REQUEST = 'test.execute.request';
