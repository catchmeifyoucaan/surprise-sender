import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Phishlet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column()
    targetUrl: string;

    @Column({ type: 'simple-json' })
    subdomains: string[];

    @Column({ type: 'simple-json', nullable: true })
    rewriteRules: { from: string; to: string }[];

    @Column({ type: 'simple-json', nullable: true })
    credSelectors: {
        username: string;
        password: string;
    };

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}
