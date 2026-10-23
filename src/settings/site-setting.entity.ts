import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** One row per setting that has a value; see SETTING_DEFINITIONS for the allowed keys. */
@Entity('site_settings')
export class SiteSetting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
