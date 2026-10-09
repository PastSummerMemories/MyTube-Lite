import React, { memo, useEffect, useRef, useState } from 'react'
import style from "./Agent.module.scss"
import { Bot, MessageSquare, Plus, Send, Sparkles, Trash2, User, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { listToolAgentConversations } from '@/service/APIs'


const Agent = memo(() => {


    const [messages, setMessages] = useState([
        {
            type: "assistant",
            content: "这是 Tool Calling 练习页。我会按需要调用 search_videos / list_categories，再用真实数据回答你。试试下面的示例吧",
            id: 0
        },

        {
            type: "user",
            content: "好啊，告诉我你能做些什么",
            id: 1
        }])

    const [inputValue, setInputValue] = useState("")
    const [recentDialogs, setRecentDialogs] = useState([])
    const [nowDialogId,setNowDialogId] = useState(-1)


    useEffect(() => {

        async function getList() {

            try{
                const result =  await listToolAgentConversations({
                    limit:40
                })
                setRecentDialogs(result?.conversations ?? [])
                
                if(result?.conversations?.length) {
                    setNowDialogId(result.conversations[0].id)
                }

            } catch(error) {
                console.log('error:',error)
                toast.error('获取历史对话列表失败',{position:"top-center"})
                return
            }
        }

        getList()

    },[])


    const bodyRef = useRef(null)


    function handleInputChange(e) {
        console.log('input Value changed:', e.currentTarget.value)
        const nowValue = e.currentTarget.value.trim()
        setInputValue(nowValue)
    }

    function handleKeyDown(e) {

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();

            if (inputValue === '') {
                toast.warning("请输入内容后再发送消息", { position: "top-center" })
                return
            }


            setMessages(prev => [...prev, {
                type: "user",
                content: inputValue,
                id: String(Math.random()) + Date.now()
            },
            {
                type: "assistant",
                content: String(Math.random().toFixed(6)),
                id: String(Math.random()) + Date.now()
            }
            ])

        }

    }


    function openNewDialog() {


        console.log('newDialog:')
    }


    function deleteDialog() {

        console.log("delteDialog")
    }


    function handleDialogClick(id) {

        console.log('dialogId:',id)
        setNowDialogId(id)
    }


    useEffect(() => {

        const bodyEle = bodyRef.current
        if (!bodyEle)
            return
        bodyEle.scrollTo({
            top: bodyEle.scrollHeight,
            behavior: "smooth"
        })

    }, [messages])


    return (
        <div className={style.wrapper}>

            <div className={style.list}>
                <button className={style.openNewBtn} onClick={openNewDialog}>
                    <Plus size={16}></Plus>
                    <span style={{
                        marginLeft: "10px"
                    }}>开启新对话</span>
                </button>

                <div className={style.recentDialogs}>
                    <div className={style.tips}>最近</div>

                    {
                        recentDialogs.map((dialog, index) => {

                            return (
                                <div className = {`${style.outerTab} ${dialog.id === nowDialogId ? style.isActive : ""}`} onClick = {() => handleDialogClick(dialog.id)} key = {dialog.id}>

                                    <div className={style.dialogTab}>


                                        <span className={style.messageIcon}>
                                            <MessageSquare size={15} />
                                        </span>
                                        {dialog.title}
                                    </div>


                                    <span className = {style.deleteIcon} onClick = {() => deleteDialog()}>
                                        <Trash2 size = {13}/>
                                    </span>

                                </div>
                            )
                        })
                    }

                </div>
            </div>

            <header className={style.head}>
                <div className={style.mainTitle}>
                    <span className={style.brandIcon}>
                        <Sparkles size={22}></Sparkles>
                    </span>
                    <h2>智能搜索</h2>
                </div>

                <p className={style.subInfo}>
                    自然语言找视频 · 自动识别分区/时间/排序/Shorts
                </p>

            </header>

            <section className={style.body} ref={bodyRef}>
                {
                    messages.map((item) => {

                        if (item.type === "assistant")
                            return (
                                <div className={style.messageWrapper} key={item.id}>
                                    <div className={style.message}>
                                        <div className={style.messageHeader}>
                                            <Bot size={12} style={{ marginRight: "5px" }} />
                                            助手</div>
                                        <div className={style.messageBody}>{item.id}</div>
                                    </div>
                                </div>)

                        if (item.type === "user")
                            return (<div className={style.userWrap} key={item.id}>
                                <div className={style.userMessage} key={item.content}>
                                    <div className={style.messageHeader}>
                                        <User size={12} style={{ marginRight: "5px" }} />
                                        用户</div>
                                    <div className={style.messageBody}>{item.content}</div>
                                </div>
                            </div>)


                    })
                }


            </section>

            <section className={style.inputArea}>
                <input type="textarea" className={style.inputText} placeholder="问问站内视频或分区···Enter发送，Shift+Enter换行"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                />
                <button className={style.sendButton} disabled={inputValue === ""}>
                    <Send size={18}></Send>
                </button>
            </section>

        </div>
    )
})

export default Agent