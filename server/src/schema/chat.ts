import {z} from "zod"

export const chatMessageSchema = z.object({
    role:z.enum(['system','user','assistant','tool']),
    content:z.string().trim().min(1),
})


export const chatBodySchema = z.object({
    messages:z.array(chatMessageSchema).min(1),
    conversationId:z.string().uuid().optional()
})

export const createConversationSchema = z.object({
    title:z.string().trim().min(1).max(200).optional()
})


export type chatBody = z.infer<typeof chatBodySchema>