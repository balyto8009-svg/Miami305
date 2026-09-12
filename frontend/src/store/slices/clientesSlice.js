/**
 * frontend/src/store/slices/clientesSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/clientesSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    clientes: [],
    loading: false,
    error: null,
};

const clientesSlice = createSlice({
    name: 'clientes',
    initialState,
    reducers: {
        setClientes: (state, action) => {
            state.clientes = action.payload;
        },
        addCliente: (state, action) => {
            state.clientes.push(action.payload);
        },
        deleteCliente: (state, action) => {
            state.clientes = state.clientes.filter(c => c.id !== action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setClientes, addCliente, deleteCliente, setLoading, setError } = clientesSlice.actions;
export default clientesSlice.reducer;