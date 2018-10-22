// all events this components subscribes to and pushes itself

// emitted after the validation markers in the workspace tree have
// been updated from the server.
// payload is a Map<string, ValidationMarkerData>, with the keys
// being the workspace tree item ids (the elements' paths), and
// the values being the summarized validation marker data.
export const WORKSPACE_MARKER_UPDATE = 'workspace.marker.update';
