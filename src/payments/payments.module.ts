import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { Product } from '../vault/product.entity.js';
import { Order, OrderItem } from './order.entity.js';
import { OrdersService } from './orders.service.js';
import { PaymentConfig } from './payment-config.entity.js';
import {
  AdminOrdersController,
  AdminPaymentsController,
  PublicCheckoutController,
} from './payments.controller.js';
import { PaymentsConfigService } from './payments-config.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentConfig, Order, OrderItem, Product]), StorageModule],
  controllers: [AdminPaymentsController, AdminOrdersController, PublicCheckoutController],
  providers: [PaymentsConfigService, OrdersService],
})
export class PaymentsModule {}
