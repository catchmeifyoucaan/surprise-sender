import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CapturedSession } from './CapturedSession';

@Entity()
export class ProxyLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    sessionId: string;

    @ManyToOne(() => CapturedSession)
    @JoinColumn({ name: 'sessionId' })
    session: CapturedSession;

    @Column()
    method: string;

    @Column()
    url: string;

    @Column({ type: 'simple-json' })
    requestHeaders: any;

    @Column({ type: 'text', nullable: true })
    requestBody?: string;

    @Column()
    responseStatusCode: number;

    @Column({ type: 'simple-json' })
    responseHeaders: any;

    @Column({ type: 'text', nullable: true })
    responseBody?: string;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;
}
