import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { UserActivity } from "./UserActivity";
import { EmailTemplate } from "./EmailTemplate";
import { SmtpConfiguration } from "./SmtpConfiguration";
import { Campaign } from "./Campaign";
import { Agent } from "./Agent";
import { UserPreferencesEntity } from "./UserPreferences";

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({ default: 'user' })
    role!: string;

    @Column({ default: 'active' })
    status!: string;

    @Column({ nullable: true })
    company?: string;

    @Column({ type: 'datetime', nullable: true })
    lastLogin?: Date;

    @Column({ default: false })
    twoFactorEnabled!: boolean;

    @Column({ nullable: true })
    twoFactorSecret?: string;

    @Column('simple-array', { nullable: true })
    twoFactorRecoveryCodes!: string[];

    @Column('simple-json', { nullable: true })
    preferences!: any;

    @Column('simple-array', { default: [] })
    permissions!: string[];

    @Column('simple-json', { nullable: true })
    securitySettings!: any;

    @Column({ default: 30 })
    sessionTimeout!: number;

    @Column({ default: 90 })
    passwordExpiry!: number;

    @Column({ default: 0 })
    loginAttempts!: number;

    @Column('simple-json', { default: [] })
    loginHistory!: any[];

    @Column({ type: 'datetime', nullable: true })
    lastPasswordChange?: Date;

    @Column({ type: 'datetime', nullable: true })
    passwordResetExpiry?: Date;

    @Column({ nullable: true })
    resetToken?: string;

    @Column({ type: 'datetime', nullable: true })
    emailVerifiedAt?: Date;

    @Column({ nullable: true })
    verificationToken?: string;

    @OneToMany(() => UserActivity, activity => activity.user)
    activities!: UserActivity[];

    @OneToMany(() => UserPreferencesEntity, preferences => preferences.user)
    userPreferences!: UserPreferencesEntity[];

    @OneToMany(() => EmailTemplate, template => template.user)
    emailTemplates!: EmailTemplate[];

    @OneToMany(() => Campaign, campaign => campaign.user)
    campaigns!: Campaign[];

    @OneToMany(() => Agent, agent => agent.user)
    agents!: Agent[];

    @OneToMany(() => SmtpConfiguration, config => config.user)
    smtpConfigurations!: SmtpConfiguration[];

    @CreateDateColumn({ type: 'datetime' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt!: Date;

    constructor() {
        this.role = 'user';
        this.status = 'active';
        this.loginAttempts = 0;
        this.twoFactorEnabled = false;
        this.securitySettings = {
            sessionTimeout: 30,
            passwordExpiry: 90,
            maxLoginAttempts: 5,
            requireTwoFactor: false,
            passwordHistory: [],
            lastPasswordChange: new Date()
        };
        this.emailVerifiedAt = undefined;
        this.twoFactorRecoveryCodes = [];
        this.preferences = {
            theme: 'dark',
            notifications: {
                email: true,
                telegram: false,
                desktop: true
            },
            language: 'en',
            timezone: 'UTC'
        };
        this.permissions = ['canSendEmails', 'canManageTemplates'];
        this.loginHistory = [];
    }
} 