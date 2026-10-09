import React, { memo, useState } from "react";
import styles from "./Login.module.scss";
import { LoginAction } from "../../service/APIs";
import { useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  changeAvatar,
  changeEmail,
  changeId,
  changeUserName,
} from "../../store/userSlice";
import ArrowLeft from "../../assets/arrowleft.png";
import { toast } from "sonner";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softNavigate } from "../../utils/softNavigate";

const Login = memo(() => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [goNext, setGoNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const info = (type, msg) => {
    const fn = toast[type.toLowerCase()] || toast.message;
    fn(msg, { position: "top-center" });
  };

  function validateEmail(str) {
    const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return reg.test(str);
  }

  function checkPassword(pwd) {
    const reg = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])[a-zA-Z0-9]{6,18}$/;
    return reg.test(pwd);
  }

  function handleAccount(e) {
    e?.preventDefault?.();
    if (validateEmail(account)) {
      setGoNext(true);
    } else {
      info("info", "账号必须是正确的邮箱形式");
      setAccount("");
    }
  }

  async function handlePassword(e) {
    e?.preventDefault?.();
    if (!checkPassword(password)) {
      info("info", "密码需要6-18位，同时包含数字，大写字母，小写字母。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await LoginAction({ email: account, password });

      localStorage.setItem("token", res.token);
      dispatch(changeAvatar(res?.user?.avatar));
      dispatch(changeUserName(res?.user?.username));
      dispatch(changeEmail(res?.user?.email));
      dispatch(changeId(res?.user?.id));

      if (res.token) {
        const redirect = searchParams.get("redirect");
        const target =
          redirect && redirect.startsWith("/") ? redirect : "/Mine";
        toast.success("登录成功", { position: "top-center" });
        await softNavigate(target, { replace: true });
      }
    } catch (error) {
      if (isRequestCanceled(error)) return;
      toast.error(
        error?.response?.data?.message || error?.message || "登录失败",
        { position: "top-center" }
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setGoNext(false);
    setPassword("");
  }

  return (
    <div className={`${styles.page} pageEnterSoft`}>
      <div className={styles.card}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => softNavigate("/Mine", { replace: true })}
        >
          <img src={ArrowLeft} alt="" />
          返回
        </button>
        <div className={styles.intro}>
          <h1>登录</h1>
          <p>请使用您的账号登录，以便继续前往视频网站。</p>
        </div>

        <div className={styles.formSection}>
          {!goNext ? (
            <form className={styles.form} onSubmit={handleAccount}>
              <label className={styles.field}>
                <span className={styles.label}>邮箱</span>
                <input
                  className={styles.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="请输入您的邮箱"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => softNavigate("/Register")}
              >
                没有账号?
              </button>
              <div className={styles.actions}>
                <button type="submit" className={styles.primaryBtn}>
                  下一步
                </button>
              </div>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handlePassword}>
              <label className={styles.field}>
                <span className={styles.label}>账号</span>
                <div className={styles.readonly}>{account}</div>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>密码</span>
                <input
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入您的密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </label>
              <button type="button" className={styles.linkBtn}>
                忘记了密码?
              </button>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleBack}
                >
                  返回
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={submitting}
                >
                  {submitting ? "登录中…" : "登录"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

export default Login;
