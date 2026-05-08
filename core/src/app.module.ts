import { Module } from '@nestjs/common';
import { StateModule } from './state/state.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './chat/chat.module';
import { ChatMessageEntity } from './chat/entities/chat-message.entity';
import { WindowStateEntity } from './chat/entities/window-state.entity';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { HttpModule } from '@nestjs/axios';
import { ChatConfigEntity } from './chat/entities/chat-config.entity';

@Module({
    imports: [
        HttpModule,
        StateModule,
        ChatModule,
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'static'),
        }),
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'data/chat.sqlite',
            entities: [ChatConfigEntity, ChatMessageEntity, WindowStateEntity],
            synchronize: true,
        }),
        TypeOrmModule.forRoot({
            name: 'apps',
            type: 'sqlite',
            database: 'data/apps.sqlite',
            entities: [],
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
