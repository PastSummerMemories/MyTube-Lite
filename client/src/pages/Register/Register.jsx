import React, { memo, useState } from "react";
import styles from "../Register/Register.module.scss";
import {  register } from "../../service/APIs";
import ArrowLeft from "../../assets/arrowleft.png";
import { toast } from "sonner";
import { isRequestCanceled } from "../../utils/isRequestCanceled";
import { softNavigate } from "../../utils/softNavigate";


const Register = memo(() => {
    const [account, setAccount] = useState("");
    const [password, setPassword] = useState("");
    const [goNext, setGoNext] = useState(false);
    const [username, setUsername] = useState("");

    const info = (type, msg) => {
        toast[type](msg,{position:'top-center'})
    };


    function validateUsername(str) {
        const reg = /^[a-zA-Z0-9]+$/;
        return reg.test(str);
    }

    function validateEmail(str) {
        const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return reg.test(str);
    }

    function checkPassword(pwd) {
        const reg = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])[a-zA-Z0-9]{6,18}$/;
        return reg.test(pwd);
    }

    function handleUsername(e) {
        e?.preventDefault?.();
        if (validateUsername(username)) {
            setGoNext(true);
        } else {
            info("Info", "用户名只能包含字母和数字");
            setUsername("");
        }
    }


    function handleAccount(e) {
        e?.preventDefault?.();
        if (validateEmail(account)) {
            setGoNext(true);
        } else {
            info("Info", "账号必须是正确的邮箱形式");
            setAccount("");
        }
    }

    async function handlePassword(e) {
        e?.preventDefault?.();
        if (!checkPassword(password)) {
            info("Info", "密码需要6-18位，同时包含数字，大写字母，小写字母。");
            return;
        }

        try {
            await register({ email: account, password, username });
            toast.success('账号注册成功，即将跳转至登录页面,请使用您的账号进行登录~')
            setTimeout(() => {
                softNavigate("/Login", { replace: true });
            }, 800);

        } catch (error) {
            if (isRequestCanceled(error)) return;
            toast.error(error?.response?.data?.message || error?.message || '注册失败，请稍后重试', {
                position: 'top-center',
            });
        } finally {

        }
    }

    function handleBack() {
        setGoNext(false);
        setPassword("");
    }

    return (
        <div className={`${styles.page} pageEnterSoft`}>


            <div className={styles.card}>

                <button type="button" className={styles.backBtn} onClick={() => softNavigate("/Mine", { replace: true })}>
                    <img src={ArrowLeft} alt="arrow-left" />
                    返回</button>
                <div className={styles.intro}>
                    <h1>注册</h1>
                    <p>欢迎来到本站点，请填写您的注册信息以完成注册。</p>
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
                            <label className={styles.field}>
                                <span className={styles.label}>用户名</span>
                                <input
                                    className={styles.input}
                                    type="text"
                                    autoComplete="username"
                                    placeholder="请输入您的用户名"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </label>
                            <button type="button" className={styles.linkBtn}>
                                忘记了账号?
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
                                <button type="submit" className={styles.primaryBtn}>
                                    注册
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
});

export default Register;