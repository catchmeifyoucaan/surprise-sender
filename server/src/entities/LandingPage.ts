import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('landing_pages')
export class LandingPage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ default: 'template' })
  sourceType!: 'clone' | 'template' | 'generated';

  @Column({ type: 'text' })
  html!: string;

  @Column({ type: 'text', nullable: true })
  css?: string;

  @Column({ type: 'text', nullable: true })
  url?: string; // original source if cloned

  @Column({ type: 'simple-json', nullable: true })
  assets?: Record<string, string>; // path -> content (inline or stored ref)

  @ManyToOne(() => User)
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

