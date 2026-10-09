import { configureStore } from '@reduxjs/toolkit';
import sideBarSlice from './sideBarSlice';
import userSlice from "./userSlice"
import loadingStoreSlice from "./loadingStore"

export const store = configureStore({
  reducer: {
    sideBar: sideBarSlice,
    user:userSlice,
    loadingStore:loadingStoreSlice
    // 以后可以加更多模块：user: userReducer, ...
  }
});