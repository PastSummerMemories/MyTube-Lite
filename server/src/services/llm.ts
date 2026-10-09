import { tools } from "./tools.js";


const apiKey= process.env.OPENAI_API_KEY
const baseUrl = process.env.OPENAI_BASE_URL
const model = process.env.OPENAI_MODEL



async function chatOnce(messages:any[]) {
    const url = `${baseUrl!.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,          // 关键
        stream: false,  // 工具循环先关流式
      }),
    });

    const data = await response.json()
    if(!response.ok)
        throw new Error(data?.error?.message || "调用失败")
    
    return data.choices[0].message

}


// 流式输出
async function chatStream(messages:any[],onDelta?:(text:string) => void) {

  const url = `${baseUrl!.replace(/\/$/, "")}/chat/completions`
  const response = await fetch(url,{
    method:"POST",
    headers:{
        "Content-Type": "application/json",  // 不要 ""
        Authorization: `Bearer ${apiKey}`,   // 不是 Autuorization
    },
    body:JSON.stringify({
      stream:true,
      model:model,
      messages:messages
    })
  })

  if(!response.ok) {
    const errText = await response.text()
    throw new Error(errText || "流式调用失败")
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let full = ""

  while(true) {
    const {done,value} = await reader.read()
    if(done)
      break
    buffer += decoder.decode(value,{stream:true})
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for(const line of lines) {
      const trimmed = line.trim()
      if(!trimmed || trimmed.startsWith(":"))  //心跳或者空行直接跳过
          continue
      if(!trimmed.startsWith("data:"))
         continue
      
      const data = trimmed.slice(5).trim()
      if(data === "[DONE]")
        continue

      try{

        const json= JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if(delta) {
          full += delta
          onDelta?.(delta)
        }

      } catch(error) {
        console.error('err occured:',error)
      }
    }

  }

  return full
}

export {
  chatOnce,
  chatStream
}