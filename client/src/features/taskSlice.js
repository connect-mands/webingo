import { api } from "../services/api";

const TASKS_LOADED = "tasks/loaded";
const TASK_UPSERTED = "tasks/upserted";
const TASK_DELETED = "tasks/deleted";
const TASK_BULK_APPLIED = "tasks/bulkApplied";
const PRESENCE_UPDATED = "tasks/presenceUpdated";
const SELECTED_TOGGLED = "tasks/selectedToggled";
const SELECTED_CLEARED = "tasks/selectedCleared";
const TASK_OPTIMISTIC_UPDATED = "tasks/optimisticUpdated";

const initialState = { ids: [], entities: {}, presence: [], selectedIds: [], status: "idle" };

function sortTasks(ids, entities) {
  return [...ids].sort((a, b) => new Date(entities[b]?.updatedAt || 0) - new Date(entities[a]?.updatedAt || 0));
}

function upsertTask(state, task) {
  const exists = Boolean(state.entities[task._id]);
  const entities = { ...state.entities, [task._id]: task };
  const ids = exists ? state.ids : [...state.ids, task._id];
  return { ...state, entities, ids: sortTasks(ids, entities) };
}

export const fetchTasks = ({ projectId, params }) => async (dispatch) => {
  const { data } = await api.get(`/projects/${projectId}/tasks`, { params });
  dispatch({ type: TASKS_LOADED, payload: data });
  return { payload: data };
};

export const createTask = ({ projectId, task }) => async (dispatch) => {
  const { data } = await api.post(`/projects/${projectId}/tasks`, task);
  dispatch({ type: TASK_UPSERTED, payload: data });
  return { payload: data };
};

export const updateTask = ({ projectId, taskId, patch }) => async (dispatch) => {
  const { data } = await api.patch(`/projects/${projectId}/tasks/${taskId}`, patch);
  dispatch({ type: TASK_UPSERTED, payload: data });
  return { payload: data };
};

export const bulkTasks = ({ projectId, payload }) => async (dispatch) => {
  await api.patch(`/projects/${projectId}/tasks/bulk`, payload);
  dispatch({ type: TASK_BULK_APPLIED, payload });
  return { payload };
};

export const taskReceived = (task) => ({ type: TASK_UPSERTED, payload: task });
export const taskDeleted = (id) => ({ type: TASK_DELETED, payload: id });
export const bulkApplied = (payload) => ({ type: TASK_BULK_APPLIED, payload });
export const presenceUpdated = (users) => ({ type: PRESENCE_UPDATED, payload: users });
export const toggleSelected = (id) => ({ type: SELECTED_TOGGLED, payload: id });
export const clearSelected = () => ({ type: SELECTED_CLEARED });
export const optimisticTaskUpdate = (task) => ({ type: TASK_OPTIMISTIC_UPDATED, payload: task });

export const taskSelectors = {
  selectAll: (state) => state.tasks.ids.map((id) => state.tasks.entities[id]).filter(Boolean)
};

export default function taskReducer(state = initialState, action) {
  switch (action.type) {
    case TASKS_LOADED: {
      const entities = Object.fromEntries(action.payload.map((task) => [task._id, task]));
      const ids = sortTasks(Object.keys(entities), entities);
      return { ...state, ids, entities };
    }
    case TASK_UPSERTED:
      return upsertTask(state, action.payload);
    case TASK_DELETED: {
      const { [action.payload]: _removed, ...entities } = state.entities;
      return {
        ...state,
        entities,
        ids: state.ids.filter((id) => id !== action.payload),
        selectedIds: state.selectedIds.filter((id) => id !== action.payload)
      };
    }
    case TASK_BULK_APPLIED:
      if (action.payload.operation === "delete") {
        const deleted = new Set(action.payload.taskIds);
        const entities = Object.fromEntries(Object.entries(state.entities).filter(([id]) => !deleted.has(id)));
        return {
          ...state,
          entities,
          ids: state.ids.filter((id) => !deleted.has(id)),
          selectedIds: []
        };
      }
      return { ...state, selectedIds: [] };
    case PRESENCE_UPDATED:
      return { ...state, presence: action.payload };
    case SELECTED_TOGGLED:
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.payload)
          ? state.selectedIds.filter((id) => id !== action.payload)
          : [...state.selectedIds, action.payload]
      };
    case SELECTED_CLEARED:
      return { ...state, selectedIds: [] };
    case TASK_OPTIMISTIC_UPDATED:
      return upsertTask(state, { ...state.entities[action.payload._id], ...action.payload });
    default:
      return state;
  }
}
