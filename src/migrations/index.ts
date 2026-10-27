import { Baseline1761500000000 } from './1761500000000-Baseline.js';
import { OrderSessionNullable1761500100000 } from './1761500100000-OrderSessionNullable.js';
import { PublishableKeys1761500200000 } from './1761500200000-PublishableKeys.js';

/** Every migration, oldest first. Add new ones to the end. */
export const migrations = [Baseline1761500000000, OrderSessionNullable1761500100000, PublishableKeys1761500200000];
