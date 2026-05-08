import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WindowStateEntity } from "./entities/window-state.entity";
import { ChatMessageEntity } from "./entities/chat-message.entity";
import { ChatConfigEntity } from "./entities/chat-config.entity";
import { Repository } from "typeorm";
import { DatabaseService } from "../state/database.service";
import * as keytar from 'keytar';

export type Client = {
    send: (s: string) => void;
}

const openHtmlViewTool = {
    type: "function",
    function: {
        name: "attach_artifact",
        description: "Attach a structured view using HTML content.",
        parameters: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "The title for the window being shown. This should be short text, 2-4 words. I.e. 'CRM Contacts' or 'Edit Jim Monroe', etc."
                },
                windowId: {
                    type: "number",
                    description: "The window ID to display the content from the existing open windows, or 0 to create a new window.",
                },
                content: {
                    type: "string",
                    description: "The HTML content for the view to be shown. Should be a <div> tag. Use tailwindcss for styling. The background is already set to gray-100 and padding is applied in the parent. You don't need to set this for the content. Do not wrap in `. Call global js function doAction() with parameters describing what should be done to perform actions in handlers (buttons, etc)."
                },
            },
            required: ["content"]
        }
    }
};

const queryDatabase = {
    type: "function",
    function: {
        name: "query_db",
        description: "Run a query on the sqlite DB.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The sqlite query to run on the db. Could be to list all tables, get their schema, etc. Any SQLite query."
                },
            },
            required: ["query"]
        }
    }
};

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatConfigEntity) private readonly chatConfigRepo: Repository<ChatConfigEntity>,
        @InjectRepository(ChatMessageEntity) private readonly chatHistoryRepo: Repository<ChatMessageEntity>,
        @InjectRepository(WindowStateEntity) private readonly windowStateRepo: Repository<WindowStateEntity>,
        private databaseService: DatabaseService,
    ) {
    }

    private conversationId = 'jmcuc';

    private prompts = {
        chatPrompt: 'You are a helpful assistant. For example, if the user requests to add a user to its contact list, you might show (using the tool) a contact card from a CRM system that\'s editable with the content he already provided. Use the content tool to show HTML do not output it directly. The html you display with the content tool can be interactive to allow the user shortcuts to perform actions on entities listed etc.',
        uiActionPrompt: `The user has performed an action using doAction() with the following args. You'll need to decide what to do. Most likely you'll update the
            currently active window but not necessarily. The active window has ID %ACTIVEWINDOWID% and its current HTML content is %WINDOWCONTENT%. The user performed an action with
            payload %DATAPAYLOAD%. The current form inputs for the window (their current state is): %FORMINPUTS%. Always ground your answers in real data from the database. If a table doesn't exist you may need to create it.`
    }

    async getPrompts() {
        return this.prompts;
    }

    async loadApiKey() {
        return process.env.OPENROUTER_API_KEY || await keytar.getPassword('openall', 'openrouter');
    }

    async runAi(messages: { content: string, role: string, }[]) {
        const activeWindows = await this.getWindowsSummary();

        // console.log(messages, messages.length);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ` + await this.loadApiKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-5.4-nano",
                messages: [
                    { role: "system", content: this.prompts.chatPrompt, },
                    {
                        role: "system", content: 'currently open windows: ' + JSON.stringify(activeWindows.map(w => ({ id: w.id, title: w.title, })))
                    },
                    ...messages,
                    // { role: "user", content: prompt }
                ],
                tools: [
                    openHtmlViewTool,
                    queryDatabase,
                ],
                tool_choice: "auto"
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        console.log(data)
        const message = data.choices[0].message;
        messages.push(message);
        if (data.choices[0].finish_reason === 'stop') {
            console.log(message);
            return { content: message.content, };
        } else if (data.choices[0].finish_reason === 'tool_calls') {
            console.log(message.tool_calls);

            const toolResults: any[] = [];

            for (let toolCall of message.tool_calls) {

                if (toolCall.function.name === openHtmlViewTool.function.name) {
                    const attachmentJSON = toolCall.function.arguments;
                    const attachment = JSON.parse(attachmentJSON);
                    toolResults.push({ attachment: `\`${attachment.content}\``, title: attachment.title, windowId: attachment.windowId, callId: toolCall.id });
                }

                if (toolCall.function.name === queryDatabase.function.name) {
                    const parametersJSON = toolCall.function.arguments;
                    const parameters = JSON.parse(parametersJSON);
                    toolResults.push({ query: parameters.query, callId: toolCall.id });
                }
            }

            return { tools: toolResults };
        }
    }


    async getWindowContent(windowId: number,) {
        const window = await this.windowStateRepo.findOne({ where: { id: windowId, } });
        return window?.content;
    }

    async getWindowsSummary() {
        const windowsSummary = await this.windowStateRepo.find({ where: { conversationId: this.conversationId, }, select: { title: true, id: true, } });

        return windowsSummary;
    }

    async handleToolCall(toolResponse: any, messages: any[], clients: Client[]) {
        if (toolResponse.command || toolResponse.query) {

            clients.forEach(c => c.send(JSON.stringify({ event: 'log', data: { content: toolResponse.query }, })));
            try {
                let result;
                if (toolResponse.query) {
                    result = await this.databaseService.query(toolResponse.query);
                }

                const newMessage = {
                    role: "tool",
                    tool_call_id: toolResponse.callId,
                    content: JSON.stringify(result || 'no output'),
                };

                console.log(newMessage, toolResponse.command || toolResponse.query, result);

                messages.push(newMessage);
            } catch (e: any) {
                const newMessage = {
                    role: "tool",
                    tool_call_id: toolResponse.callId,
                    content: JSON.stringify(e.message || e),
                };

                messages.push(newMessage);
            }
        } else {
            if (typeof toolResponse.windowId === 'number' && toolResponse.windowId > 0) {
                const existingWindow = await this.windowStateRepo.findOne({ where: { id: Number(toolResponse.windowId), } });

                if (!existingWindow) {
                    // ???
                    throw new Error('invalid window Id');
                }

                existingWindow.content = toolResponse.attachment;
                existingWindow.title = toolResponse.title;

                await this.windowStateRepo.save(existingWindow);
                clients.forEach(c => c.send(JSON.stringify({ event: 'ui', data: { content: toolResponse.attachment, title: toolResponse.title, id: existingWindow.id, } })));
            } else {
                const newWindow = this.windowStateRepo.create({ content: toolResponse.attachment, title: toolResponse.title, conversationId: this.conversationId, });
                await this.windowStateRepo.save(newWindow);

                // const agentMessage = this.chatHistoryRepo.create({ content: toolResponse.attachment, user: undefined, conversationId: this.conversationId, });
                // await this.chatHistoryRepo.save(agentMessage);

                clients.forEach(c => c.send(JSON.stringify({ event: 'ui', data: { content: toolResponse.attachment, title: toolResponse.title, id: newWindow.id, } })));

            }
            const newMessage = {
                role: "tool",
                tool_call_id: toolResponse.callId,
                content: "success. The UI has been displayed to the user. No need to return it again.",
            };

            messages.push(newMessage);
        }
    }

    async getChatHistory() {
        let history = await this.chatHistoryRepo.find({
            where: { conversationId: this.conversationId, },
            select: { content: true, user: true, createdAt: true, },
            order: { createdAt: 'DESC', },
            take: 30,
        });

        history = history.reverse();

        return history;
    }
}