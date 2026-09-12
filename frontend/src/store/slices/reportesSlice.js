/**
 * frontend/src/store/slices/reportesSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/reportesSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    reportes: null,
    loading: false,
    error: null,
};

const reportesSlice = createSlice({
    name: 'reportes',
    initialState,
    reducers: {
        setReportes: (state, action) => {
            state.reportes = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setReportes, setLoading, setError } = reportesSlice.actions;
export default reportesSlice.reducer;