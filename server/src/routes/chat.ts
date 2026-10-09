import express from "express"
import type { Request,Response,NextFunction } from "express"
import { chatBodySchema,createConversationSchema } from "../schema/chat.js"
import { chatOnce } from "../services/llm.js"
import { runTool } from "../services/tools.js"
import pool from "../config/db.js"

const chatRouter = express.Router()

const apiKey= process.env.OPENAI_API_KEY
const baseUrl = process.env.OPENAI_BASE_URL
const model = process.env.OPENAI_MODEL


chatRouter.post('/chat',async (req:Request,res:Response,next:NextFunction) => {

    
    if(!apiKey) {
        
        res.status(500).json({
            message:'未配置OPENAI_API_KEY，请在配置API密钥后重新尝试'
        })
    }


    if(!baseUrl) {
        
        res.status(500).json({
            message:'未配置OPENAI_BASE_URL，请在配置API密钥后重新尝试'
        })
    }


    if(!model) {
        
        res.status(500).json({
            message:'未配置OPENAI_MODEL，请在配置API密钥后重新尝试'
        })
    }


    try {
        
        const parsed = chatBodySchema.safeParse(req.body)

        if(!parsed.success) {
            return res.status(400).json({
                message:"请求体不合法",
                issues:parsed.error.issues
            })
        }

        const {messages,conversationId} = parsed.data

        res.setHeader("Content-Type","text/event-stream")   //响应正文是Server-Sent Events,按照流式协议进行解析
        res.setHeader("Cache-Control","no-cache")      //禁止中间层/浏览器把这段响应缓存起来，避免拿到旧片段中
        res.setHeader("Connection","keep-alive")      //尽量保持长连接，方便服务端持续write


        const url = `${baseUrl!.replace(/\/$/,"")}/chat/completions`

        const response = await fetch(url, {
            method:"POST",
            headers:{
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,        
            },
            body:JSON.stringify({
                model,
                messages,
                stream:true
            })
        })

        // 此时response.body变成可读流，使用reader去读数据
        const reader = response.body!.getReader()   
        const decoder = new TextDecoder()   //使用decoder将二进制Unit8Array转成字符串

        while(true) {
            const {done,value} = await reader.read()
            if(done) break   //读完了就终止循环
            res.write(decoder.decode(value,{stream:true})) //往结果里面写数据
        }

        res.end()

        // if(!response.ok) {
        //     return res.status(response.status).json({
        //         message:data?.error?.message || "调用模型失败"
        //     })
        // }

        // const content = data?.choices?.[0]?.message?.content ?? ""
        // return res.json({
        //     content
        // })

    } catch(error) {

        console.error("chat error:", error)
        return res.status(500).json({
          message: error?.message || "服务器错误",
        })

    }



})



chatRouter.post('/agent',async (req:Request,res:Response,next:NextFunction) => {

    
    if(!apiKey) {
        
        res.status(500).json({
            message:'未配置OPENAI_API_KEY，请在配置API密钥后重新尝试'
        })
    }


    if(!baseUrl) {
        
        res.status(500).json({
            message:'未配置OPENAI_BASE_URL，请在配置API密钥后重新尝试'
        })
    }


    if(!model) {
        
        res.status(500).json({
            message:'未配置OPENAI_MODEL，请在配置API密钥后重新尝试'
        })
    }



    try {
        
        const parsed = chatBodySchema.safeParse(req.body)

        if(!parsed.success) {
            return res.status(400).json({
                message:"请求体不合法",
                issues:parsed.error.issues
            })
        }

        const {messages,conversationId} = parsed.data

        if(conversationId) {
            const [rows] = await pool.query(`
            SELECT id FROM agent_conversations WHERE id = ?
                `,[conversationId])
            
            if(!rows.length) {
                return res.status(404).json({
                    message:"未能找到指定id的对话"
                })
            }
        }


        const llmMessages:any[] = [
            {
                role:"system",
                content: `你是站内视频助手。
                - 查有哪些分区：调用 list_categories
                - 搜视频：调用 search_videos
                - 用户提到「某某分区/分类」时：先 list_categories，再把对应 id 作为 category_id 传给 search_videos，不要猜 id
                - 禁止编造视频或分区
                - 介绍某条视频的详情：id 来自 search_videos，再调用 get_video_detail；没有 id 就先搜，禁止猜 id
                - 标题、播放量、点赞、时长必须逐字使用最近一次工具返回的 JSON；没有的字段写「未查询到」，禁止估算或编造
                `
            },
            ...parsed.data.messages   
        ]


        const writeEvent = (payload:object) => {
            res.write(`data: ${JSON.stringify(payload)}\n\n`)
        }
        


        res.setHeader("Content-Type","text/event-stream")
        res.setHeader("Cache-Control","no-cache")
        res.setHeader("Connection","keep-alive")
        res.flushHeaders?.()


        // 工具循环
        for(let i = 0; i < 5; i++) {

            const msg = await chatOnce(llmMessages)
            const calls = msg.tool_calls

            if(!calls?.length) {
                const full = String(msg.content || "")
                if (full) {
                    writeEvent({ type: "delta", content: full })
                }


                const lastUser = [...messages].reverse().find((m) => m.role === "user");
                if (conversationId && lastUser) {



                  await pool.query(
                    `INSERT INTO agent_messages (conversation_id, role, content)
                     VALUES (?, 'user', ?)`,
                    [conversationId, lastUser.content]
                  );
                  await pool.query(
                    `INSERT INTO agent_messages (conversation_id, role, content)
                     VALUES (?, 'assistant', ?)`,
                    [conversationId, full ?? ""]
                  );

                  // 首条用户消息：把默认标题换成摘要，方便侧边栏识别
                  const [titleRows] = await pool.query(
                    `SELECT title FROM agent_conversations WHERE id = ?`,
                    [conversationId]
                  );
                  const currentTitle = String(titleRows?.[0]?.title || "");
                  const isDefaultTitle =
                    !currentTitle ||
                    currentTitle === "新对话" ||
                    currentTitle === "工具 Agent 对话";
                  if (isDefaultTitle) {
                    const nextTitle = String(lastUser.content || "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 40);
                    await pool.query(
                      `UPDATE agent_conversations
                       SET title = ?, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = ?`,
                      [nextTitle || "新对话", conversationId]
                    );
                  } else {
                    await pool.query(
                      `UPDATE agent_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                      [conversationId]
                    );
                  }
                }

                writeEvent({
                    type:"done",
                    conversationId:conversationId ?? null
                })

                res.end()
                return
            }


            llmMessages.push(msg)

            for (const call of calls) {
                writeEvent({
                  type: "tool_start",
                  id: call.id,
                  name: call.function?.name || "unknown",
                  args: call.function?.arguments || "{}",
                });
                const result = await runTool(
                  call.function.name,
                  call.function.arguments
                );
                let preview = result;
                try {
                  preview = JSON.stringify(JSON.parse(result), null, 2);
                } catch {
                  // 保持原字符串
                }
                if (preview.length > 2000) {
                  preview = preview.slice(0, 2000) + "\n…(截断)";
                }
                writeEvent({
                  type: "tool_result",
                  id: call.id,
                  name: call.function?.name || "unknown",
                  args: call.function?.arguments || "{}",
                  result: preview,
                });
                llmMessages.push({
                  role: "tool",
                  tool_call_id: call.id,
                  content: result,
                });
            }
        }


        writeEvent({
            type:"error",
            content:"工具调用轮次过多"
        })

        res.end()
        return

    } catch(error) {

        console.error("chat error:", error)
        return res.status(500).json({
          message: error?.message || "服务器错误",
        })

    }



})



// 会话列表（按最近更新）
chatRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const [rows] = await pool.query(
      `SELECT
        id,
        user_id AS userId,
        title,
        created_at AS createTime,
        updated_at AS updateTime
       FROM agent_conversations
       ORDER BY updated_at DESC
       LIMIT ?`,
      [limit]
    );
    return res.json({ conversations: rows });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "获取会话列表失败",
    });
  }
});

// 新建会话，返回会话的id
chatRouter.post("/conversations",async (req:Request,res:Response,next:NextFunction) => {

    try{

        const parsed = createConversationSchema.safeParse(req.body)

        if(!parsed.success) {
            return res.status(400).json({
                message:"请求体非法，请重试",
                issues:parsed.error.issues
                
            })
        }
    
        const id = crypto.randomUUID()
        const title = parsed.data.title ?? '新对话'
        const userId = req.user?.id ?? null

        await pool.query(`INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)`,[id,userId,title])
        const [rows] = await pool.query(`SELECT id,user_id userId, title,created_at createTime,updated_at updateTime FROM agent_conversations WHERE id = ?`,[id])

        return res.status(201).json(rows[0])

    } catch(error) {
        return res.status(500).json({
            message:error?.message || "创建会话失败"
        })
    } 

})




// 获取会话历史
chatRouter.get('/conversations/:id/messages',async (req:Request,res:Response,next:NextFunction) => {

    try{
        const conversationId = String(req.params.id || "").trim()

        if(!conversationId) {
            return res.status(400).json({
                message:"缺少会话id"
            })
        }

        const [convs] = await pool.query(`SELECT id,title,created_at AS createTime,updated_at as updateTime FROM agent_conversations WHERE id = ?`,[conversationId])

        if(!convs.length) {
            return res.status(404).json({
                message:"会话不存在"
            })
        }

        const [messages] = await pool.query(`SELECT
            id,
            role,
            content,
            tool_calls AS toolCalls,
            tool_call_id AS toolCallId,
            created_at AS createTime
            FROM agent_messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            `,[conversationId])

        return res.json({
            conversation:convs[0],
            messages
        })

    } catch(error) {

        return res.status(500).json({
            message:error?.message || "获取会话失败"
        })
    }


})



// 删除某一个对话
chatRouter.delete("/conversations/:id", async(req:Request,res:Response) => {
    try{
        const id = String(req.params.id || "").trim()
        if(!id)
            return res.status(400).json({message:"缺少会话id"})

        const [result]:any = await pool.query(`DELETE FROM agent_conversations WHERE id = ?`,[id])

        if(!result?.affectedRows) {
            return res.status(404).json({message:"会话不存在"})
        }

        return res.json({
            ok:true,
            id:id
        })
    } catch(err){
        
        return res.status(500).json({
            message:err?.message || "删除会话失败"
        })
    }
})




export default chatRouter