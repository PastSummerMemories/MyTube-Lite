import { createSlice } from '@reduxjs/toolkit';

const sideBarSlice = createSlice({
  name: 'sideBar', // 模块名（action type 前缀）
  initialState: {  // 初始状态
    showBar: true
  },
  reducers: {
    //修改显示和隐藏
    changeShow: (state) => {
      const beforeValue = state.showBar
      state.showBar = !beforeValue
    },

  }
});

// 导出 action（组件里 dispatch 用）
export const { changeShow } = sideBarSlice.actions;

// 导出 reducer（给 store 用）
export default sideBarSlice.reducer;