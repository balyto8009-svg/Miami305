/**
 * frontend/src/store/slices/trackingSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/trackingSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    tracking: null,
    loading: false,
    error: null,
};

const trackingSlice = createSlice({
    name: 'tracking',
    initialState,
    reducers: {
        setTracking: (state, action) => {
            state.tracking = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setTracking, setLoading, setError } = trackingSlice.actions;
export default trackingSlice.reducer;