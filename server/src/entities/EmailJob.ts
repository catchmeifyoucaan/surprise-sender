import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EmailData } from '../types';

@Entity()
export class EmailJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'simple-json' })
    emailData: EmailData;

    @Column({ default: 'pending' })
    status: 'pending' | 'processing' | 'sent' | 'failed';

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ type: 'datetime', nullable: true })
    lastAttemptAt: Date;

    @Column({ type: 'text', nullable: true })
    lastError: string;

    @Column({ nullable: true })
    crewId?: string;

    @Column({ type: 'boolean', default: false })
    useContextualEngine: boolean;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}
