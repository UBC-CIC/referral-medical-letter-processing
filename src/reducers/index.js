import { combineReducers } from "redux";
import applicationStateReducer from "./applicationStateReducer";
import notificationReducer from "./notificationReducer";
import loginReducer from "./loginReducer";



export default combineReducers({
    appState: applicationStateReducer,
    notifications: notificationReducer,
    loginState: loginReducer,
});