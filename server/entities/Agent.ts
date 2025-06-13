import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity('agents')
export class Agent {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column()
    description!: string;

    @Column({ nullable: true })
    category?: string;

    @Column({ type: 'simple-json' })
    specificFields!: {
        name: string;
        label: string;
        type: 'text' | 'textarea' | 'file';
        placeholder?: string;
        fileAccept?: string;
        allowAIGeneration?: boolean;
    }[];

    @Column({ type: 'simple-json' })
    templates!: {
        id: string;
        name: string;
        subject: string;
        body: string;
        isHtml?: boolean;
        dynamicPlaceholders?: string[];
    }[];

    @Column({ type: 'simple-json', nullable: true })
    metadata!: {
        icon?: string;
        version?: string;
        lastUsed?: Date;
        usageCount?: number;
        successRate?: number;
        tags?: string[];
        customFields?: Record<string, any>;
    };

    @Column({ type: 'simple-json', nullable: true })
    aiConfig!: {
        model: string;
        temperature: number;
        maxTokens: number;
        stopSequences?: string[];
        systemPrompt?: string;
        examples?: Array<{
            input: string;
            output: string;
        }>;
    };

    @ManyToOne(() => User, user => user.agents)
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    constructor() {
        this.specificFields = [];
        this.templates = [];
        this.metadata = {
            version: '1.0.0',
            usageCount: 0,
            successRate: 0,
            tags: [],
            customFields: {}
        };
        this.aiConfig = {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2000,
            stopSequences: [],
            examples: []
        };
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
} 