import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity('user_preferences')
export class UserPreferencesEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: string;

    @Column({ default: 'dark' })
    theme!: string;

    @Column('json')
    notifications!: {
        email: boolean;
        telegram: boolean;
        desktop: boolean;
    };

    @Column({ default: 'en' })
    language!: string;

    @Column({ default: 'UTC' })
    timezone!: string;

    @Column({ nullable: true })
    displayName?: string;

    @Column({ nullable: true })
    email?: string;

    @ManyToOne(() => User, user => user.preferences)
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    constructor() {
        this.theme = 'dark';
        this.notifications = {
            email: true,
            telegram: false,
            desktop: true
        };
        this.language = 'en';
        this.timezone = 'UTC';
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
} 