import { InjectRepository } from '@nestjs/typeorm';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { WebSocket } from 'ws';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { WindowStateEntity } from './entities/window-state.entity';
import { ChatConfigEntity } from './entities/chat-config.entity';
import { ChatService, Client } from './chat.service';
import * as keytar from 'keytar';

@WebSocketGateway({ path: '/api/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

    constructor(
        @InjectRepository(ChatConfigEntity) private readonly chatConfigRepo: Repository<ChatConfigEntity>,
        @InjectRepository(ChatMessageEntity) private readonly chatHistoryRepo: Repository<ChatMessageEntity>,
        @InjectRepository(WindowStateEntity) private readonly windowStateRepo: Repository<WindowStateEntity>,
        private chatService: ChatService,
    ) {
    }

    private clients: Client[] = [];

    private conversationId = 'jmcuc';

    async handleConnection(client: WebSocket) {
        console.log('client connected');

        console.log(client.protocol);

        const existingConfig = await this.chatConfigRepo.findOne({
            where: {
                id: 0,
            }
        });

        if (!existingConfig) {
            client.send(JSON.stringify({ event: 'showConfig', data: {} }));
        } else {
            this.initializeState(client);
        }

        return;
    }

    async initializeState(client: WebSocket) {
        const prompts = await this.chatService.getPrompts();
        client.send(JSON.stringify({ event: 'settings', data: { prompts, } }));

        const history = await this.chatService.getChatHistory();
        for (let item of history) {
            client.send(JSON.stringify({ event: 'message', data: { content: item.content, from: item.user === null ? 'James' : item.user, } }));
        }

        let windows = await this.windowStateRepo.find({
            where: { conversationId: this.conversationId, },
        });

        for (let window of windows) {
            client.send(JSON.stringify({ event: 'ui', data: { id: window.id, content: window.content, title: window.title, } }));
        }

        this.clients.push(client);
    }

    handleDisconnect(client: WebSocket) {
        this.clients = this.clients.filter(c => c !== client);
    }

    @SubscribeMessage('config')
    async handleConfig(@MessageBody() data: { provider: string, apiKey: string }, @ConnectedSocket() client: WebSocket) {
        if (data.apiKey) {
            await keytar.setPassword('openall', data.provider, data.apiKey);
        }
        const existingConfig = await this.chatConfigRepo.findOne({ where: { id: 0, }, });
        if (existingConfig) {
            existingConfig.provider = data.provider;
            await this.chatConfigRepo.save(existingConfig);
        } else {
            const newConfig = this.chatConfigRepo.create({ id: 0, provider: data.provider, });
            await this.chatConfigRepo.save(newConfig);
        }
        if (!this.clients.includes(client)) {
            await this.initializeState(client);
        }
    }

    @SubscribeMessage('doAction')
    async handleAction(@MessageBody() data: { activeWindowId: number, inputs: { [key: string]: string }, args: any[], }) {
        console.log(data);
        const windowContent = await this.chatService.getWindowContent(data.activeWindowId);

        console.log(windowContent?.length);

        const history = await this.chatService.getChatHistory();

        let messages = history.map(h => ({ role: h.user ? 'user' : 'assistant', content: h.content, }));
        messages.push({
            role: 'user', content: `The user has performed an action using doAction() with the following args. You'll need to decide what to do. Most likely you'll update the
            currently active window but not necessarily. The active window has ID ${data.activeWindowId} and its current HTML content is ${windowContent}. The user performed an action with
            payload ${JSON.stringify(data.args)}. The current form inputs for the window (their current state is): ${JSON.stringify(data.inputs)}. Always ground your answers in real data from the database. If a table doesn't exist you may need to create it.`,
        })

        for (let i = 0; i < 10; ++i) {
            const response = await this.chatService.runAi(messages);

            if (response && response.tools) {
                console.log('tool call', response.tools);
                for (let toolResponse of response.tools) {
                    await this.chatService.handleToolCall(toolResponse, messages, this.clients);
                }
            } else {
                // const responseItem = { content: response!.content, from: 'James' };
                // history.push(this.chatHistoryRepo.create({ content: responseItem.content, user: undefined, }));
                // const agentMessage = this.chatHistoryRepo.create({ content: responseItem.content, user: undefined, conversationId: this.conversationId, });
                // await this.chatHistoryRepo.save(agentMessage);
                // this.clients.forEach(c => c.send(JSON.stringify({ event: 'message', data: responseItem })));

                console.log(response!.content);
                break;
            }
        }
    }

    @SubscribeMessage('chat')
    async handleEvent(@MessageBody() data: string) {
        console.log(data);

        const userMessage = this.chatHistoryRepo.create({ content: data, conversationId: this.conversationId, user: 'You', });
        await this.chatHistoryRepo.save(userMessage);
        this.clients.forEach(c => c.send(JSON.stringify({ event: 'message', data: { content: data, from: 'You' } })));
        this.clients.forEach(c => c.send(JSON.stringify({ event: 'typing', data: ['James'], })));

        const history = await this.chatService.getChatHistory();

        let messages = history.map(h => ({ role: h.user ? 'user' : 'assistant', content: h.content, }));

        for (let i = 0; i < 10; ++i) {
            const response = await this.chatService.runAi(messages);

            if (response && response.tools) {
                for (let toolResponse of response.tools) {
                    await this.chatService.handleToolCall(toolResponse, messages, this.clients);
                }
            } else {
                const responseItem = { content: response!.content, from: 'James' };
                history.push(this.chatHistoryRepo.create({ content: responseItem.content, user: undefined, }));
                const agentMessage = this.chatHistoryRepo.create({ content: responseItem.content, user: undefined, conversationId: this.conversationId, });
                await this.chatHistoryRepo.save(agentMessage);
                this.clients.forEach(c => c.send(JSON.stringify({ event: 'message', data: responseItem })));

                break;
            }
        }
    }
}
