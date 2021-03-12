import { API, graphqlOperation } from 'aws-amplify';
import {createStatus, updateStatus} from "../graphql/mutations";
import { getStatus, listStatuss } from '../graphql/queries';



//================================================---ADD NEW PROCESSING STATUS---====================================================

// Add new processing status
export const addProcessingStatus = (payload) => {
    return (dispatch) => {
        dispatch({type: "ADD_PROCESSING_STATUS", payload: payload});
        API.graphql(graphqlOperation(createStatus, {input: payload})).then().catch((err) => {
            console.log("Error creating new processing status: ", err);
        })
    }
}

//==================================================---UPDATE PROCESSING STATUS---=====================================================

// Update processing status
export const updateProcessingStatus = (payload) => {
    return (dispatch) => {
        dispatch({type: "UPDATE_PROCESSING_STATUS", payload: payload});
        API.graphql(graphqlOperation(updateStatus, {input: payload})).then().catch((err) => {
            console.log("Error creating new processing status: ", err);
        })
    }
}

//==================================================---FETCH PROCESSING STATUS---=======================================================

// Fetch processing status
export const fetchStatus = (payload) => {
    return (dispatch) => {
        API.graphql(graphqlOperation(getStatus, {id: payload.id})).then((response) => {
            const status = response.data.getStatus;
            dispatch(fetchStatusSuccess(status));
        }).catch((err) => {
            console.log("Error fetching status: ", err);
        })
    }
}

// Respond to success condition
export const fetchStatusSuccess = (payload) => {
    return (dispatch) => {
        dispatch({ type: "FETCH_STATUS_SUCCESS", payload});
    }
}

//======================================================---FETCH ALL Items---=================================================================


// Fetch all items
export const fetchAllItems = (payload) => {
    return (dispatch) => {
        API.graphql(graphqlOperation(listStatuss)).then((response) => {
            const items = response.data.listStatuss;
            console.log("items", items);
            //dispatch(fetchItemsSuccess(status));
        }).catch((err) => {
            console.log("Error fetching items: ", err);
        })
    }
}

// Respond to success condition
export const fetchItemsSuccess = (payload) => {
    return (dispatch) => {
        dispatch({ type: "FETCH_STATUS_SUCCESS", payload});
    }
}
