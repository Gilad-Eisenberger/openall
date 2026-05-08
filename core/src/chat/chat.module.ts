import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { StateModule } from '../state/state.module';
import { WindowStateEntity } from './entities/window-state.entity';
import { ChatConfigEntity } from './entities/chat-config.entity';
import { ChatService } from './chat.service';

@Module({
    imports: [
        StateModule,
        TypeOrmModule.forFeature([ChatConfigEntity, ChatMessageEntity, WindowStateEntity]),
    ],
    providers: [ChatService, ChatGateway],
})
export class ChatModule { }