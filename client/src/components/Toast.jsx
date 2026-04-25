import { useDispatch, useSelector } from "react-redux";
import { clearToast } from "../features/uiSlice";

export function Toast() {
  const dispatch = useDispatch();
  const toast = useSelector((state) => state.ui.toast);
  if (!toast) return null;
  return (
    <button className="toast" onClick={() => dispatch(clearToast())}>
      {toast}
    </button>
  );
}
