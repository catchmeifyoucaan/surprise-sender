import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity('email_templates')
export class EmailTemplate {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column()
    subject!: string;

    @Column("text")
    body!: string;

    @Column({ default: true })
    isHtml!: boolean;

    @Column('simple-array', { nullable: true })
    dynamicPlaceholders!: string[];

    @Column('simple-json', { nullable: true })
    metadata!: {
        category?: string;
        tags?: string[];
        lastUsed?: Date;
        usageCount?: number;
        variables?: string[];
        attachments?: string[];
    };

    @ManyToOne(() => User)
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    constructor() {
        this.isHtml = true;
        this.dynamicPlaceholders = [];
        this.metadata = {
            category: '',
            tags: [],
            lastUsed: new Date(),
            usageCount: 0,
            variables: [],
            attachments: []
        };
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
} 