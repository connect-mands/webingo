import { applyMiddleware, combineReducers, legacy_createStore as createStore } from "redux";
import authReducer from "../features/authSlice";
import projectReducer from "../features/projectSlice";
import taskReducer from "../features/taskSlice";
import uiReducer from "../features/uiSlice";

const thunkMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  if (typeof action === "function") {
    return action(dispatch, getState);
  }
  return next(action);
};

const rootReducer = combineReducers({
    auth: authReducer,
    projects: projectReducer,
    tasks: taskReducer,
    ui: uiReducer
});

export const store = createStore(rootReducer, applyMiddleware(thunkMiddleware));
