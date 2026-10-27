import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../vault/product.entity.js';
import type { PaymentMode } from './payment-config.entity.js';

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'refunded';

/** One checkout. The buyer has no account: the Stripe session id is what finds the order again. */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-friendly reference shown to the buyer and in the admin, e.g. NSX-4F7K2Q. */
  @Column({ unique: true })
  number: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: OrderStatus;

  /** Taken from Stripe once the buyer has entered it. */
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ default: 'usd' })
  currency: string;

  /** Null until the Stripe session exists; the unique index still allows many nulls. */
  @Index({ unique: true })
  @Column({ type: 'varchar', nullable: true })
  stripeSessionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripePaymentIntentId: string | null;

  /** Test or live Stripe account the order was made with. */
  @Column({ type: 'varchar', default: 'test' })
  mode: PaymentMode;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}

/** A purchased product, with name and price copied so later edits do not rewrite history. */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  /** Kept when the product is deleted later (the file is then gone too). */
  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @Column()
  name: string;

  @Column({ type: 'int' })
  unitPriceCents: number;
}
