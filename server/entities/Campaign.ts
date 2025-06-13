import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { SmtpConfiguration } from "./SmtpConfiguration";

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column()
    type!: 'Email' | 'SMS' | 'HTML Bulk Email';

    @Column()
    status!: 'Draft' | 'Scheduled' | 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Completed';

    @Column({ type: 'simple-json' })
    content!: {
        subject?: string;
        body: string;
        isHtml?: boolean;
        attachments?: string[];
        template?: string;
    };

    @Column({ type: 'simple-json' })
    recipients!: {
        total: number;
        sent: number;
        failed: number;
        bounced: number;
        opened: number;
        clicked: number;
        list?: string[];
        file?: string;
    };

    @Column({ type: 'simple-json', nullable: true })
    schedule!: {
        startTime?: Date;
        endTime?: Date;
        timezone?: string;
        batchSize?: number;
        delayBetweenBatches?: number;
    };

    @Column({ type: 'simple-json', nullable: true })
    tracking!: {
        opens: number;
        clicks: number;
        bounces: number;
        unsubscribes: number;
        spamReports: number;
        lastActivity?: Date;
    };

    @Column({ type: 'simple-json', nullable: true })
    metadata!: {
        tags?: string[];
        category?: string;
        priority?: number;
        aiGenerated?: boolean;
        customFields?: Record<string, any>;
    };

    @ManyToOne(() => User, user => user.campaigns)
    user!: User;

    @ManyToOne(() => SmtpConfiguration)
    smtpConfig!: SmtpConfiguration;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    constructor() {
        this.status = 'Draft';
        this.content = {
            body: '',
            isHtml: true,
            attachments: []
        };
        this.recipients = {
            total: 0,
            sent: 0,
            failed: 0,
            bounced: 0,
            opened: 0,
            clicked: 0,
            list: []
        };
        this.schedule = {
            timezone: 'UTC',
            batchSize: 100,
            delayBetweenBatches: 60
        };
        this.tracking = {
            opens: 0,
            clicks: 0,
            bounces: 0,
            unsubscribes: 0,
            spamReports: 0
        };
        this.metadata = {
            tags: [],
            priority: 0,
            aiGenerated: false,
            customFields: {}
        };
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
} 