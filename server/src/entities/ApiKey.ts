import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  service!: string;

  @Column()
  key!: string;

  @Column()
  label!: string;

  @Column()
  isActive!: boolean;

  @Column()
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor() {
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
} 