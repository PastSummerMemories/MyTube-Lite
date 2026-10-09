import React, { memo, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  changePassword,
  getUserInfo,
  updateUserProfile,
} from "../../service/APIs";
import {
  changeAvatar,
  changeEmail,
  changeId,
  changeUserName,
  resetUser,
} from "../../store/userSlice";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";
import { softNavigate } from "../../utils/softNavigate";
import styles from "../Account/accountPage.module.scss";

const Settings = memo(() => {
  const dispatch = useDispatch();
  const fileRef = useRef(null);
  const { userName, email, avatar } = useSelector((state) => state.user);

  const [username, setUsername] = useState(userName || "");
  const [emailValue, setEmailValue] = useState(email || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(resolveMediaUrl(avatar));
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getUserInfo();
        if (cancelled || !res?.id) return;
        dispatch(changeUserName(res.username));
        dispatch(changeEmail(res.email));
        dispatch(changeAvatar(res.avatar));
        dispatch(changeId(res.id));
        setUsername(res.username || "");
        setEmailValue(res.email || "");
        setAvatarPreview(resolveMediaUrl(res.avatar));
      } catch (error) {
        if (isRequestCanceled(error) || cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error("请选择 JPG / PNG / WebP 图片");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("头像不能超过 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const nextName = username.trim();
    const nextEmail = emailValue.trim();
    if (!nextName || !nextEmail) {
      toast.error("用户名和邮箱不能为空");
      return;
    }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("username", nextName);
      formData.append("email", nextEmail);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await updateUserProfile(formData);
      const user = res?.user || res;
      if (user?.username) dispatch(changeUserName(user.username));
      if (user?.email) dispatch(changeEmail(user.email));
      if (user?.avatar) {
        dispatch(changeAvatar(user.avatar));
        setAvatarPreview(resolveMediaUrl(user.avatar));
      }
      setAvatarFile(null);
      toast.success("资料已更新");
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(error?.response?.data?.message || error?.message || "更新失败");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("请填写旧密码和新密码");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ oldPassword, newPassword });
      toast.success("密码已修改，请重新登录");
      localStorage.removeItem("token");
      dispatch(resetUser());
      await softNavigate("/Login", { replace: true });
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(error?.response?.data?.message || error?.message || "修改失败");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>设置</h1>
        <p>管理账号资料与登录密码</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>账号资料</h2>
        <p className={styles.sectionDesc}>修改用户名、邮箱或头像后记得保存</p>

        <form onSubmit={handleSaveProfile}>
          <div className={styles.avatarRow}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className={styles.avatarPreview} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(username || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <button
                type="button"
                className={styles.fileBtn}
                onClick={() => fileRef.current?.click()}
              >
                更换头像
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                onChange={handleAvatarPick}
              />
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>用户名</span>
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={40}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>邮箱</span>
            <input
              className={styles.input}
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              maxLength={80}
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={savingProfile}>
              {savingProfile ? "保存中…" : "保存资料"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>修改密码</h2>
        <p className={styles.sectionDesc}>修改成功后需要重新登录</p>

        <form onSubmit={handleChangePassword}>
          <label className={styles.field}>
            <span className={styles.label}>当前密码</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>新密码</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>确认新密码</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={savingPassword}
            >
              {savingPassword ? "提交中…" : "更新密码"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
});

export default Settings;
