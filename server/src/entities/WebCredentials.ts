import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class WebmailCredential {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	userId: string;

	@Column()
	url: string;

	@Column()
	username: string;

	@Column()
	password: string;

	@Column({ type: 'boolean', default: false })
	isValid: boolean;

	@Column({ type: 'text', nullable: true })
	lastError?: string;

	@CreateDateColumn({ type: 'datetime' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'datetime' })
	updatedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'userId' })
	user: User;
}

@Entity()
export class CpanelCredential {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	userId: string;

	@Column()
	url: string;

	@Column()
	username: string;

	@Column()
	password: string;

	@Column({ type: 'boolean', default: false })
	isValid: boolean;

	@Column({ type: 'text', nullable: true })
	lastError?: string;

	@CreateDateColumn({ type: 'datetime' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'datetime' })
	updatedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'userId' })
	user: User;
}

@Entity()
export class PhpMyAdminCredential {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	userId: string;

	@Column()
	url: string;

	@Column()
	username: string;

	@Column()
	password: string;

	@Column({ type: 'boolean', default: false })
	isValid: boolean;

	@Column({ type: 'text', nullable: true })
	lastError?: string;

	@CreateDateColumn({ type: 'datetime' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'datetime' })
	updatedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'userId' })
	user: User;
}

@Entity()
export class EmailAccount {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	userId: string;

	@Column()
	email: string;

	@Column()
	password: string;

	@Column({ nullable: true })
	authHost?: string; // e.g., smtp.domain:port if verified

	@Column({ type: 'boolean', default: false })
	isValid: boolean;

	@Column({ type: 'text', nullable: true })
	lastError?: string;

	@CreateDateColumn({ type: 'datetime' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'datetime' })
	updatedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'userId' })
	user: User;
}

@Entity()
export class EmailAddress {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	userId: string;

	@Column()
	email: string;

	@CreateDateColumn({ type: 'datetime' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'datetime' })
	updatedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'userId' })
	user: User;
}