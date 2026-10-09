// agent使用的工具, function Calling
import { listCategories, searchVideos } from "./videoSearch.js";
import pool from "../config/db.js";

export const tools = [
    {
        type:"function",
        function:{
            name:"search_videos",
            description:"在站内搜索视频，根据关键词返回标题，播放量等",
            parameters:{
                type:"object",
                properties:{
                    q:{type:"string",description:"搜索关键词,若只按分区浏览，可以传递空字符串"},
                    limit:{type:"number",description:"最多返回几条，默认5"},
                    category_id:{
                        type:"number",
                        description:"分区ID,必须来自list_categories的返回，不指定则全站搜索"
                    }
                },
                required:["q"]
            }
        }
    },

    {
        type:"function",
        function:{
            name:"list_categories",
            description:"检索站内的视频有哪些分区时，使用该工具",
            parameters:{
                type:"object",
                properties:{
                    
                }
            },
            required:[]
        }
    },


    {
        type:"function",
        function:{
            name:"get_video_detail",
            description:"按视频 id 查询单条详情（简介、时长、点赞等）。id 必须来自 search_videos 的返回，禁止猜测。用户要了解某条视频再调用，只是列表搜索用 search_videos。",
            parameters:{
                type:"object",
                properties:{
                    id:{type:"number",description:"视频 id，来自 search_videos 返回的 videos[].id"}
                },
                required:["id"]
            }
        }
    },



    
    
]




export async function runTool(name:string,argsJson:string) {

    const args = JSON.parse(argsJson || "{}")

    if(name === "search_videos") {
        const result = await searchVideos({
            q:args.q,
            limit:args.limit ?? 5,
            category_id:args.category_id
        })

        // 只把模型需要的摘要筛回去
        return JSON.stringify({
            total:result.totalVideos,
            videos:(result.videos || []).slice(0,8).map((v:any) => ({
                id:v.id,
                title:v.title,
                views:v.views,
                channel:v.channel,
            }))
        })
    }

    if(name === "list_categories") {
        const result = await listCategories()
        return JSON.stringify(result)
    }

    if (name === "get_video_detail") {
        const id = Number(args.id);
        if (!Number.isFinite(id)) {
          return JSON.stringify({ error: "缺少有效的视频 id" });
        }
      
        const [rows]: any = await pool.query(
          `SELECT
             v.id, v.title, v.description, v.duration, v.views, v.likes,
             c.name AS channel
           FROM videos v
           JOIN channels c ON v.channel_id = c.id
           WHERE v.id = ?
           LIMIT 1`,
          [id]
        );
      
        if (!rows.length) {
          return JSON.stringify({ error: "视频不存在", id });
        }
      
        const v = rows[0];
        return JSON.stringify({
          id: v.id,
          title: v.title,
          description: String(v.description || "").slice(0, 200),
          duration: v.duration,
          views: v.views,
          likes: v.likes,
          channel: v.channel,
        });
      }



    return JSON.stringify({error: `未知工具:${name}`})
}