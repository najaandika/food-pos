<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case Served = 'served';
    case WaitingPayment = 'waiting_payment';
    case Paid = 'paid';
    case Cancelled = 'cancelled';
}
