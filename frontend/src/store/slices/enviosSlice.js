/**
 * frontend/src/store/slices/enviosSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/enviosSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    envios: [],
    loading: false,
    error: null,
};

const enviosSlice = createSlice({
    name: 'envios',
    initialState,
    reducers: {
        setEnvios: (state, action) => {
            state.envios = action.payload;
        },
        addEnvio: (state, action) => {
            state.envios.push(action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setEnvios, addEnvio, setLoading, setError } = enviosSlice.actions;
export default enviosSlice.reducer;