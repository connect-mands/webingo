import { api } from "../services/api";
import { disconnectSocket } from "../services/socket";

const initialState = {
  user: null,
  status: "checking",
  error: null
};

const AUTH_REQUEST = "auth/request";
const AUTH_SUCCESS = "auth/success";
const AUTH_FAILURE = "auth/failure";
const AUTH_LOGOUT = "auth/logout";
const AUTH_CHECKED = "auth/checked";

async function authenticate(endpoint, payload, dispatch) {
  dispatch({ type: AUTH_REQUEST });
  try {
    const { data } = await api.post(endpoint, payload);
    dispatch({ type: AUTH_SUCCESS, payload: data.user });
    return { payload: data };
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message || "Authentication failed";
    dispatch({ type: AUTH_FAILURE, error: message });
    return { error: { message } };
  }
}

export const login = (payload) => (dispatch) => authenticate("/auth/login", payload, dispatch);

export const register = (payload) => (dispatch) => authenticate("/auth/register", payload, dispatch);

export const loadCurrentUser = () => async (dispatch) => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const { data } = await api.get("/auth/me");
    dispatch({ type: AUTH_SUCCESS, payload: data.user });
    return { payload: data };
  } catch (_error) {
    dispatch({ type: AUTH_CHECKED });
    return { error: true };
  }
};

export const logout = () => async (dispatch) => {
  await api.post("/auth/logout").catch(() => null);
  disconnectSocket();
  dispatch({ type: AUTH_LOGOUT });
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case AUTH_REQUEST:
      return { ...state, status: "loading", error: null };
    case AUTH_SUCCESS:
      return { ...state, status: "idle", user: action.payload, error: null };
    case AUTH_FAILURE:
      return { ...state, status: "failed", error: action.error };
    case AUTH_CHECKED:
      return { ...state, status: "idle", user: null, error: null };
    case AUTH_LOGOUT:
      return { user: null, status: "idle", error: null };
    default:
      return state;
  }
}
