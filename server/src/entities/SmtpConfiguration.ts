import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from './User';

@Entity()
export class SmtpConfiguration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    name: string;

    @Column()
    host: string;

    @Column()
    port: number;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column({ nullable: true })
    secure: boolean;

    @Column()
    isActive: boolean;

    @Column({ type: 'datetime', nullable: true })
    lastChecked: Date;

    @Column({ type: 'datetime', nullable: true })
    lastValidated: Date;

    @Column({ type: 'datetime', nullable: true })
    lastUsed: Date;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;

    @Column()
    maxEmailsPerDay: number;

    @Column()
    currentEmailsSent: number;

    @Column({ default: 'inactive' })
    status: string;

    @Column({ default: 'smtp' })
    providerType: string;

    @Column({ nullable: true })
    webmailProvider?: string;

    @Column({ nullable: true })
    apiProvider?: string;

    @Column({ nullable: true })
    apiKey?: string;

    @Column({ nullable: true })
    region?: string;

    @Column({ nullable: true })
    fromEmail?: string;

    @Column({ nullable: true })
    fromName?: string;

    @Column({ type: 'boolean', default: false })
    isValid: boolean;

    @Column({ type: 'text', nullable: true })
    lastError?: string;

    @Column({ type: 'simple-json', nullable: true })
    security?: {
        ssl: boolean;
        tls: boolean;
        starttls: boolean;
    };

    @Column({ type: 'simple-json', nullable: true })
    stats?: {
        daily: number;
        monthly: number;
        total: number;
    };

    @Column({ type: 'simple-json', nullable: true })
    limits?: {
        daily: number;
        monthly: number;
        concurrent: number;
        maxFileSize: number;
        allowedFileTypes: string[];
    };

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @BeforeInsert()
    @BeforeUpdate()
    validateFields() {
        // Validate status
        const validStatuses = ['active', 'inactive', 'error'];
        if (!validStatuses.includes(this.status)) {
            throw new Error(`Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Validate provider type
        const validProviderTypes = ['smtp', 'webmail', 'api'];
        if (!validProviderTypes.includes(this.providerType)) {
            throw new Error(`Invalid provider type: ${this.providerType}. Must be one of: ${validProviderTypes.join(', ')}`);
        }

        // Validate webmail provider if type is webmail
        if (this.providerType === 'webmail' && !this.webmailProvider) {
            throw new Error('Webmail provider is required when provider type is webmail');
        }

        // Validate API provider if type is api
        if (this.providerType === 'api' && !this.apiProvider) {
            throw new Error('API provider is required when provider type is api');
        }

        // Validate port number
        if (this.port < 1 || this.port > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }

        // Validate max emails per day
        if (this.maxEmailsPerDay < 1) {
            throw new Error('Max emails per day must be greater than 0');
        }

        // Validate current emails sent
        if (this.currentEmailsSent < 0) {
            throw new Error('Current emails sent cannot be negative');
        }
    }

    constructor() {
        this.isActive = false;
        this.secure = true;
        this.status = 'inactive';
        this.providerType = 'smtp';
        this.maxEmailsPerDay = 1000;
        this.currentEmailsSent = 0;
        this.isValid = false;
        this.security = {
            ssl: false,
            tls: false,
            starttls: false
        };
        this.stats = {
            daily: 0,
            monthly: 0,
            total: 0
        };
        this.limits = {
            daily: 100,
            monthly: 1000,
            concurrent: 5,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedFileTypes: ['.txt', '.csv', '.xlsx', '.xls']
        };
    }
} 