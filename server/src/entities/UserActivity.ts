import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity('user_activities')
export class UserActivity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    description!: string;

    @Column('simple-json')
    metadata!: {
        action: string;
        details?: string;
        ipAddress?: string;
        userAgent?: string;
    };

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @CreateDateColumn()
    timestamp!: Date;

    constructor() {
        this.metadata = {
            action: '',
            details: '',
            ipAddress: '',
            userAgent: ''
        };
        this.timestamp = new Date();
    }
} 