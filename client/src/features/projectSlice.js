import { api } from "../services/api";

const PROJECTS_LOADED = "projects/loaded";
const PROJECT_CREATED = "projects/created";
const PROJECT_DETAILS_LOADED = "projects/detailsLoaded";

const initialState = { items: [], current: null, members: [], activity: [], status: "idle" };

export const fetchProjects = () => async (dispatch) => {
  const { data } = await api.get("/projects");
  dispatch({ type: PROJECTS_LOADED, payload: data });
  return { payload: data };
};

export const createProject = (payload) => async (dispatch) => {
  const { data } = await api.post("/projects", payload);
  dispatch({ type: PROJECT_CREATED, payload: data });
  return { payload: data };
};

export const fetchProjectDetails = (projectId) => async (dispatch) => {
  const { data } = await api.get(`/projects/${projectId}`);
  dispatch({ type: PROJECT_DETAILS_LOADED, payload: data });
  return { payload: data };
};

export default function projectReducer(state = initialState, action) {
  switch (action.type) {
    case PROJECTS_LOADED:
      return { ...state, items: action.payload.map((item) => item.project || item) };
    case PROJECT_CREATED:
      return { ...state, items: [action.payload, ...state.items] };
    case PROJECT_DETAILS_LOADED:
      return {
        ...state,
        current: action.payload.project,
        members: action.payload.members,
        activity: action.payload.activity
      };
    default:
      return state;
  }
}
