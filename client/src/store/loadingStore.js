import { createSlice } from '@reduxjs/toolkit';

const loadingStoreSlice = createSlice({
  name: 'loadingStore', // 模块名（action type 前缀）
  initialState: {  // 初始状态
    pendingCount:0
  },
  reducers: {
    // RTK 第二参是 action，数值在 action.payload
    changePendingCount: (state, action) => {
      const next = state.pendingCount + action.payload
      state.pendingCount = next < 0 ? 0 : next
    },
  }
});

// 导出 action（组件里 dispatch 用）
export const { changePendingCount } = loadingStoreSlice.actions;

// 导出 reducer（给 store 用）
export default loadingStoreSlice.reducer;