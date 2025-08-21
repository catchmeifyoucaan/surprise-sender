import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity('email_tracking')
export class EmailTracking {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    email!: string;

    @Column()
    subject!: string;

    @Column()
    status!: string;

    @Column()
    details!: string;

    @Column()
    smtpConfigId!: string;

    @CreateDateColumn()
    timestamp!: Date;

    constructor() {
        this.timestamp = new Date();
    }
} 