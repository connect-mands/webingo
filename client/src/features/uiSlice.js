const SHOW_TOAST = "ui/showToast";
const CLEAR_TOAST = "ui/clearToast";

const initialState = { toast: null };

export const showToast = (message) => ({ type: SHOW_TOAST, payload: message });
export const clearToast = () => ({ type: CLEAR_TOAST });

export default function uiReducer(state = initialState, action) {
  switch (action.type) {
    case SHOW_TOAST:
      return { ...state, toast: action.payload };
    case CLEAR_TOAST:
      return { ...state, toast: null };
    default:
      return state;
  }
}
