import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { AgentProfile } from './agent-profile.entity';

@Entity('users')
@Index(['tenant_id'])
@Index(['email'])
@Index(['tenant_id', 'role'])
@Unique(['tenant_id', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  role: 'owner' | 'manager' | 'agent';

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  account_status: 'invited' | 'active' | 'disabled';

  @Column({ type: 'boolean', default: false })
  must_change_password: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  invited_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  activated_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  disabled_at?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @OneToMany(() => AgentProfile, (profile) => profile.user)
  agent_profiles?: AgentProfile[];
}
