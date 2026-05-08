import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class ChatConfigEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    provider: string;

    @CreateDateColumn()
    createdAt: Date;
}