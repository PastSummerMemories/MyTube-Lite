import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user', // 模块名（action type 前缀）
  initialState: {  // 初始状态
      userName:"Guest",
      email:'none',
      avatar:"",
      id:-1
  },
  reducers: {
    // 修改用户名
    changeUserName(state,{payload}) {
      state.userName = payload
    },
    
    changeEmail(state,{payload}) {
      state.email = payload
    },

    changeAvatar(state,{payload}) {
      state.avatar = payload
    },

    changeId(state,{payload}) {
      state.id = payload
    },

    resetUser(state) {
      state.userName = "Guest";
      state.email = "none";
      state.avatar = "";
      state.id = -1;
    },
  }
});

// 导出 action（组件里 dispatch 用）
export const { changeAvatar,changeEmail,changeUserName,changeId,resetUser} = userSlice.actions;

// 导出 reducer（给 store 用）
export default userSlice.reducer;