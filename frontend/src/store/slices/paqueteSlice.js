/**
 * frontend/src/store/slices/paqueteSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/paqueteSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    paquetes: [],
    loading: false,
    error: null,
};

const paqueteSlice = createSlice({
    name: 'paquetes',
    initialState,
    reducers: {
        setPaquetes: (state, action) => {
            state.paquetes = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setPaquetes, setLoading, setError } = paqueteSlice.actions;
export default paqueteSlice.reducer;