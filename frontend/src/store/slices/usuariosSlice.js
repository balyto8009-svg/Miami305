/**
 * frontend/src/store/slices/usuariosSlice.js
 * Ubicación: Miami305/frontend/src/store/slices/usuariosSlice.js
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    usuarios: [],
    loading: false,
    error: null,
};

const usuariosSlice = createSlice({
    name: 'usuarios',
    initialState,
    reducers: {
        setUsuarios: (state, action) => {
            state.usuarios = action.payload;
        },
        addUsuario: (state, action) => {
            state.usuarios.push(action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setUsuarios, addUsuario, setLoading, setError } = usuariosSlice.actions;
export default usuariosSlice.reducer;